const gpmImport = require('../src')
const nps = require('path')
const { execSync } = require('child_process')
const { fixture } = require('./helper')
const { readFileSync, writeFileSync } = require('fs')

const readLernaJson = () => {
  return JSON.parse(readFileSync(fixture('lerna.json')).toString())
}

const execPure = (cmd) => execSync(cmd, { cwd: fixture() }).toString().trim()

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
            --name   package name  [string]

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

  afterEach(() => {
    writeFileSync(
      fixture('lerna.json'),
      JSON.stringify(
        {
          ...readLernaJson(),
          gpm: {}
        },
        null,
        2
      )
    )
    execPure('rm -rf tmp')
    execPure('rm -rf packages/tmp')
    execPure('rm -rf packages/visit-tree')
    execPure('rm -rf .gitignore')
  })
  it('import invalid git dir', function () {
    execPure('mkdir -p tmp/')
    expect(() => exec('lerna gpm-import tmp')).toThrowError(/非 Git 仓库/)
  })
  it('import valid git dir', function () {
    execPure('git clone https://github.com/imcuttle/visit-tree.git tmp')
    const head = execPure('cd tmp && git rev-parse HEAD')
    expect(exec('lerna gpm-import tmp')).toMatchInlineSnapshot(`""`)
    expect(readLernaJson().gpm['packages/tmp']).toMatchObject({
      branch: 'master',
      url: 'https://github.com/imcuttle/lerna-commands.git',
      remote: 'origin',
      checkout: head
    })
    expect(readFileSync(fixture('.gitignore')).toString()).toMatchInlineSnapshot(`"/packages/tmp/"`)
  })

  it('import valid git repo', function () {
    execPure('git clone https://github.com/imcuttle/visit-tree.git tmp')
    const head = execPure('cd tmp && git rev-parse HEAD')
    expect(exec('lerna gpm-import https://github.com/imcuttle/visit-tree.git')).toMatchInlineSnapshot(`""`)
    expect(readLernaJson().gpm['packages/visit-tree']).toMatchObject({
      branch: 'master',
      url: 'https://github.com/imcuttle/lerna-commands.git',
      remote: 'origin',
      checkout: head
    })
    expect(readFileSync(fixture('.gitignore')).toString()).toMatchInlineSnapshot(`"/packages/visit-tree/"`)
  })
  it('import valid git repo with --name', function () {
    execPure('git clone https://github.com/imcuttle/visit-tree.git tmp')
    const head = execPure('cd tmp && git rev-parse HEAD')
    expect(exec('lerna gpm-import --name tmp https://github.com/imcuttle/visit-tree.git')).toMatchInlineSnapshot(`""`)
    expect(readFileSync(fixture('.gitignore')).toString()).toMatchInlineSnapshot(`"/packages/tmp/"`)
  })
})
