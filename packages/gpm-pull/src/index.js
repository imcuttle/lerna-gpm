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
  get checkBehindRemote() {
    return false
  }
  async initialize() {
    super.initialize()
    this.validPackages = await getFilteredPackages(this.packageGraph, this.execOpts, {
      ...this.options
    })
  }

  async executeEach(dir, { remote = 'origin', branch }) {
    const { rootPath } = this.project
    const dirPath = nps.resolve(rootPath, dir)
    if (!fs.existsSync(dirPath)) {
      throw new ValidationError('ENOFILE', dirPath + ' file is not found')
    }
    if (!(await isGitRepo(dirPath))) {
      throw new ValidationError('ENOGIT', dirPath + ' is not a git repo')
    }
    if (await hasUncommitted(dirPath)) {
      if (this.options.force) {
        this.logger.warn('Using force pull!')
        await runGitCommand(`reset --hard`, dirPath)
        await runGitCommand(`clean -fd`, dirPath)
      } else {
        throw new ValidationError('ENOGIT', `${dirPath} has uncommitted changes，Please execute "git commit" firstly.`)
      }
    }
    branch = await getCurrentBranch(dirPath)

    const diffLog = await runGitCommand(`log --oneline HEAD..${remote}/${branch}`, dirPath)
    if (diffLog) {
      this.logger.info(`HEAD to ${remote}/${branch} log`)
      diffLog
        .split('\n')
        .reverse()
        .map((info) => this.logger.info(info))
    } else {
      this.logger.info(`already update to latest`)
    }

    if (
      !(await runCommand(
        template(`${this.options.gitPullCommand || 'git pull ${remote} ${branch}'}`)({
          remote,
          branch
        }),
        dirPath
      ))
    ) {
      throw new ValidationError('GIT', `pull failed`)
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

  static name = 'gpm-pull'
}
