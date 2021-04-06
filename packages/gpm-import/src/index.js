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
const { Command } = require('@lerna/command')
const findUp = require('find-up')
const { gitRemote, getGitSha } = require('lerna-utils-git-command')
const { getCurrentBranch, fetch, isBehindRemote, runGitCommand } = require('lerna-utils-git-command')
const { ValidationError } = require('@lerna/validation-error')

module.exports = factory
module.exports.importOptions = importOptions

function factory(argv) {
  return new GpmImportCommand(argv)
}

function importOptions(yargs) {
  const opts = {
    alias: {
      group: 'Command Options:',
      describe: 'Alias to package.json',
      type: 'boolean'
    }
  }
  return yargs.options(opts).group(Object.keys(opts), 'Import Options:')
}


const ensureGitIgnorePath = (cwd, stopDirPath) => {
  const foundPath = findUp.sync(
    (directory) => {
      if (!directory.startsWith(stopDirPath)) {
        return findUp.stop
      }
      const hasGitIgnore = findUp.sync.exists(nps.join(directory, '.gitignore'))
      return hasGitIgnore && nps.join(directory, '.gitignore')
    },
    { cwd: cwd, type: 'file' }
  )
  if (foundPath) {
    return foundPath
  }

  fs.writeFileSync(nps.join(stopDirPath, '.gitignore'), '')
  return nps.join(stopDirPath, '.gitignore')
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
      const url = gitRemote(this.execOpts.cwd, remote)
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
    const { rootPath } = this.project
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
      const gitUrl = await gitRemote(localDir, this.options.remote)
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
    const packageDir = this.targetDir
    if ('file' === type) {
      await this.gitClone(url, packageDir)
      tmpInfo = await getGitInfo(url)
    } else {
      await this.gitClone(url, packageDir)
      tmpInfo = await getGitInfo(packageDir)
    }

    const writeConfig = {
      gitRemote: this.options.remote,
      ...tmpInfo
    }
    await this.hooks.writeConfig.promise(writeConfig)

    await this.writeConfigFile(
      writeConfig.gitUrl,
      writeConfig.gitBranch,
      writeConfig.gitCheckout,
      writeConfig.gitRemote
    )

    // 写 gitignore
    const gitIgnorePath = ensureGitIgnorePath(rootPath, nps.dirname(packageDir))
    const gitIgnore = fs.readFileSync(gitIgnorePath, 'utf-8')
    const ignoreRule = `/${nps.relative(rootPath, packageDir)}/`
    const alreadyIgnore = gitIgnore.split('\n').some((line) => {
      return line.trim() === ignoreRule
    })
    if (!alreadyIgnore) {
      fs.writeFileSync(gitIgnorePath, [gitIgnore.trim(), ignoreRule].filter(Boolean).join('\n'))
    }
  }
}
