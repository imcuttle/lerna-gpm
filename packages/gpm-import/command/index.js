exports.command = 'gpm-import <repo-or-git-dir>'

exports.describe = `import git repo like git submodule`

exports.builder = (yargs) => {
  yargs
    .positional('repo-or-git-dir', {
      describe: 'The path or remote url to an external git repository that contains an npm package'
    })
    .options({
      dest: {
        group: 'Command Options:',
        describe: 'Import destination directory for the external git repository',
        type: 'string',
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

  return yargs
}

exports.handler = function handler(argv) {
  require('..')(argv)
}
