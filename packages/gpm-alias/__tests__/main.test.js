const nps = require('path')
const { execSync } = require('child_process')
const { fixture } = require('./helper')
const { readFileSync, writeFileSync } = require('fs')

const readLernaJson = () => {
  return JSON.parse(readFileSync(fixture('lerna.json')).toString())
}

const exec = (cmd) => {
  return execSync(cmd.replace('lerna', nps.join(__dirname, '../../../node_modules/.bin/lerna')), {
    encoding: 'utf8',
    cwd: fixture()
  }).trim()
}

beforeEach(() => {
  exec('lerna gpm-import https://github.com/imcuttle/visit-tree.git --name=tmp')
})

afterEach(() => {
  exec('rm -rf packages/tmp')
  exec('rm -rf node_modules')
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
})

describe('gpmAlias', function () {
  it('spec case', function () {
    expect(exec('ls node_modules/@moyuyc/visit-tree')).toMatch(/README\.md/)
  })
})
