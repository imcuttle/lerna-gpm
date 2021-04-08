/**
 * update git repo
 * @author 余聪
 */
const fs = require('fs')
const nps = require('path')
const { promisify } = require('util')
const gpmImport = require('lerna-command-gpm-import')
const { hasUncommitted } = require('lerna-utils-git-command')
const { isBehindRemote } = require('lerna-utils-git-command')
const { gitRemote, isGitRepo, getCurrentBranch, fetch, runGitCommand } = require('lerna-utils-git-command')

const { Command } = require('@lerna/command')
const { getFilteredPackages } = require('@lerna/filter-options')
const { ValidationError } = require('@lerna/validation-error')

module.exports = factory

function factory(argv) {
  return new GpmUpdateCommand(argv)
}

class GpmUpdateCommand extends Command {
  static name = 'gpm-update';

  get requiresGit() {
    return true
  }
  async initialize() {
    const { rootPath, rootConfigLocation, config } = this.project

    if (!config.gpm || !Object.keys(config.gpm).length) {
      throw new ValidationError('ENOGPM', rootConfigLocation + ' 不存在 gpm 配置')
    }

    this.validPackages = await getFilteredPackages(this.packageGraph, this.execOpts, {
      ...this.options
    })
  }

  async executeUpdateEach(dir, { remote = 'origin', branch = 'master', checkout, url }) {
    const { rootPath, rootConfigLocation, config } = this.project
    const dirPath = nps.resolve(rootPath, dir)
    if (!fs.existsSync(dirPath)) {
      return new Promise((resolve, reject) => {
        // fake promise api
        gpmImport(this.argv).then(resolve, reject)
      })
    } else {
      if (!(await isGitRepo(dirPath))) {
        throw new ValidationError('ENOGIT', dirPath + ' 非 Git 仓库')
      }
      const gitUrl = await gitRemote(dirPath, remote)
      if (gitUrl !== url) {
        throw new ValidationError('ENOGIT', 'git remote url 不匹配')
      }

      if (await hasUncommitted(dirPath)) {
        throw new ValidationError('ENOGIT', `${dirPath} 中具有未提交的改动，请先 git commit`)
      }

      // 按照配置的 remote / url / branch / checkout 进行更新
      if (!(await fetch(remote, branch, dirPath))) {
        throw new ValidationError('ENOGIT', `fetch 远端代码失败`)
      }

      if (!(await isBehindRemote(remote, branch, dirPath))) {
        throw new ValidationError('ENOGIT', `存在未推送至远端的 git commit`)
      }

      const gitBranch = await getCurrentBranch(dirPath)
      if (gitBranch !== branch) {
        await runGitCommand(`checkout ${JSON.stringify(branch)}`, dirPath)
      }

      if (checkout) {
        await runGitCommand(`reset --hard ${JSON.stringify(checkout)}`, dirPath)
        await runGitCommand(`clean -fd`, dirPath)
      }
    }
  }

  async execute() {
    const { rootPath, rootConfigLocation, config } = this.project

    this.logger.info('valid packages:', this.validPackages.map((pkg) => pkg.name).join(', '))

    for (const [dir, config] of Object.entries(config.gpm)) {
      this.logger.info('update:', dir)
      await this.executeUpdateEach(dir, config || {})
      this.logger.verbose('更新完成:', dir)
    }
  }
}
