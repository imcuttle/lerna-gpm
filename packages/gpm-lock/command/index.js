const { filterOptions } = require('@lerna/filter-options')
const { globsOptions } = require('lerna-utils-globs-command')
const { lockOptions } = require('..')

exports.command = 'gpm-lock [globs...]'

exports.describe = `gpm lock version command`

exports.builder = (yargs) => {
  yargs.example('$0 gpm-lock')

  return filterOptions(globsOptions(lockOptions(yargs)))
}

exports.handler = function handler(argv) {
  return require('..')(argv)
}
