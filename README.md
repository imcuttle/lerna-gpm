# lerna-commands

[![Build status](https://img.shields.io/travis/imcuttle/lerna-commands/master.svg?style=flat-square)](https://travis-ci.com/imcuttle/lerna-commands)
[![Test coverage](https://img.shields.io/codecov/c/github/imcuttle/lerna-commands.svg?style=flat-square)](https://codecov.io/github/imcuttle/lerna-commands?branch=master)
[![lerna](https://img.shields.io/badge/maintained%20with-lerna-cc00ff.svg?style=flat-square)](https://lernajs.io/)
[![Prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://prettier.io/)
[![Conventional Commits](https://img.shields.io/badge/Conventional%20Commits-1.0.0-yellow.svg?style=flat-square)](https://conventionalcommits.org)

> Some useful lerna command extensions (eg. **G**it **P**ackage **M**anager)

## Packages

- [lerna-command-gpm-alias](packages/gpm-alias) - Alias GPM Package
- [lerna-command-gpm-check](packages/gpm-check) - gpm check command
- [lerna-command-gpm-import](packages/gpm-import) - import git repo like git submodule
- [lerna-command-gpm-lock](packages/gpm-lock) - gpm lock version command
- [lerna-command-gpm-pull](packages/gpm-pull) - gpm pull command
- [lerna-command-gpm-push](packages/gpm-push) - gpm push command
- [lerna-command-gpm-update](packages/gpm-update) - update git repo
- [lerna-command-preset-gpm](packages/preset-gpm) - gpm commands preset
- [lerna-utils-git-command](packages/git-command) - Internal Package: Git Utils (eg. clone/fetch/pull/checkout/compare)
- [lerna-utils-globs-command](packages/globs-command) - Internal Package: GPM basic class for lerna command, with globs options, check remote version, concurrency.
- [lerna-utils-gpm](packages/gpm) - Internal Package: GPM common utils

## Contributing

- Fork it!
- Create your new branch:\
  `git checkout -b feature-new` or `git checkout -b fix-which-bug`
- Start your magic work now
- Make sure npm test passes
- Commit your changes:\
  `git commit -am 'feat: some description (close #123)'` or `git commit -am 'fix: some description (fix #123)'`
- Push to the branch: `git push`
- Submit a pull request :)

## Authors

This library is written and maintained by imcuttle, <a href="mailto:imcuttle@163.com">imcuttle@163.com</a>.

## License

MIT - [imcuttle](https://github.com/imcuttle) 🐟
