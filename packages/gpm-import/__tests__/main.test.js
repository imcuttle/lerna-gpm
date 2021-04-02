const gpmImport = require('../src')
const nps = require('path')
const { execSync } = require('child_process')
const { fixture } = require('./helper')

const exec = (cmd) => {
  return execSync(cmd.replace('lerna', nps.join(__dirname, '../../../node_modules/.bin/lerna')), {
    encoding: 'utf8',
    cwd: fixture()
  })
}

describe('gpmImport', function() {
  it(
    'spec case',
    function () {
      const output = exec('lerna gpm-import abc')
      console.log('output', output)
    }
  )
})
