/**
 * Alias GPM Package
 * @author imcuttle
 */
const fs = require('fs')
const fsExtra = require('fs-extra')
const nps = require('path')
const { promisify } = require('util')
const { runCommand } = require('lerna-utils-git-command')

const { GlobsCommand } = require('lerna-utils-globs-command')
const { getFilteredPackages } = require('@lerna/filter-options')
const { ValidationError } = require('@lerna/validation-error')

module.exports = factory
module.exports.gpmAliasOptions = gpmAliasOptions

function gpmAliasOptions(yargs) {
  const opts = {
    // todo
  }
  return yargs.options(opts).group(Object.keys(opts), 'GpmAlias Options:')
}

function factory(argv) {
  return new GpmAliasCommand(argv)
}

class GpmAliasCommand extends GlobsCommand {
  get requiresGit() {
    return true
  }
  get checkBehindRemote() {
    return false
  }
  async initialize() {
    super.initialize()
    this.logger.verbose('options:', this.options)

    this.validPackages = await getFilteredPackages(this.packageGraph, this.execOpts, {
      ...this.options
    })
  }

  async executeEach(dir, { remote = 'origin', branch }) {
    const pkgName = this.findPackage(dir).name
    const newPath = nps.join(this.project.rootPath, 'node_modules', pkgName)
    await fsExtra.ensureSymlink(nps.join(this.project.rootPath, dir), newPath, 'dir')
    // await fsExtra.symlink()
  }

  async execute() {
    await super.execute()
  }

  static name = 'gpm-alias'
}
