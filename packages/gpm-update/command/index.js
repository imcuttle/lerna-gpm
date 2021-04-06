const { filterOptions } = require('@lerna/filter-options')
const { importOptions } = require('lerna-command-gpm-import')

exports.command = 'gpm-update'

exports.describe = `update git repo`

exports.builder = (yargs) => {
  yargs.example('$0 gpm-update').options({
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

  return importOptions(filterOptions(yargs))
}

exports.handler = function handler(argv) {
  require('..')(argv)
}
