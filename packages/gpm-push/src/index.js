/**
 * gpm push command
 * @author imcuttle
 */
const fs = require('fs')
const nps = require('path')
const template = require('lodash.template')

const { getFilteredPackages } = require('@lerna/filter-options')
const { ValidationError } = require('@lerna/validation-error')
const { GlobsCommand } = require('lerna-utils-globs-command')
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
      type: 'string'
    }
  }
  return yargs.options(opts).group(Object.keys(opts), 'Push Options:')
}

class GpmPushCommand extends GlobsCommand {
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
    const { rootPath, rootConfigLocation, config } = this.project
    const dirPath = nps.resolve(rootPath, dir)
    if (!fs.existsSync(dirPath)) {
      throw new ValidationError('ENOFILE', dirPath + ' file is not found')
    } else {
      if (!(await isGitRepo(dirPath))) {
        throw new ValidationError('ENOGIT', dirPath + ' is not a git repo')
      }
      if (await hasUncommitted(dirPath)) {
        throw new ValidationError('ENOGIT', `${dirPath} has uncommitted changes，Please execute "git commit" firstly.`)
      }

      await runCommand(
        template(this.options.gitPushCommand || 'git push ${remote} ${branch}')({
          branch,
          remote
        }),
        dirPath,
        { stdio: 'inherit' }
      )
    }
  }

  async execute() {
    return super.execute()
  }

  static name = 'gpm-push'
}
