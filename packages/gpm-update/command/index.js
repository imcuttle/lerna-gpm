const { filterOptions } = require('@lerna/filter-options')
const { importOptions } = require('lerna-command-gpm-import')
const { globsOptions } = require('lerna-utils-globs-command')

exports.command = 'gpm-update [globs...]'

exports.describe = `update git repo`

exports.builder = (yargs) => {
  yargs.example('$0 gpm-update').options({})

  return filterOptions(globsOptions(yargs))
}

exports.handler = function handler(argv) {
  return require('..')(argv)
}
