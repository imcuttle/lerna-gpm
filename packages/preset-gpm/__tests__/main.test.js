const nps = require('path')
const { execSync } = require('child_process')
const { fixture } = require('./helper')

const exec = (cmd) => {
  return execSync(cmd.replace('lerna', nps.join(__dirname, '../../../node_modules/.bin/lerna')), {
    encoding: 'utf8',
    cwd: fixture()
  })
}

describe('presetGpm', function() {
  // it(
  //   'spec case',
  //   function () {
  //
  //   }
  // )
})
