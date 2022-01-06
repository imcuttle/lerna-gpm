/**
 * gpm utils
 * @author imcuttle
 */
const {
  gitRemote,
  gitRemoteStrip,
  getGitSha,
  getCurrentBranch,
  hasUncommitted,
  fetch,
  isAheadOfRemote
} = require('lerna-utils-git-command')
const { ValidationError } = require('@lerna/validation-error')
const { Project } = require('@lerna/project')
const fs = require('fs')
const nps = require('path')

const getGitInfoWithValidate = (exports.getGitInfoWithValidate = async (
  localDir,
  { remote = 'origin', gitLint } = {}
) => {
  if (gitLint !== false && (await hasUncommitted(localDir))) {
    throw new ValidationError('GIT', `${localDir} has uncommitted changes，Please execute "git commit" firstly.`)
  }

  const branch = await getCurrentBranch(localDir)
  if (!(await fetch(remote, branch, localDir))) {
    throw new ValidationError('GIT', `fetch failed`)
  }

  if (await isAheadOfRemote(remote, branch, localDir)) {
    throw new ValidationError('GIT', `${localDir} has unpushed commits`)
  }

  const gitUrl = await gitRemote(localDir, remote)
  const gitBranch = branch
  const gitCheckout = await getGitSha(localDir)

  return {
    gitCheckout,
    gitBranch,
    gitUrl
  }
})

const stripUserInfoUrl = (url) => {
  try {
    const urlObj = new URL(url)
    urlObj.username = ''
    urlObj.password = ''
    return String(urlObj)
  } catch (e) {
    return url
  }
}

const isSameGpmConfig = (exports.isSameGpmConfig = (a, b) => {
  return (
    (a.remote || 'origin') === (b.remote || 'origin') &&
    stripUserInfoUrl(a.url || '') === stripUserInfoUrl(b.url || '') &&
    a.branch === b.branch
  )
})

exports.findNested = async (subDir, gpmConfig, { filterGpmConfig, symblicLink = true } = {}) => {
  const lernaJsonFilename = nps.join(subDir, 'lerna.json')
  const nested = []
  if (fs.existsSync(lernaJsonFilename)) {
    const lernaJson = new Project(subDir).config
    if (lernaJson.gpm && typeof lernaJson.gpm === 'object' && Object.keys(lernaJson.gpm).length) {
      for (const [nestedName, nestedConfig] of Object.entries(lernaJson.gpm)) {
        const subFilename = nps.join(subDir, nestedName)
        if (!symblicLink || (fs.existsSync(subFilename) && fs.lstatSync(subFilename).isSymbolicLink())) {
          if (!gpmConfig) {
            nested.push({
              dirName: subFilename,
              config: nestedConfig,
              keyName: nestedName
            })
          } else {
            Object.keys(gpmConfig).forEach((name) => {
              const mainConfig = gpmConfig[name]
              if (isSameGpmConfig(nestedConfig, mainConfig)) {
                if (filterGpmConfig) {
                  if (isSameGpmConfig(filterGpmConfig, mainConfig)) {
                    nested.push({
                      mainConfig,
                      mainName: name,
                      dirName: subFilename,
                      config: nestedConfig,
                      keyName: nestedName
                    })
                  }
                } else {
                  nested.push({
                    mainConfig,
                    mainName: name,
                    dirName: subFilename,
                    config: nestedConfig,
                    keyName: nestedName
                  })
                }
              }
            })
          }
        }
      }
    }
  }

  return nested
}
