exports.command = 'import-git'

exports.describe = `import git repo like git submodule`

exports.builder = (yargs) => {
  yargs.example('$0 import-git').options({
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

  return filterable(yargs)
}

exports.handler = function handler(argv) {
  require('..')(argv)
}
