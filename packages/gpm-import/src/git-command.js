const cp = require('child_process')
const { promisify } = require('util')

// `git status -s`
const runGitCommand = async (gitCmd, cwd) => {
  try {
    const { stdout, stderr } = await promisify(cp.exec)(`git ${gitCmd}`, { cwd, encoding: 'utf8' })
    return stdout.trim()
  } catch (err) {
    throw err
  }
}

const hasUncommitted = (cwd) => {
  return runGitCommand(`status -s`, cwd).then((changes) => !changes)
}

const getGitSha = (cwd) => {
  return runGitCommand(`rev-parse HEAD`, cwd)
}

const getCurrentBranch = (cwd) => {
  return runGitCommand('rev-parse --abbrev-ref HEAD', cwd)
}

const pullRemoteRebase = (remote, branch, cwd) => {
  return runGitCommand(`pull ${remote} ${branch} --rebase`, cwd).then(
    () => true,
    () => false
  )
}

const fetch = (remote, branch, cwd) => {
  return runGitCommand(`fetch ${remote} ${branch}`, cwd).then(
    () => true,
    () => false
  )
}

const isBehindRemote = (remote, branch, cwd) => {
  return runGitCommand(`rev-list --ancestry-path HEAD..${remote}/${branch}`, cwd).then(
    (diff) => !!diff,
    () => false
  )
}

const isGitRepo = (cwd) => {
  return runGitCommand(`rev-parse --is-inside-work-tree`, cwd).then(
    () => true,
    () => false
  )
}

const gitCommit = (msg, commitArgv = '', cwd) => {
  return runGitCommand(`commit -m"$(echo ${JSON.stringify(msg)})" ${commitArgv}`, cwd).then(() => true)
}

const gitAdd = (file, cwd) => {
  return runGitCommand(`add ${JSON.stringify(file)}`, cwd).then(
    () => true,
    () => false
  )
}

module.exports = {
  hasUncommitted,
  runGitCommand,
  isGitRepo,
  getCurrentBranch,
  fetch,
  pullRemoteRebase,
  gitCommit,
  getGitSha,
  isBehindRemote,
  gitAdd
}
