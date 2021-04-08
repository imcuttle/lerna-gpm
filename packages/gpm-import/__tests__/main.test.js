const gpmImport = require('../src')
const nps = require('path')
const { execSync } = require('child_process')
const { fixture } = require('./helper')

const execPure = (cmd) => execSync(cmd, { cwd: fixture() })

const exec = (cmd) => {
  return execSync(cmd.replace('lerna', nps.join(__dirname, '../../../node_modules/.bin/lerna')), {
    encoding: 'utf8',
    cwd: fixture()
  })
}

describe('gpmImport', function () {
  it('spec case --help', function () {
    const output = exec('lerna gpm-import --help')
    expect(output).toMatchInlineSnapshot(`
      "lerna gpm-import <repo-or-git-dir>

      import git repo like git submodule

      Positionals:
        repo-or-git-dir  The path or remote url to an external git repository that contains an npm package  [required]

      Import Options:
            --alias  Alias to package.json  [boolean]

      Global Options:
            --loglevel       What level of logs to report.  [string] [default: info]
            --concurrency    How many processes to use when lerna parallelizes tasks.  [number] [default: 8]
            --reject-cycles  Fail if a cycle is detected among dependencies.  [boolean]
            --no-progress    Disable progress bars. (Always off in CI)  [boolean]
            --no-sort        Do not sort packages topologically (dependencies before dependents).  [boolean]
            --max-buffer     Set max-buffer (in bytes) for subcommand execution  [number]
        -h, --help           Show help  [boolean]
        -v, --version        Show version number  [boolean]
      "
    `)
  })
  it('import invalid git dir', function () {
    execPure('mkdir -p tmp')
    expect(() => exec('lerna gpm-import tmp')).toThrowError(/非 Git 仓库/)
  })
})
