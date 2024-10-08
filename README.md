# lerna-gpm

[![Build status](https://img.shields.io/github/workflow/status/imcuttle/lerna-gpm/Test/master?style=flat-square)](https://github.com/imcuttle/lerna-gpm/actions)
[![Test coverage](https://img.shields.io/codecov/c/github/imcuttle/lerna-gpm/master.svg?style=flat-square)](https://codecov.io/github/imcuttle/lerna-gpm?branch=master)
[![lerna](https://img.shields.io/badge/maintained%20with-lerna-cc00ff.svg?style=flat-square)](https://lernajs.io/)
[![Prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://prettier.io/)
[![Conventional Commits](https://img.shields.io/badge/Conventional%20Commits-1.0.0-yellow.svg?style=flat-square)](https://conventionalcommits.org)

> Lerna command extensions for **G**it **P**ackage **M**anager

## Why use GPM?

Use git for sharing node package, which integrated with lerna (lerna.json)

```bash
npm i lerna-cli lerna-command-preset-gpm -D
```

```json5
{
  packages: ['packages/*'],
  extendCommands: ['lerna-command-preset-gpm'],
  command: {},
  gpm: {
    'packages/shared-lib': {
      branch: 'master',
      url: 'git-url',
      remote: 'origin',
      checkout: 'commit-sha'
    }
  }
}
```

After executing `lerna gpm-update`, the files are as following.

```text
lerna.json
.gitignore # `/packages/shared-lib` will be appended here
packages/
  shared-lib/
    .git/
    ...
```

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
