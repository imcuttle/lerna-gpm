/**
 * import git repo like git submodule
 * @author 余聪
 */


const { Command } = require('@lerna/command')
const { ValidationError } = require('@lerna/validation-error')

module.exports = factory

function factory(argv) {
  return new ImportGitCommand(argv)
}

class ImportGitCommand extends Command {
  get requiresGit() {
    return false
  }

  async initialize() {
    console.log(this)

    // this.packageGraph

    // this.validPackages = await getFilteredPackages(this.packageGraph, this.execOpts, {
    //   private: false,
    //   ...this.options
    // })
  }

  async execute() {
    return
  }
}
