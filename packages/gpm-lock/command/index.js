const { filterOptions } = require('@lerna/filter-options')
const { lockOptions } = require('..')

exports.command = 'gpm-lock'

exports.describe = `gpm lock version command`

exports.builder = (yargs) => {
  yargs.example('$0 gpm-lock')

  return filterOptions(lockOptions(yargs))
}

exports.handler = function handler(argv) {
  return require('..')(argv)
}
