/**
 * gpm push command
 * @author 余聪
 */
const fs = require('fs')
const nps = require('path')
const { promisify } = require('util')
const template = require('lodash.template')

const { Command } = require('@lerna/command')
const { getFilteredPackages } = require('@lerna/filter-options')
const { ValidationError } = require('@lerna/validation-error')
const { runCommand, isGitRepo, hasUncommitted } = require('lerna-utils-git-command')

module.exports = factory
module.exports.pushOptions = pushOptions

function factory(argv) {
  return new GpmPushCommand(argv)
}

function pushOptions(yargs) {
  const opts = {
    'git-push-command': {
      group: 'Command Options:',
      describe: 'Git Push Command Template',
      type: 'string',
      default: 'git push ${remote} HEAD:refs/for/${branch}'
    }
  }
  return yargs.options(opts).group(Object.keys(opts), 'Push Options:')
}

class GpmPushCommand extends Command {
  static name = 'gpm-push';

  get requiresGit() {
    return true
  }
  async initialize() {
    this.logger.verbose('options:', this.options)

    this.validPackages = await getFilteredPackages(this.packageGraph, this.execOpts, {
      ...this.options
    })
  }

  async executeEach(dir, { remote = 'origin', branch }) {
    const { rootPath, rootConfigLocation, config } = this.project
    const dirPath = nps.resolve(rootPath, dir)
    if (!fs.existsSync(dirPath)) {
      throw new ValidationError('ENOFILE', dirPath + ' 文件不存在')
    } else {
      if (!(await isGitRepo(dirPath))) {
        throw new ValidationError('ENOGIT', dirPath + ' 非 Git 仓库')
      }
      if (await hasUncommitted(dirPath)) {
        throw new ValidationError('ENOGIT', `${dirPath} 中具有未提交的改动，请先 git commit`)
      }

      await runCommand(
        template(this.options.gitPushCommand || 'git push ${remote} HEAD:refs/for/${branch}')({
          branch,
          remote
        })
      )
    }
  }

  async execute() {
    this.logger.info('valid packages:', this.validPackages.map((pkg) => pkg.name).join(', '))

    for (const [dir, config] of Object.entries(config.gpm)) {
      this.logger.info('push:', dir)
      await this.executeEach(dir, config || {})
      this.logger.verbose('push done:', dir)
    }
  }
}
