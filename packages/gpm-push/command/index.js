const { filterOptions } = require('@lerna/filter-options')
const { pushOptions } = require('..')

exports.command = 'gpm-push'

exports.describe = `gpm push command`

exports.builder = (yargs) => {
  yargs.example('$0 gpm-push')

  return filterOptions(pushOptions(yargs))
}

exports.handler = function handler(argv) {
  require('..')(argv)
}
