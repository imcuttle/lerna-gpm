const { importOptions } = require('..')
exports.command = 'gpm-import <repo-or-git-dir>'

exports.describe = `import git repo like git submodule`

exports.builder = (yargs) => {
  yargs.positional('repo-or-git-dir', {
    describe: 'The path or remote url to an external git repository that contains an npm package'
  })

  return importOptions(yargs)
}

exports.handler = function handler(argv) {
  require('..')(argv)
}
