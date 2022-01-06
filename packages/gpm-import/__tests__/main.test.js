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
    expect(readFileSync(fixture('.gitignore')).toString()).toMatchInlineSnapshot(`"/packages/tmp"`)
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
    expect(readFileSync(fixture('.gitignore')).toString()).toMatchInlineSnapshot(`"/packages/tmp"`)
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
