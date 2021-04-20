const gpmLock = require('../src')
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
  })
}

beforeAll(() => {
  exec('lerna gpm-import https://github.com/imcuttle/visit-tree.git --name=tmp')
})

afterAll(() => {
  exec('rm -rf packages/tmp')
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

describe('gpmLock', function() {
  it(
    'spec case',
    function () {
      const head = exec('cd packages/tmp && git rev-parse HEAD')
      exec('lerna gpm-lock packages/tmp')
      expect(readLernaJson().gpm).toMatchObject({
        branch: 'master',
        remote: 'origin',
        url: 'https://github.com/imcuttle/visit-tree.git',
        checkout: head
      })
    }
  )
})
