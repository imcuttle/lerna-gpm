const gpmPull = require('../src')
const nps = require('path')
const { execSync } = require('child_process')
const { fixture } = require('./helper')

const exec = (cmd) => {
  return execSync(cmd.replace('lerna', nps.join(__dirname, '../../../node_modules/.bin/lerna')), {
    encoding: 'utf8',
    cwd: fixture()
  }).trim()
}

beforeAll(() => {
  exec('lerna gpm-import https://github.com/imcuttle/visit-tree.git --name=tmp')
})

afterAll(() => {
  exec('rm -rf packages/tmp')
})

describe('gpmPull', function() {
  it(
    'spec case',
    function () {
      const head = exec('cd packages/tmp && git rev-parse HEAD')
      exec('cd packages/tmp && git reset HEAD~1 --hard')
      const headLastOne = exec('cd packages/tmp && git rev-parse HEAD')
      expect(headLastOne).not.toBe(head)

      exec('lerna gpm-pull packages/tmp')
      expect(exec('cd packages/tmp && git rev-parse HEAD')).toBe(head)
    }
  )
})
