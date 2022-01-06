const { filterOptions } = require('@lerna/filter-options')
const { globsOptions } = require('lerna-utils-globs-command')
const { lockOptions } = require('lerna-command-gpm-lock')

exports.command = 'gpm-pull [globs...]'

exports.describe = `GPM pull command`

exports.builder = (yargs) => {
  yargs.example('$0 gpm-pull').options({
    lock: {
      group: 'Command Options:',
      describe: '执行 gpm-lock',
      type: 'boolean'
    },
    'git-pull-command': {
      group: 'Command Options:',
      describe: 'git pull 的执行命令模板',
      type: 'string'
    }
  })

  return globsOptions(filterOptions(lockOptions(yargs)))
}

exports.handler = function handler(argv) {
  return require('..')(argv)
}
