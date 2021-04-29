const gpmImport = require('../src')
const nps = require('path')
const { execSync } = require('child_process')
const { fixture } = require('./helper')
const { existsSync, statSync, readFileSync, writeFileSync } = require('fs')

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
            --git-clone-user               The user of git clone  [string]
            --git-clone-user-env-name      The user env name of git clone  [string]
            --git-clone-password           The password of git clone  [string]
            --git-clone-password-env-name  The password env name of git clone  [string]
            --no-alias                     Do not alias to package.json in tsconfig.json  [boolean]
            --no-bootstrap                 Do not automatically chain \`lerna bootstrap\` after changes are made.  [boolean]
            --dest                         Write to which directory  [string]
            --name                         package name  [string]

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
    execPure('rm -rf tsconfig.json')
  })
  it('import invalid git dir', function () {
    execPure('mkdir -p tmp/')
    expect(() => exec('lerna gpm-import tmp')).toThrowError(/非 Git 仓库/)
  })
  it('import valid git dir', function () {
    execPure('git clone https://github.com/imcuttle/visit-tree.git tmp')
    const head = execPure('cd tmp && git rev-parse HEAD')

    // execPure('echo {} > tsconfig.json')
    exec('lerna gpm-import tmp')
    expect(readLernaJson().gpm['packages/tmp']).toMatchObject({
      branch: 'master',
      url: 'https://github.com/imcuttle/visit-tree.git',
      remote: 'origin',
      checkout: head
    })
    expect(readFileSync(fixture('.gitignore')).toString()).toMatchInlineSnapshot(`"/packages/tmp/"`)
    // expect(statSync(fixture('packages/tmp/node_modules')).isDirectory()).toBeTruthy()
    // expect(JSON.parse(String(readFileSync(fixture('tsconfig.json'))))).toEqual({
    //   compilerOptions: { baseUrl: '.', paths: { '@moyuyc/visit-tree': ['./packages/tmp'] } }
    // })
  })

  it('import valid git dir --no-bootstrap', function () {
    execPure('git clone https://github.com/imcuttle/visit-tree.git tmp')
    exec('lerna gpm-import --no-bootstrap tmp')
    expect(existsSync(fixture('packages/tmp/node_modules'))).toBeFalsy()
  })

  // it('import valid git repo', function () {
  //   execPure('git clone https://github.com/imcuttle/visit-tree.git tmp')
  //   const head = execPure('cd tmp && git rev-parse HEAD')
  //   expect(exec('lerna gpm-import https://github.com/imcuttle/visit-tree.git')).toMatchInlineSnapshot(`""`)
  //   expect(readLernaJson().gpm['packages/visit-tree']).toMatchObject({
  //     branch: 'master',
  //     url: 'https://github.com/imcuttle/visit-tree.git',
  //     remote: 'origin',
  //     checkout: head
  //   })
  //   expect(readFileSync(fixture('.gitignore')).toString()).toMatchInlineSnapshot(`"/packages/visit-tree/"`)
  // })
  it('import valid git repo with --name', function () {
    execPure('git clone https://github.com/imcuttle/visit-tree.git tmp')
    const head = execPure('cd tmp && git rev-parse HEAD')
    exec('lerna gpm-import --name tmp https://github.com/imcuttle/visit-tree.git')
    expect(readFileSync(fixture('.gitignore')).toString()).toMatchInlineSnapshot(`"/packages/tmp/"`)
  })

  it('import valid git repo with username/password', function () {
    execPure('git clone https://github.com/imcuttle/visit-tree.git tmp')
    const head = execPure('cd tmp && git rev-parse HEAD')
    exec('lerna gpm-import --git-clone-user=abc --name tmp https://github.com/imcuttle/visit-tree.git')

    expect(execPure('cd packages/tmp && git config --get remote.origin.url')).toMatchInlineSnapshot(
      `"https://abc@github.com/imcuttle/visit-tree.git"`
    )
  })
})
