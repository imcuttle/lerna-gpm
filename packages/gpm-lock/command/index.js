const { filterOptions } = require('@lerna/filter-options')
const { pushOptions } = require('lerna-command-gpm-push')

exports.command = 'gpm-lock'

exports.describe = `gpm lock version command`

exports.builder = (yargs) => {
  yargs.example('$0 gpm-lock').options({
    push: {
      group: 'Command Options:',
      describe: '是否执行 gpm-push',
      type: 'boolean',
    },
  })

  return filterOptions(pushOptions(yargs))
}

exports.handler = function handler(argv) {
  require('..')(argv)
}
