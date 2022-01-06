/**
 * gpm lock version command
 * @author imcuttle
 */
const fs = require('fs')
const nps = require('path')
const { format } = require('util')
const {
  runGitCommand,
  isBehindRemote,
  isAheadOfRemote,
  isGitRepo,
  getGitSha,
  compare,
  stripGitRemote,
  hasUncommitted,
  fetch
} = require('lerna-utils-git-command')
const { getGitInfoWithValidate, findNested } = require('lerna-utils-gpm')
const gpmPush = require('lerna-command-gpm-push')
const { GlobsCommand } = require('lerna-utils-globs-command')

const writeJsonFile = require('write-json-file')
const { pushOptions } = require('lerna-command-gpm-push')
const { getFilteredPackages } = require('@lerna/filter-options')
const { ValidationError } = require('@lerna/validation-error')

module.exports = factory
module.exports.lockOptions = lockOptions

function factory(argv) {
  return new GpmLockCommand(argv)
}

function lockOptions(yargs) {
  const opts = {
    push: {
      group: 'Command Options:',
      describe: '是否执行 gpm-push',
      type: 'boolean'
    },
    'no-git-lint': {
      describe: 'Do not check root git has uncommitted before execute lock',
      type: 'boolean'
    },
    'git-lint': {
      // proxy for --no-bootstrap
      hidden: true,
      type: 'boolean'
    },
    'no-nested-lock': {
      hidden: true,
      type: 'boolean'
    },
    'nested-lock': {
      describe: 'Lock the version of nested gpm package',
      type: 'boolean'
    },
    'no-git-commit': {
      describe: 'lock without single commit',
      type: 'boolean'
    },
    'git-commit': {
      describe: 'lock with single commit',
      type: 'boolean'
    }
  }
  return pushOptions(yargs.options(opts).group(Object.keys(opts), 'Lock Options:'))
}

class GpmLockCommand extends GlobsCommand {
  get requiresGit() {
    return true
  }
  async initialize() {
    if (!!(await findNested(this.project.rootPath)).length) {
      throw new ValidationError(
        'EGPM_NESTED',
        'GPM package contains symbolic link, please do not execute gpm-lock in sub-directory.'
      )
    }

    super.initialize()
    this.logger.verbose('options:', this.options)

    this.validPackages = await getFilteredPackages(this.packageGraph, this.execOpts, {
      ...this.options
    })
  }

  async addGpmConfig(filename, name, config) {
    const prevConfig = JSON.parse(fs.readFileSync(filename).toString())
    const nextGpm = {
      ...prevConfig.gpm,
      [name]: config
    }
    await writeJsonFile(
      filename,
      {
        ...prevConfig,
        gpm: nextGpm
      },
      {
        indent: 2,
        detectIndent: true
      }
    )
    return nextGpm
  }

  async updateLernaConfig(dir, { remote } = {}) {
    const { rootPath, rootConfigLocation } = this.project
    const dirPath = nps.resolve(rootPath, dir)

    const { gitCheckout, gitBranch, gitUrl } = await getGitInfoWithValidate(dirPath, {
      remote,
      gitLint: this.options.gitLint
    })
    const writeGpmConfig = {
      branch: gitBranch,
      url: stripGitRemote(gitUrl),
      remote,
      checkout: gitCheckout
    }
    const nextGpm = await this.addGpmConfig(rootConfigLocation, nps.relative(rootPath, dirPath), writeGpmConfig)

    // 子 GPM 嵌套写入
    if (this.options.nestedLock) {
      for (const dirPath of Object.keys(this.project.config.gpm || {}).map((name) =>
        nps.join(this.project.rootPath, name)
      )) {
        const nestedList = await findNested(dirPath, nextGpm, { filterGpmConfig: writeGpmConfig })
        for (const { mainName, mainConfig, dirName: subDirname, keyName, config } of nestedList) {
          const mainDirname = nps.join(this.project.rootPath, mainName)
          const mainSha = mainConfig.checkout
          const subSha = config.checkout
          await fetch(mainConfig.remote || 'origin', mainConfig.branch || 'master', mainDirname)
          const flag = await compare(mainSha, subSha, mainDirname)
          if (flag === 0) {
            continue
          }

          if (flag > 0) {
            await this.addGpmConfig(nps.join(dirPath, 'lerna.json'), keyName, mainConfig)
            this.logger.info(`Locked nested package ${JSON.stringify(keyName)} in`, dirPath)
          } else {
            this.logger.warn(
              `Main project ${mainName} is behinds of sub-project ${keyName}, Please execute \`lerna gpm-pull ${mainName}\` for updating`
            )
          }
        }
      }
    }
  }

  async executeEach(dir, { remote = 'origin', branch }) {
    const { rootPath, rootConfigLocation, config } = this.project
    const { gitLint } = this.options
    const dirPath = nps.resolve(rootPath, dir)
    if (!fs.existsSync(dirPath)) {
      throw new ValidationError('ENOFILE', dirPath + ' file not found')
    }
    if (!(await isGitRepo(dirPath))) {
      throw new ValidationError('ENOGIT', dirPath + ' is not git repo.')
    }

    // 根据本地 git 更新 lerna.json gpm 配置
    await this.updateLernaConfig(dir, { remote })
  }

  async beforeExecute() {
    if (this.executeGpmEntries.length && this.options.push) {
      await new Promise((resolve, reject) => {
        // fake promise api
        gpmPush(this.argv).then(resolve, reject)
      })
    }
  }

  async getLockedMessageList() {
    const ret = {}
    for (const [dir, config] of this.executeGpmEntries) {
      const dirPath = nps.resolve(this.project.rootPath, dir)
      const { gitCheckout } = await getGitInfoWithValidate(dirPath, {
        remote: config.remote,
        gitLint: this.options.gitLint
      })
      ret[dir] = await runGitCommand(`log --pretty=format:"%s" ${gitCheckout} -1`, dirPath)
    }
    return Object.entries(ret).map(([key, value]) => `${key}: ${value}`)
  }

  async execute() {
    const { rootPath, rootConfigLocation } = this.project
    const gitLint = this.options.noGitCommit ? false : this.options.gitLint
    if (gitLint !== false && (await hasUncommitted(rootPath))) {
      throw new ValidationError('ENOGIT', `${rootPath} has uncommitted changes，Please execute "git commit" firstly.`)
    }

    await super.execute()
    if (!this.options.noGitCommit && this.executeGpmEntries.length && (await hasUncommitted(rootPath))) {
      await runGitCommand(`add ${JSON.stringify(rootConfigLocation)}`, rootPath)
      const appendLockedMsg = await this.getLockedMessageList()

      process.env.NODE_ENV !== 'test' &&
        (await runGitCommand(
          `commit -am ${JSON.stringify(this.options.gitCommitMessage || 'chore: gpm-lock')} ${appendLockedMsg
            .map((dirMsg) => `-am "${dirMsg}"`)
            .join(' ')} ${process.env.NODE_ENV === 'test' ? '--no-verify' : ''}`,
          rootPath
        ))
    }
  }
  static name = 'gpm-lock'
}
