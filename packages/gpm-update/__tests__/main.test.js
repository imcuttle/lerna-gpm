const nps = require('path')
const { execSync } = require('child_process')
const { fixture } = require('./helper')
const { readFileSync, writeFileSync, existsSync } = require('fs')

const readLernaJson = () => {
  return JSON.parse(readFileSync(fixture('lerna.json')).toString())
}

const writeGpm = (gpm) => {
  writeFileSync(
    fixture('lerna.json'),
    JSON.stringify(
      {
        ...readLernaJson(),
        gpm: gpm
      },
      null,
      2
    )
  )
}

const exec = (cmd) => {
  return execSync(cmd.replace('lerna', nps.join(__dirname, '../../../node_modules/.bin/lerna')), {
    encoding: 'utf8',
    cwd: fixture()
  }).trim()
}

beforeEach(() => {
  exec('git clone https://github.com/imcuttle/visit-tree.git tmp')
})

afterEach(() => {
  exec('rm -rf packages/tmp')
  exec('rm -rf tmp')
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

describe('gpmUpdate', function () {
  it('spec case', function () {
    const head = exec('cd tmp && git rev-parse HEAD')
    writeGpm({
      'packages/tmp': {
        remote: 'origin',
        branch: 'master',
        url: 'https://github.com/imcuttle/visit-tree.git',
        checkout: head
      }
    })
    expect(existsSync(fixture('packages/tmp'))).toBeFalsy()

    exec('lerna gpm-update packages/tmp')
    expect(existsSync(fixture('packages/tmp'))).toBeTruthy()
    expect(exec('cd packages/tmp && git rev-parse HEAD')).toBe(head)
  })
})
