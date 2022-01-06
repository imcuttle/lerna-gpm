/**
 * import git repo like git submodule
 * @author imcuttle
 */

const nps = require('path')
const fs = require('fs')
const fsExtra = require('fs-extra')
const { promisify } = require('util')
const JSON5 = require('json5')
const execa = require('execa')
const template = require('lodash.template')
const { URL } = require('url')
const writeJsonFile = require('write-json-file')
const gpmAlias = require('lerna-command-gpm-alias')
const { Command } = require('@lerna/command')
const findUp = require('find-up')
const { isGitRepo } = require('lerna-utils-git-command')
const bootstrap = require('@lerna/bootstrap')
const { getGitInfoWithValidate, findNested } = require('lerna-utils-gpm')
const { gitRemote, stripGitRemote, getGitSha } = require('lerna-utils-git-command')
const { runCommand, runGitCommand } = require('lerna-utils-git-command')
const { ValidationError } = require('@lerna/validation-error')

module.exports = factory
module.exports.importOptions = importOptions

function factory(argv) {
  return new GpmImportCommand(argv)
}

function importOptions(yargs) {
  const opts = {
    // todo
    alias: {
      type: 'boolean',
      hidden: true
    },
    'git-clone-user': {
      describe: 'The user of git clone',
      type: 'string'
    },
    'git-clone-user-env-name': {
      describe: 'The user env name of git clone',
      type: 'string'
    },
    'git-clone-password': {
      describe: 'The password of git clone',
      type: 'string'
    },
    'git-clone-password-env-name': {
      describe: 'The password env name of git clone',
      type: 'string'
    },
    remote: {
      describe: 'Git remote name',
      type: 'string'
    },
    branch: {
      describe: 'Git branch name',
      type: 'string'
    },
    checkout: {
      describe: 'Git checkout keyword',
      type: 'string'
    },
    'no-alias': {
      describe: 'Do not run gpm-alias',
      type: 'boolean'
    },
    'no-bootstrap': {
      describe: 'Do not automatically chain `lerna bootstrap` after changes are made.',
      type: 'boolean'
    },
    'nested-hoist': {
      describe: 'Set symbolic link when hits nested gpm package',
      type: 'boolean'
    },
    bootstrap: {
      // proxy for --no-bootstrap
      hidden: true,
      type: 'boolean'
    },
    dest: {
      describe: 'Write to which directory',
      type: 'string'
    },
    name: {
      describe: 'package name',
      type: 'string'
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
  get requiresGit() {
    return false
  }

  getPackageDirectories() {
    return this.project.packageConfigs.filter((p) => p.endsWith('*')).map((p) => nps.dirname(p))
  }

  async getExternalRepoBasename() {
    const { url } = await this.getRepoOrGitDir()
    const { name } = this.options
    return name || nps.basename(url).replace(/\..+$/, '')
  }

  async getTargetDir() {
    const externalRepoBase = await this.getExternalRepoBasename()

    // Compute a target directory relative to the Lerna root
    const targetBase = this.getTargetBase()
    if (this.getPackageDirectories().indexOf(targetBase) === -1) {
      throw new ValidationError(
        'EDESTDIR',
        `--dest=${targetBase} does not match with the package directories: ${this.getPackageDirectories()}`
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

  async getRepoOrGitDir() {
    const { repoOrGitDir, remote } = this.options
    const repoOrGitDirPath = nps.resolve(this.execOpts.cwd, repoOrGitDir)
    if (fs.existsSync(repoOrGitDirPath) && fs.statSync(repoOrGitDirPath).isDirectory()) {
      const url = await gitRemote(this.execOpts.cwd, remote)
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
    const { plugins = [] } = this.options

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

    await this.registerPlugins()
  }

  getGitUrl(url) {
    let { gitCloneUser, gitCloneUserEnvName, gitClonePassword, gitClonePasswordEnvName } = this.options

    gitCloneUser = gitCloneUser || (gitCloneUserEnvName && process.env[gitCloneUserEnvName])
    gitClonePassword = gitClonePassword || (gitClonePasswordEnvName && process.env[gitClonePasswordEnvName])
    let urlObj = url
    try {
      urlObj = new URL(url)
      urlObj.username = gitCloneUser || ''
      urlObj.password = gitClonePassword || ''
    } catch (e) {}
    return String(urlObj)
  }

  async gitClone(url, destDir) {
    const { rootPath } = this.project
    const data = { url: this.getGitUrl(url), destDir, rootPath }
    this.logger.info(`Cloning ${data.url}`)
    await runCommand(
      template(this.options.gitCloneCommand || 'git clone ${url} ${destDir}')({
        url: JSON.stringify(data.url),
        destDir: data.destDir
      }),
      data.rootPath
    )
  }

  async writeConfigFile(url, branch, checkout, remote = 'origin') {
    const { rootPath, rootConfigLocation, config } = this.project

    const nextGpmConfig = {
      ...config.gpm,
      [nps.relative(rootPath, await this.getTargetDir())]: {
        branch,
        url,
        remote,
        checkout
      }
    }

    await writeJsonFile(
      rootConfigLocation,
      {
        ...config,
        gpm: nextGpmConfig
      },
      {
        indent: 2,
        detectIndent: true
      }
    )

    return nextGpmConfig
  }

  async execute() {
    const { rootPath } = this.project
    const getGitInfo = async (localDir) => getGitInfoWithValidate(localDir, { remote: this.options.remote })

    const { type, url } = await this.getRepoOrGitDir()
    let tmpInfo
    const packageDir = await this.getTargetDir()
    this.logger.verbose('this.repoOrGitDir: %o', { type, url })
    this.logger.verbose('packageDir: %o', packageDir)

    let remoteUrl = url
    if ('file' === type) {
      if (!(await isGitRepo(url))) {
        throw new ValidationError('ENOGIT', url + ' 非 Git 仓库')
      }
      await this.gitClone(url, packageDir)
      remoteUrl = await gitRemote(url, this.options.remote || 'origin')
    } else {
      await this.gitClone(url, packageDir)
    }
    await runGitCommand(
      `remote set-url ${JSON.stringify(this.options.remote || 'origin')} ${JSON.stringify(this.getGitUrl(remoteUrl))}`,
      packageDir
    )
    await runGitCommand(`checkout ${JSON.stringify(this.options.branch || 'master')}`, packageDir)

    if (this.options.checkout) {
      await runGitCommand(`reset --hard ${JSON.stringify(this.options.checkout)}`, packageDir)
      await runGitCommand(`clean -fd`, packageDir)
    }
    tmpInfo = await getGitInfo(packageDir)

    const writeConfig = {
      gitRemote: this.options.remote,
      ...tmpInfo,
      gitUrl: stripGitRemote(tmpInfo.gitUrl)
    }

    const nextGpmConfig = await this.writeConfigFile(
      writeConfig.gitUrl,
      writeConfig.gitBranch,
      writeConfig.gitCheckout,
      writeConfig.gitRemote
    )

    // 写 gitignore
    const gitIgnorePath = ensureGitIgnorePath(nps.dirname(packageDir), rootPath)
    this.logger.info('gitIgnore path: ' + gitIgnorePath)
    const gitIgnore = fs.readFileSync(gitIgnorePath, 'utf-8')
    const ignoreRule = `/${nps.relative(nps.dirname(gitIgnorePath), packageDir)}`
    const alreadyIgnore = gitIgnore.split('\n').some((line) => {
      return line.trim() === ignoreRule
    })
    if (!alreadyIgnore) {
      this.logger.info(`正在写 .gitignore`)
      fs.writeFileSync(gitIgnorePath, [gitIgnore.trim(), ignoreRule].filter(Boolean).join('\n'))
    }

    // nestedHoist start
    const { nestedHoist } = this.options
    if (nestedHoist) {
      const nestedList = await findNested(packageDir, nextGpmConfig, { symblicLink: false })
      await Promise.all(
        nestedList.map(async ({ keyName: nestedName, mainName }) => {
          const nestedGpmDir = nps.join(packageDir, nestedName)
          const mainGpmDir = nps.join(this.project.rootPath, mainName)
          await fsExtra.ensureDir(mainGpmDir)
          this.logger.info(
            `nestedHoist: ${nps.relative(this.project.rootPath, nestedGpmDir)} links to ${nps.relative(
              this.project.rootPath,
              mainGpmDir
            )}`
          )
          await fsExtra.ensureSymlink(mainGpmDir, nestedGpmDir, 'dir')
        })
      )
    }
    // nestedHoist end

    if (this.options.alias !== false) {
      await new Promise((resolve, reject) => {
        // fake promise api
        gpmAlias({
          ...this.argv,
          globs: [packageDir]
        }).then(resolve, reject)
      })
    }
    if (this.options.bootstrap !== false) {
      const argv = Object.assign({}, this.options, {
        args: [],
        cwd: this.project.rootPath,
        // silence initial cli version logging, etc
        composed: 'add',
        // NEVER pass filter-options, it is very bad
        scope: undefined,
        ignore: undefined,
        private: undefined,
        since: undefined,
        excludeDependents: undefined,
        includeDependents: undefined,
        includeDependencies: undefined
      })

      return new Promise((resolve, reject) => {
        bootstrap(argv).then(resolve, reject)
      })
    }

    this.logger.success(`导入 ${nps.relative(this.execOpts.cwd, packageDir)} 成功!`)
  }
  static name = 'gpm-import'
}
