const { filterOptions } = require('@lerna/filter-options')
const { globsOptions } = require('lerna-utils-globs-command')
const { pushOptions } = require('..')

exports.command = 'gpm-push [globs...]'

exports.describe = `GPM push command`

exports.builder = (yargs) => {
  yargs.example('$0 gpm-push')

  return filterOptions(globsOptions(pushOptions(yargs)))
}

exports.handler = function handler(argv) {
  return require('..')(argv)
}
