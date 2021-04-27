/**
 * gpm pull command
 * @author imcuttle
 */
const fs = require('fs')
const nps = require('path')
const { promisify } = require('util')
const template = require('lodash.template')

const { GlobsCommand } = require('lerna-utils-globs-command')
const { getFilteredPackages } = require('@lerna/filter-options')
const { ValidationError } = require('@lerna/validation-error')
const gpmLock = require('lerna-command-gpm-lock')
const { getCurrentBranch } = require('lerna-utils-git-command')
const { runGitCommand } = require('lerna-utils-git-command')
const { isBehindRemote, runCommand } = require('lerna-utils-git-command')
const { hasUncommitted, fetch } = require('lerna-utils-git-command')
const { isGitRepo } = require('lerna-utils-git-command')

module.exports = factory

function factory(argv) {
  return new GpmPullCommand(argv)
}

class GpmPullCommand extends GlobsCommand {
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

  async executeEach(dir, { remote = 'origin', branch }) {
    const { rootPath } = this.project
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
    branch = await getCurrentBranch(dirPath)

    if (
      !(await runCommand(
        template(`${this.options.gitPullCommand || 'git pull ${remote} ${branch}'}`)({
          remote,
          branch
        }),
        dirPath
      ))
    ) {
      throw new ValidationError('GIT', `pull 远端代码失败`)
    }
  }

  async execute() {
    await super.execute()

    if (this.executeGpmEntries.length && this.options.lock) {
      return new Promise((resolve, reject) => {
        // fake promise api
        gpmLock(this.argv).then(resolve, reject)
      })
    }
  }
}
GpmPullCommand.name = 'gpm-pull'
