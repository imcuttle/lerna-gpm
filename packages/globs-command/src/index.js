/**
 * globs command util
 * @author 余聪
 */
const { Command } = require('@lerna/command')
const nps = require('path')
const { isBehindRemote } = require('lerna-utils-git-command')

function globsOptions(yargs) {
  return yargs.positional('globs', {
    describe: 'Optional package directory globs to match',
    type: 'array'
  })
}

class GlobsCommand extends Command {
  initialize() {
    const { globs = [] } = this.options
    this.dirs = new Set(globs.map((fp) => nps.resolve(this.project.rootPath, fp)))

    // include
    if (this.dirs.size) {
      for (const [name, node] of this.packageGraph.entries()) {
        if (!this.dirs.has(node.location)) {
          this.packageGraph.delete(name)
        }
      }
    }

    this.logger.verbose('glob dirs', this.dirs)
    this.validPackages = this.packageGraph.values()
  }

  executeEach() {
    throw new Error('executeEach need implement')
  }

  findPackage(dir) {
    const { config, rootPath } = this.project
    return this.validPackages.find((pkg) => pkg.location === nps.resolve(rootPath, dir))
  }

  async execute() {
    const { config, rootPath } = this.project

    this.executeGpmEntries = Object.entries(config.gpm).filter(([dir, config]) => {
      return this.findPackage(dir)
    })
    for (const [dir, config] of this.executeGpmEntries) {
      this.logger.info(`Run ${this.constructor.name} in ${this.findPackage(dir).name}`)
      if (await isBehindRemote(config.remote || 'origin', config.branch, nps.resolve(rootPath, dir))) {
        this.logger.warn(`${dir} 滞后于远端，请及时执行 lerna gpm-pull ${dir} 进行同步`)
      }
      await this.executeEach(dir, config || {}, this.executeGpmEntries)
    }
  }
}

module.exports.GlobsCommand = GlobsCommand
module.exports.globsOptions = globsOptions
