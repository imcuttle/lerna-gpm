/**
 * globs command util
 * @author 余聪
 */
const { Command } = require('@lerna/command')
const nps = require('path')
const pLimit = require('p-limit')
const { isBehindRemote } = require('lerna-utils-git-command')

function globsOptions(yargs) {
  const opts = {
    parallel: {
      describe: 'Run script with unlimited concurrency',
      type: 'boolean'
    },
    concurrency: {
      describe: 'How many processes to use when lerna parallelizes tasks',
      type: 'number'
    }
  }

  return yargs
    .positional('globs', {
      describe: 'Optional package directory globs to match',
      type: 'array'
    })
    .options(opts)
    .group(Object.keys(opts), 'Run Options:')
}

class GlobsCommand extends Command {
  get checkBehindRemote() {
    return true
  }

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

    let limit
    if (this.options.parallel) {
      limit = pLimit(Infinity)
    } else if (this.options.concurrency) {
      limit = pLimit(this.options.concurrency)
    } else {
      limit = pLimit(1)
    }

    const tasks = []
    for (const [dir, config] of this.executeGpmEntries) {
      tasks.push(
        limit(async () => {
          const pkgName = this.findPackage(dir).name
          this.logger.info(`Run ${this.constructor.name} in ${pkgName}`)
          if (this.checkBehindRemote && await isBehindRemote(config.remote || 'origin', config.branch, nps.resolve(rootPath, dir))) {
            this.logger.warn(`${pkgName} 滞后于远端，请及时执行 lerna gpm-pull ${dir} 进行同步`)
          }
          await this.executeEach(dir, config || {}, this.executeGpmEntries)
        })
      )
    }

    await Promise.all(tasks)

    if (this.executeGpmEntries.length) {
      this.logger.success(`Run ${this.constructor.name} ${this.executeGpmEntries.length} packages`)
    }
  }
}

module.exports.GlobsCommand = GlobsCommand
module.exports.globsOptions = globsOptions
