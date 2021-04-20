/**
 * gpm utils
 * @author 余聪
 */
const { gitRemote, getGitSha, getCurrentBranch, hasUncommitted, fetch, isAheadOfRemote } = require('lerna-utils-git-command')
const { ValidationError } = require('@lerna/validation-error')

const getGitInfoWithValidate = (exports.getGitInfoWithValidate = async (localDir, { remote = 'origin' } = {}) => {
  if (await hasUncommitted(localDir)) {
    throw new ValidationError('GIT', `${localDir} 中具有未提交的改动，请先 git commit`)
  }

  const branch = await getCurrentBranch(localDir)
  if (!(await fetch(remote, branch, localDir))) {
    throw new ValidationError('GIT', `fetch 远端代码失败`)
  }

  if (await isAheadOfRemote(remote, branch, localDir)) {
    throw new ValidationError('GIT', `存在未推送至远端的 git commit`)
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
