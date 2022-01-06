const { filterOptions } = require('@lerna/filter-options')
const { globsOptions } = require('lerna-utils-globs-command')
const { gpmUpdateOptions } = require('..')

exports.command = 'gpm-update [globs...]'

exports.describe = `Update git repo`

exports.builder = (yargs) => {
  yargs.example('$0 gpm-update').options({})

  return filterOptions(globsOptions(gpmUpdateOptions(yargs)))
}

exports.handler = function handler(argv) {
  return require('..')(argv)
}
