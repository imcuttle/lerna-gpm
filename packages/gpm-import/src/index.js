/**
 * import git repo like git submodule
 * @author 余聪
 */

const nps = require('path')
const fs = require('fs')
const execa = require('execa')
const writeJsonFile = require('write-json-file')
const {
  SyncHook,
  SyncBailHook,
  SyncWaterfallHook,
  SyncLoopHook,
  AsyncParallelHook,
  AsyncParallelBailHook,
  AsyncSeriesHook,
  AsyncSeriesBailHook,
  AsyncSeriesWaterfallHook
} = require('tapable')
const { getCurrentBranch, fetch, isBehindRemote } = require('./git-command')
const { Command } = require('@lerna/command')
const { ValidationError } = require('@lerna/validation-error')

module.exports = factory

function factory(argv) {
  return new GpmImportCommand(argv)
}

const getGitRemote = (cwd, remote = 'origin') => {
  const opts = {
    cwd,
    // don't throw, just want boolean
    reject: false,
    // only return code, no stdio needed
    stdio: 'ignore'
  }

  return execa.sync(`git config --get remote.${remote}.url`, opts).stdout.trim()
}

const requireDefault = (mod) => {
  return require(mod).default || require(mod)
}

const hasUncommitted = (cwd) => {
  const opts = {
    cwd,
    reject: false,
    stdio: 'ignore'
  }

  return execa(`git status -s`, opts).then((changes) => !!changes.stdout.trim())
}

class GpmImportCommand extends Command {
  static name = 'gpm-import'

  get requiresGit() {
    return false
  }

  getPackageDirectories() {
    return this.project.packageConfigs.filter((p) => p.endsWith('*')).map((p) => nps.dirname(p))
  }

  get externalRepoBasename() {
    const { url } = this.repoOrGitDir
    const { name } = this.options
    return name || nps.basename(url).replace(/\..+$/, '')
  }

  get targetDir() {
    const externalRepoBase = this.externalRepoBasename

    // Compute a target directory relative to the Lerna root
    const targetBase = this.getTargetBase()
    if (this.getPackageDirectories().indexOf(targetBase) === -1) {
      throw new ValidationError(
        'EDESTDIR',
        `--dest does not match with the package directories: ${this.getPackageDirectories()}`
      )
    }
    return nps.resolve(this.execOpts.cwd, targetBase, externalRepoBase)
  }

  getTargetBase() {
    if (this.options.dest) {
      return this.options.dest
    }

    return this.getPackageDirectories().shift() || 'packages'
  }

  get repoOrGitDir() {
    const { repoOrGitDir, remote } = this.options
    const repoOrGitDirPath = nps.resolve(this.execOpts.cwd, repoOrGitDir)
    if (fs.existsSync(repoOrGitDirPath) && fs.statSync(repoOrGitDirPath).isDirectory()) {
      const url = getGitRemote(this.execOpts.cwd, remote)
      if (!url) {
        throw new ValidationError('', `未找到 ${repoOrGitDirPath} 中 remote.${remote} 地址`)
      }
      return {
        type: 'file',
        url: repoOrGitDirPath
      }
    }

    return {
      type: 'git',
      url: repoOrGitDir
    }
  }

  async registerPlugins() {
    const { plugins } = this.options

    for (const pluginNameOrWithOptions of plugins) {
      let pluginName = pluginNameOrWithOptions
      let pluginOptions = {}
      if (Array.isArray(pluginNameOrWithOptions)) {
        ;[pluginName, pluginOptions = {}] = pluginNameOrWithOptions
      }

      await this.applyPlugin(pluginName, pluginOptions)
    }
  }

  async applyPlugin(pluginName, options) {
    const { rootConfigLocation } = this.project
    const pluginApply = pluginName.startsWith('.')
      ? requireDefault(nps.resolve(nps.dirname(rootConfigLocation), pluginName))
      : requireDefault(pluginName)
    const fn = pluginApply(options)
    await fn(this)
  }

  async initialize() {
    this.options = {
      remote: 'origin',
      ...this.options
    }
    this.hooks = {
      initialize: new AsyncSeriesBailHook(['this']),
      writeConfig: new AsyncSeriesBailHook(['writeConfig']),
      git: {
        preClone: new AsyncSeriesBailHook(['params']),
        postClone: new AsyncSeriesBailHook(['params'])
      }
    }

    await this.registerPlugins()

    await this.hooks.initialize.promise(this)

    const getGitInfo = async (localDir) => {
      if (await hasUncommitted(localDir)) {
        throw new ValidationError('GIT', `${localDir} 中具有未提交的改动，请先 git commit`)
      }

      const branch = await getCurrentBranch()
      if (!(await fetch(this.options.remote, branch, localDir))) {
        throw new ValidationError('GIT', `fetch 远端代码失败`)
      }

      if (!(await isBehindRemote(this.options.remote, branch, localDir))) {
        throw new ValidationError('GIT', `存在未推送至远端的 git commit`)
      }
      const gitUrl = await getGitRemote(localDir, this.options.remote)
      const gitBranch = branch
      const gitCheckout = await getGitSha(localDir)
      return {
        gitCheckout,
        gitBranch,
        gitUrl
      }
    }

    const { type, url } = this.repoOrGitDir
    let tmpInfo
    if ('file' === type) {
      await this.gitClone(url, this.targetDir)
      tmpInfo = await getGitInfo(url)
    } else {
      await this.gitClone(url, this.targetDir)
      tmpInfo = await getGitInfo(this.targetDir)
    }

    this.writeConfig = {
      gitRemote: this.options.remote,
      ...tmpInfo
    }
    await this.hooks.writeConfig.promise(this.writeConfig)
  }

  async gitClone(url, destDir) {
    const { rootPath } = this.project
    const data = { url, destDir, rootPath }
    await this.hooks.git.preClone.promise(data)
    await runGitCommand(`clone ${JSON.stringify(data.url)} ${data.destDir}`, data.rootPath)
    await this.hooks.git.postClone.promise(data)
  }

  async writeConfigFile(url, branch, checkout, remote = 'origin') {
    const { rootPath, rootConfigLocation, config } = this.project
    await writeJsonFile(
      rootConfigLocation,
      {
        ...config,
        gpm: {
          ...config.gpm,
          [nps.relative(rootPath, this.targetDir)]: {
            branch,
            url,
            remote,
            checkout
          }
        }
      },
      {
        indent: 2,
        detectIndent: true
      }
    )
  }

  async execute() {
    await this.writeConfigFile(
      this.writeConfig.gitUrl,
      this.writeConfig.gitBranch,
      this.writeConfig.gitCheckout,
      this.writeConfig.gitRemote
    )
  }
}
