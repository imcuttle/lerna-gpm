const { filterOptions } = require('@lerna/filter-options')

exports.command = 'gpm-lock'

exports.describe = `gpm lock version command`

exports.builder = (yargs) => {
  yargs.example('$0 gpm-lock').options({
    heading: {
      group: 'Command Options:',
      describe: 'Markdown heading matching text',
      type: 'string',
      default: 'Packages'
    },
    input: {
      group: 'Command Options:',
      describe: 'Markdown input filename',
      alias: 'i',
      type: 'string',
      default: './README.md'
    },
    output: {
      group: 'Command Options:',
      describe: 'Markdown output filename',
      alias: 'o',
      type: 'string'
    }
  })

  return filterOptions(yargs)
}

exports.handler = function handler(argv) {
  require('..')(argv)
}
