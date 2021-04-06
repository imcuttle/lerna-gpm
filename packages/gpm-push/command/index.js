const { filterOptions } = require('@lerna/filter-options')

exports.command = 'gpm-push'

exports.describe = `gpm push command`

exports.builder = (yargs) => {
  yargs.example('$0 gpm-push').options({
    'git-push-command': {
      group: 'Command Options:',
      describe: 'Git Push Command Template',
      type: 'string',
      default: 'git push ${remote} HEAD:refs/for/${branch}'
    }
  })

  return filterOptions(yargs)
}

exports.handler = function handler(argv) {
  require('..')(argv)
}
