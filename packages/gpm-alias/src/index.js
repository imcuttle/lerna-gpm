/**
 * Alias GPM Package
 * @author imcuttle
 */
const fsExtra = require('fs-extra')
const JSON5 = require('json5')
const writeJsonFile = require('write-json-file')
const nps = require('path')

const { GlobsCommand } = require('lerna-utils-globs-command')
const { getFilteredPackages } = require('@lerna/filter-options')
const { ValidationError } = require('@lerna/validation-error')

module.exports = factory
module.exports.gpmAliasOptions = gpmAliasOptions

function gpmAliasOptions(yargs) {
  const opts = {
    'alias-types': {
      default: ['link', 'ts-js-config'],
      describe: "alias types list ('link', 'ts-js-config')",
      type: 'array'
    }
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
    const { aliasTypes = ['link', 'ts-js-config'] } = this.options
    const { rootPath } = this.project
    const pkgName = this.findPackage(dir).name

    for (const type of aliasTypes) {
      switch (type) {
        case 'link': {
          const newPath = nps.join(rootPath, 'node_modules', pkgName)
          await fsExtra.ensureSymlink(nps.join(rootPath, dir), newPath, 'dir')
          break
        }
        case 'ts-js-config': {
          const files = ['jsconfig.json', 'tsconfig.base.json', 'tsconfig.json']
          const matchedName = files.find((name) => fsExtra.existsSync(nps.join(rootPath, name)))
          if (!matchedName) {
            return
          }
          let updated = false
          const configFilename = nps.join(rootPath, matchedName)
          const config = JSON5.parse(await fsExtra.readFile(configFilename, 'utf8'))
          if (!config.compilerOptions) {
            config.compilerOptions = {}
          }
          if (!config.compilerOptions.paths) {
            config.compilerOptions.paths = {}
          }

          if (!config.compilerOptions.baseUrl) {
            config.compilerOptions.baseUrl = '.'
          }

          const baseUrl = nps.resolve(rootPath, config.compilerOptions.baseUrl)
          const prefixUrl = './' + nps.relative(baseUrl, nps.resolve(rootPath, dir))

          if (!config.compilerOptions.paths[`${pkgName}`]) {
            config.compilerOptions.paths[`${pkgName}`] = [prefixUrl]
            updated = true
          }

          if (!config.compilerOptions.paths[`${pkgName}/*`]) {
            config.compilerOptions.paths[`${pkgName}/*`] = [prefixUrl + '/*']
            updated = true
          }

          if (updated) {
            await writeJsonFile(configFilename, config, {
              indent: 2,
              detectIndent: true
            })
          }

          break
        }
      }
    }

    // await fsExtra.symlink()
  }

  async execute() {
    await super.execute()
  }

  static name = 'gpm-alias'
}
