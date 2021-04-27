/**
 * import git repo like git submodule
 * @author 余聪
 */

const nps = require('path')
const fs = require('fs')
const { promisify } = require('util')
const JSON5 = require('json5')
const execa = require('execa')
const template = require('lodash.template')
const { URL } = require('url')
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
const { isGitRepo } = require('lerna-utils-git-command')
const bootstrap = require('@lerna/bootstrap')
const { getGitInfoWithValidate } = require('lerna-utils-gpm')
const { gitRemote, getGitSha } = require('lerna-utils-git-command')
const { getCurrentBranch, fetch, isBehindRemote, runCommand, runGitCommand } = require('lerna-utils-git-command')
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
    'no-alias': {
      describe: 'Do not alias to package.json in tsconfig.json',
      type: 'boolean'
    },
    'no-bootstrap': {
      describe: 'Do not automatically chain `lerna bootstrap` after changes are made.',
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
    this.hooks = {
      initialize: new AsyncSeriesBailHook(['gpmImport']),
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
    let { gitCloneUser, gitCloneUserEnvName, gitClonePassword, gitClonePasswordEnvName } = this.options

    gitCloneUser = gitCloneUser || (gitCloneUserEnvName && process.env[gitCloneUserEnvName])
    gitClonePassword = gitClonePassword || (gitCloneUserEnvName && process.env[gitClonePassword])
    const urlObj = new URL(url)
    urlObj.username = gitCloneUser || ''
    urlObj.password = gitClonePassword || ''

    const { rootPath } = this.project
    const data = { url: urlObj.toString(), destDir, rootPath }
    await this.hooks.git.preClone.promise(data)
    await runCommand(
      template(this.options.gitCloneCommand || 'git clone ${url} ${destDir}')({
        url: JSON.stringify(urlObj.toString()),
        destDir: data.destDir
      }),
      data.rootPath
    )
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
    const getGitInfo = async (localDir) => getGitInfoWithValidate(localDir, { remote: this.options.remote })

    const { type, url } = this.repoOrGitDir
    let tmpInfo
    const packageDir = this.targetDir
    this.logger.verbose('this.repoOrGitDir: %o', this.repoOrGitDir)
    this.logger.verbose('packageDir: %o', packageDir)

    if ('file' === type) {
      if (!(await isGitRepo(url))) {
        throw new ValidationError('ENOGIT', url + ' 非 Git 仓库')
      }
      await this.gitClone(url, packageDir)
      const remoteUrl = await gitRemote(url, this.options.remote || 'origin')
      await runGitCommand(
        `remote set-url ${JSON.stringify(this.options.remote || 'origin')} ${JSON.stringify(remoteUrl)}`,
        packageDir
      )
      tmpInfo = await getGitInfo(packageDir)
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
    const gitIgnorePath = ensureGitIgnorePath(nps.dirname(packageDir), rootPath)
    this.logger.info('gitIgnore path: ' + gitIgnorePath)
    const gitIgnore = fs.readFileSync(gitIgnorePath, 'utf-8')
    const ignoreRule = `/${nps.relative(nps.dirname(gitIgnorePath), packageDir)}/`
    const alreadyIgnore = gitIgnore.split('\n').some((line) => {
      return line.trim() === ignoreRule
    })
    if (!alreadyIgnore) {
      this.logger.info(`正在写 .gitignore`)
      fs.writeFileSync(gitIgnorePath, [gitIgnore.trim(), ignoreRule].filter(Boolean).join('\n'))
    }

    if (this.options.alias !== false) {
      this.logger.info('Aliasing')
      const result = execa.commandSync(`npm install ${packageDir}`, { stdin: 'ignore', stdout: 'ignore', stderr: 'ignore', cwd: rootPath, reject: false })
      if (result.stderr) {
        this.logger.error(result.stderr)
      }

      // const files = ['jsconfig.json', 'tsconfig.base.json', 'tsconfig.json']
      // const tsName = files.find(
      //   (name) => fs.existsSync(nps.join(rootPath, name)) && fs.statSync(nps.join(rootPath, name)).isFile()
      // )
      //
      // // find tsconfig.json / tsconfig.base.json (like alias-hq)
      // if (tsName) {
      //   const tsconfigFile = nps.join(rootPath, tsName)
      //   const tsConfig = JSON5.parse(await promisify(fs.readFile)(tsconfigFile, 'utf8'))
      //
      //   if (tsConfig) {
      //     tsConfig.compilerOptions = tsConfig.compilerOptions || {}
      //
      //     let name = this.externalRepoBasename
      //     if (fs.existsSync(nps.join(packageDir, 'package.json'))) {
      //       name = require(nps.join(packageDir, 'package.json')).name || name
      //     }
      //
      //     this.logger.info(`Alias in ${name} in ${tsName}`)
      //
      //     tsConfig.compilerOptions = {
      //       baseUrl: '.',
      //       ...tsConfig.compilerOptions
      //     }
      //
      //     const { baseUrl, paths } = tsConfig.compilerOptions
      //     const basePath = nps.resolve(nps.dirname(tsconfigFile), baseUrl)
      //
      //     tsConfig.compilerOptions.paths = {
      //       [`${name}`]: ['./' + nps.join(nps.relative(basePath, packageDir))],
      //       [`${name}/*`]: ['./' + nps.join(nps.relative(basePath, packageDir), '*')],
      //       ...paths
      //     }
      //
      //     await writeJsonFile(tsconfigFile, tsConfig, {
      //       indent: 2,
      //       detectIndent: true
      //     })
      //   }
      // }
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
}
