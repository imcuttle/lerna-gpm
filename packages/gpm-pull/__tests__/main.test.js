const gpmPull = require('../src')
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

beforeAll(() => {
  exec('lerna gpm-import https://github.com/imcuttle/visit-tree.git --name=tmp')
})

afterAll(() => {
  exec('rm -rf packages/tmp')
})

describe('gpmPull', function () {
  it('spec case', function () {
    const head = exec('cd packages/tmp && git rev-parse HEAD')
    exec('cd packages/tmp && git reset HEAD~1 --hard')
    const headLastOne = exec('cd packages/tmp && git rev-parse HEAD')
    expect(headLastOne).not.toBe(head)

    exec('lerna gpm-pull packages/tmp')
    expect(exec('cd packages/tmp && git rev-parse HEAD')).toBe(head)
  })

  it('spec case --lock', function () {
    const head = exec('cd packages/tmp && git rev-parse HEAD')
    exec('cd packages/tmp && git reset HEAD~1 --hard')

    const lernaConfig = readLernaJson()
    writeFileSync(
      fixture('lerna.json'),
      JSON.stringify(
        {
          ...lernaConfig,
          gpm: {
            ...lernaConfig.gpm,
            'packages/tmp': {
              ...lernaConfig.gpm['packages/tmp'],
              checkout: null
            }
          }
        },
        null,
        2
      )
    )

    exec('lerna gpm-pull packages/tmp --lock')
    expect(readLernaJson().gpm['packages/tmp']).toEqual({
      branch: 'master',
      checkout: head,
      remote: 'origin',
      url: 'https://github.com/imcuttle/visit-tree.git'
    })
  })
})
