const cp = require('child_process')
const { promisify } = require('util')
const { resolve } = require('path')
const { URL } = require('url')
const isCi = require('is-ci')
const { readFile, existsSync, statSync } = require('fs')

// `git status -s`
const runCommand = async (cmd, cwd, opts) => {
  try {
    const { stdout, stderr } = await promisify(cp.exec)(`${cmd}`, {
      ...opts,
      cwd,
      env: {
        GIT_TERMINAL_PROMPT: isCi ? '0' : '1',
        ...process.env
      },
      encoding: 'utf8'
    })
    return stdout.trim()
  } catch (err) {
    throw err
  }
}

// `git status -s`
const runGitCommand = async (gitCmd, cwd) => {
  return await runCommand(`git ${gitCmd}`, cwd)
}

const hasUncommitted = (cwd) => {
  return runGitCommand(`status -s`, cwd).then((changes) => {
    return !!changes
  })
}

const gitRemote = (cwd, remote) => {
  return runGitCommand(`config --get remote.${remote}.url`, cwd)
}

const stripGitRemote = (url) => {
  try {
    const urlObj = new URL(url)
    urlObj.username = urlObj.password = ''
    return urlObj.toString()
  } catch (e) {
    return url
  }
}

const gitRemoteStrip = (cwd, remote) => {
  return runGitCommand(`config --get remote.${remote}.url`, cwd).then((url) => stripGitRemote(url))
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

const rawCompare = (a, b, cwd) => {
  return runGitCommand(`rev-list --ancestry-path ${a}..${b}`, cwd).then(
    (diff) => {
      return diff
    },
    () => false
  )
}

const compare = (a, b, cwd) => {
  return rawCompare(a, b, cwd).then((diff) => {
    if (diff) {
      return -1
    }
    return rawCompare(b, a, cwd).then((diff) => {
      if (diff) {
        return 1
      }
      return 0
    })
  })
}

const isAheadOfRemote = (remote, branch, cwd) => {
  return runGitCommand(`rev-list --ancestry-path ${remote}/${branch}..HEAD`, cwd).then(
    (diff) => {
      return !!diff
    },
    () => false
  )
}

const isBehindRemote = (remote, branch, cwd) => {
  return runGitCommand(`rev-list --ancestry-path HEAD..${remote}/${branch}`, cwd).then(
    (diff) => {
      return !!diff
    },
    () => false
  )
}

const isGitRepo = (cwd) => {
  return runGitCommand(`rev-parse --is-inside-work-tree`, cwd).then(
    () => existsSync(resolve(cwd, '.git')) && statSync(resolve(cwd, '.git')).isDirectory(),
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
  gitRemote,
  gitCommit,
  getGitSha,
  isBehindRemote,
  compare,
  gitRemoteStrip,
  isAheadOfRemote,
  gitAdd,
  runCommand,
  stripGitRemote
}
