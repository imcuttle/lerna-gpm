/**
 * update git repo
 * @author imcuttle
 */
const fs = require('fs')
const fsExtra = require('fs-extra')
const nps = require('path')
const { promisify } = require('util')
const gpmImport = require('lerna-command-gpm-import')
const { hasUncommitted, runCommand: runCommandUntil } = require('lerna-utils-git-command')
const { isBehindRemote, isAheadOfRemote } = require('lerna-utils-git-command')
const {
  gitRemote,
  gitRemoteStrip,
  isGitRepo,
  getCurrentBranch,
  fetch,
  runGitCommand,
  getGitSha,
  compare
} = require('lerna-utils-git-command')

const { GlobsCommand } = require('lerna-utils-globs-command')
const { findNested } = require('lerna-utils-gpm')
const { getFilteredPackages } = require('@lerna/filter-options')
const { ValidationError } = require('@lerna/validation-error')

module.exports = factory
module.exports.gpmUpdateOptions = gpmUpdateOptions

function gpmUpdateOptions(yargs) {
  const opts = {
    'no-git-lint': {
      describe: 'Do not check root git has uncommitted before execute lock',
      type: 'boolean'
    },
    'git-lint': {
      hidden: true,
      type: 'boolean'
    }
  }
  return yargs.options(opts).group(Object.keys(opts), 'GpmUpdate Options:')
}

function factory(argv) {
  return new GpmUpdateCommand(argv)
}

class GpmUpdateCommand extends GlobsCommand {
  get requiresGit() {
    return true
  }
  async initialize() {
    if (!!(await findNested(this.project.rootPath)).length) {
      throw new ValidationError(
        'EGPM_NESTED',
        'GPM package contains symbolic link, please do not execute gpm-update in sub-directory.'
      )
    }
    const { rootPath, rootConfigLocation, config } = this.project
    if (!config.gpm || !Object.keys(config.gpm).length) {
      throw new ValidationError('ENOGPM', rootConfigLocation + ' config of GPM is not found.')
    }
    super.initialize()

    this.validPackages = await getFilteredPackages(this.packageGraph, this.execOpts, {
      ...this.options
    })
  }

  findPackage(dir) {
    const pkg = super.findPackage(dir)
    if (!pkg) {
      return { name: dir }
    }
    return pkg
  }

  getPackageDirectories() {
    return this.project.packageConfigs.filter((p) => p.endsWith('*')).map((p) => nps.dirname(p))
  }

  async executeEach(dir, { remote = 'origin', branch = 'master', checkout, url }) {
    const { rootPath, rootConfigLocation, config } = this.project
    const dirPath = nps.resolve(rootPath, dir)

    if (
      !fs.existsSync(dirPath) ||
      (fsExtra.statSync(dirPath).isDirectory() &&
        !(await fsExtra.readdir(dirPath)).length &&
        !(await isGitRepo(dirPath)))
    ) {
      const dest = this.getPackageDirectories().find((str) => dir.startsWith(str))
      await new Promise((resolve, reject) => {
        // fake promise api
        gpmImport({
          ...this.argv,
          repoOrGitDir: url,
          name: dir.slice(dest.length).replace(/^\//, ''),
          dest: dest,
          remote,
          checkout,
          branch
        }).then(resolve, reject)
      })
    }

    if (!(await isGitRepo(dirPath))) {
      throw new ValidationError('ENOGIT', dirPath + ' is not a git repo')
    }
    const gitUrl = await gitRemoteStrip(dirPath, remote)
    if (gitUrl !== url) {
      throw new ValidationError('ENOGIT', 'git remote url is not matched')
    }

    if (this.options.gitLint !== false && (await hasUncommitted(dirPath))) {
      throw new ValidationError('ENOGIT', `${dirPath} has uncommitted changes，Please execute "git commit" firstly.`)
    }

    // 按照配置的 remote / url / branch / checkout 进行更新
    if (!(await fetch(remote, branch, dirPath))) {
      throw new ValidationError('ENOGIT', `fetch failed`)
    }

    if (await isAheadOfRemote(remote, branch, dirPath)) {
      throw new ValidationError('ENOGIT', `${dirPath} has unpushed commits`)
    }

    const gitBranch = await getCurrentBranch(dirPath)
    if (gitBranch !== branch) {
      await runGitCommand(`checkout ${JSON.stringify(branch)}`, dirPath)
    }

    if (checkout) {
      this.logger.info('Reset to: ' + (await runGitCommand(`log --pretty=format:"%s %cd" ${checkout} -1`, dirPath)))

      await runGitCommand(`reset --hard ${JSON.stringify(checkout)}`, dirPath)
      await runGitCommand(`clean -fd`, dirPath)
    }

    // 子 GPM 嵌套对比版本
    const nestedList = await findNested(dirPath, this.project.config.gpm || {})
    for (const { mainName, config, dirName: subDirname, keyName, mainConfig } of nestedList) {
      const mainDirname = nps.join(this.project.rootPath, mainName)
      const mainSha = mainConfig.checkout
      const subSha = config.checkout
      await fetch(mainConfig.remote || 'origin', mainConfig.branch || 'master', mainDirname)
      const flag = await compare(mainSha, subSha, mainDirname)
      if (flag === 0) {
        continue
      }

      if (flag < 0) {
        this.logger.warn(
          `Found the nested：${mainName} is behind of ${nps.relative(
            rootPath,
            subDirname
          )}, Please execute \`lerna gpm-pull ${mainName}\` for updating.`
        )
        return
      }
    }
  }

  static name = 'gpm-update'
}
