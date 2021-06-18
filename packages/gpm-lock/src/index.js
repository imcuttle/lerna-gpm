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
  runCommand,
  stripGitRemote,
  hasUncommitted,
  fetch
} = require('lerna-utils-git-command')
const { getGitInfoWithValidate } = require('lerna-utils-gpm')
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
    'no-git-commit': {
      describe: 'lock without single commit',
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
    super.initialize()
    this.logger.verbose('options:', this.options)

    this.validPackages = await getFilteredPackages(this.packageGraph, this.execOpts, {
      ...this.options
    })
  }

  async updateLernaConfig(dir, { remote } = {}) {
    const { rootPath, rootConfigLocation, config } = this.project
    const dirPath = nps.resolve(rootPath, dir)
    this.logger.info('dirPath', dirPath)

    const { gitCheckout, gitBranch, gitUrl } = await getGitInfoWithValidate(dirPath, { remote })

    await writeJsonFile(
      rootConfigLocation,
      {
        ...config,
        gpm: {
          ...config.gpm,
          [nps.relative(rootPath, dirPath)]: {
            branch: gitBranch,
            url: stripGitRemote(gitUrl),
            remote,
            checkout: gitCheckout
          }
        }
      },
      {
        indent: 2,
        detectIndent: true
      }
    )
  }

  async getLockedMessageList() {
    const ret = {}
    for (const [dir, config] of this.executeGpmEntries) {
      const dirPath = nps.resolve(this.project.rootPath, dir)
      const { gitCheckout } = await getGitInfoWithValidate(dirPath, { remote: config.remote })
      ret[dir] = await runGitCommand(`log --pretty=format:"%s" ${gitCheckout} -1`, dirPath)
    }
    return Object.entries(ret).map(([key, value]) => `${key}: ${value}`)
  }

  async executeEach(dir, { remote = 'origin', branch }) {
    const { rootPath, rootConfigLocation, config } = this.project
    const dirPath = nps.resolve(rootPath, dir)
    if (!fs.existsSync(dirPath)) {
      throw new ValidationError('ENOFILE', dirPath + ' 文件不存在')
    }
    if (!(await isGitRepo(dirPath))) {
      throw new ValidationError('ENOGIT', dirPath + ' 非 Git 仓库')
    }
    if (await hasUncommitted(dirPath)) {
      throw new ValidationError('ENOGIT', `${dirPath} 中具有未提交的改动，请先 git commit`)
    }

    // 判断是否有未 push 的 commit，存在则抛错
    if (!(await fetch(remote, branch, dirPath))) {
      throw new ValidationError('GIT', `${dirPath} fetch 远端代码失败`)
    }
    if (await isAheadOfRemote(remote, branch, dirPath)) {
      throw new ValidationError('GIT', `${dirPath} 存在未推送至远端的 git commit`)
    }

    // 根据本地 git 更新 lerna.json gpm 配置
    await this.updateLernaConfig(dir, { remote })

    // git add lerna.json
    // git commit -am "chore: gpm-lock" （允许外部自定义 commitmsg，插件 API 设计）
  }

  async beforeExecute() {
    if (this.executeGpmEntries.length && this.options.push) {
      await new Promise((resolve, reject) => {
        // fake promise api
        gpmPush(this.argv).then(resolve, reject)
      })
    }
  }

  async execute() {
    const { rootPath, rootConfigLocation } = this.project
    const gitLint = this.options.noGitCommit ? false : this.options.gitLint
    if (gitLint !== false && (await hasUncommitted(rootPath))) {
      throw new ValidationError('ENOGIT', `${rootPath} 中具有未提交的改动，请先 git commit`)
    }

    await super.execute()
    if (this.executeGpmEntries.length && (await hasUncommitted(rootPath))) {
      await runGitCommand(`add ${JSON.stringify(rootConfigLocation)}`, rootPath)
      await runGitCommand(
        `commit -am ${JSON.stringify(
          format(
            this.options.gitCommitMessage || 'chore: gpm-lock\n\n %s',
            (await this.getLockedMessageList()).join('\n')
          )
        )} ${process.env.NODE_ENV === 'test' ? '--no-verify' : ''}`,
        rootPath
      )
    }
  }
  static name = 'gpm-lock'
}
