/**
 * gpm check command
 * @author 余聪
 */
const fs = require('fs')
const nps = require('path')
const { promisify } = require('util')

const { GlobsCommand } = require('lerna-utils-globs-command')
const { getFilteredPackages } = require('@lerna/filter-options')
const { isBehindRemote, isAheadOfRemote } = require('lerna-utils-git-command')
const { ValidationError } = require('@lerna/validation-error')

module.exports = factory
module.exports.gpmCheckOptions = gpmCheckOptions

function gpmCheckOptions(yargs) {
  const opts = {
    // json: {
    //   describe: 'output stats as json',
    //   type: 'boolean'
    // }
  }
  return yargs.options(opts).group(Object.keys(opts), 'GpmCheck Options:')
}

function factory(argv) {
  return new GpmCheckCommand(argv)
}

class GpmCheckCommand extends GlobsCommand {
  static name = 'gpm-check'

  get checkBehindRemote() {
    return false
  }

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

  async executeEach(dir, config) {
    const { rootPath } = this.project
    const pkgName = this.findPackage(dir).name
    if (await isBehindRemote(config.remote || 'origin', config.branch, nps.resolve(rootPath, dir))) {
      this.gpmCheckStats.set(pkgName, {
        compareRemote: -1
      })
    } else if (await isAheadOfRemote(config.remote || 'origin', config.branch, nps.resolve(rootPath, dir))) {
      this.gpmCheckStats.set(pkgName, {
        compareRemote: 1
      })
    } else {
      this.gpmCheckStats.set(pkgName, {
        compareRemote: 0
      })
    }
  }

  async execute() {
    this.gpmCheckStats = new Map()
    await super.execute()

    const stats = {}
    for (const [pkgName, result] of this.gpmCheckStats.entries()) {
      stats[pkgName] = result
    }

    console.log(JSON.stringify(stats, null, 2))
  }
}
