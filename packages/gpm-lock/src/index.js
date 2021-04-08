/**
 * gpm lock version command
 * @author 余聪
 */
const fs = require('fs')
const nps = require('path')
const {
  runGitCommand,
  isBehindRemote,
  isGitRepo,
  runCommand,
  hasUncommitted,
  fetch
} = require('lerna-utils-git-command')
const { getGitInfoWithValidate } = require('lerna-utils-gpm')
const gpmPush = require('lerna-command-gpm-push')

const writeJsonFile = require('write-json-file')
const { pushOptions } = require('lerna-command-gpm-push')
const { Command } = require('@lerna/command')
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
      type: 'boolean',
    },
  }
  return pushOptions(yargs.options(opts).group(Object.keys(opts), 'Lock Options:'))
}


class GpmLockCommand extends Command {
  static name = 'gpm-lock'

  get requiresGit() {
    return true
  }
  async initialize() {
    this.logger.verbose('options:', this.options)

    this.validPackages = await getFilteredPackages(this.packageGraph, this.execOpts, {
      ...this.options
    })
  }

  async updateLernaConfig(dir, { remote } = {}) {
    const { rootPath, rootConfigLocation, config } = this.project
    const dirPath = nps.resolve(rootPath, dir)

    const { gitCheckout, gitBranch, gitUrl } = await getGitInfoWithValidate(dirPath, { remote })

    await writeJsonFile(
      rootConfigLocation,
      {
        ...config,
        gpm: {
          ...config.gpm,
          [nps.relative(rootPath, dirPath)]: {
            branch: gitBranch,
            url: gitUrl,
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
      throw new ValidationError('GIT', `fetch 远端代码失败`)
    }
    if (!(await isBehindRemote(remote, branch, dirPath))) {
      throw new ValidationError('GIT', `存在未推送至远端的 git commit`)
    }

    // 根据本地 git 更新 lerna.json gpm 配置
    await this.updateLernaConfig(dir, { remote })

    // git add lerna.json
    // git commit -am "chore: gpm-lock" （允许外部自定义 commitmsg，插件 API 设计）
    await runGitCommand(`add ${JSON.stringify(rootConfigLocation)}`, rootPath)
    await runGitCommand(`commit -am ${JSON.stringify(this.options.gitCommitMessage || 'chore: gpm-lock')}`, rootPath)
  }

  async execute() {
    const { rootPath, rootConfigLocation, config } = this.project
    this.logger.info('valid packages:', this.validPackages.map((pkg) => pkg.name).join(', '))

    const entries = Object.entries(config.gpm)
    for (const [dir, config] of entries) {
      this.logger.info('push:', dir)
      await this.executeEach(dir, config || {})
      this.logger.verbose('push done:', dir)
    }

    if (entries.length && this.options.push) {
      return new Promise((resolve, reject) => {
        // fake promise api
        gpmPush(this.argv).then(resolve, reject)
      })
    }
  }
}
