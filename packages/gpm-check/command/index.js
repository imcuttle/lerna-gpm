const { filterOptions } = require('@lerna/filter-options')
const { gpmCheckOptions } = require('..')
const { globsOptions } = require('lerna-utils-globs-command')

exports.command = 'gpm-check'

exports.describe = `gpm check command`

exports.builder = (yargs) => {
  yargs.example('$0 gpm-check')

  return filterOptions(globsOptions(gpmCheckOptions(yargs)))
}

exports.handler = function handler(argv) {
  return require('..')(argv)
}
