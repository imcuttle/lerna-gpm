const { filterOptions } = require('@lerna/filter-options')
const { gpmAliasOptions } = require('..')
const { globsOptions } = require('lerna-utils-globs-command')

exports.command = 'gpm-alias'

exports.describe = `Alias GPM Package`

exports.builder = (yargs) => {
  yargs.example('$0 gpm-alias')

  return filterOptions(globsOptions(gpmAliasOptions(yargs)))
}

exports.handler = function handler(argv) {
  return require('..')(argv)
}
