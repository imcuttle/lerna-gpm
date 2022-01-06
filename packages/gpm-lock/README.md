# lerna-command-gpm-lock

[![NPM version](https://img.shields.io/npm/v/lerna-command-gpm-lock.svg?style=flat-square)](https://www.npmjs.com/package/lerna-command-gpm-lock)
[![NPM Downloads](https://img.shields.io/npm/dm/lerna-command-gpm-lock.svg?style=flat-square&maxAge=43200)](https://www.npmjs.com/package/lerna-command-gpm-lock)
[![Prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://prettier.io/)
[![Conventional Commits](https://img.shields.io/badge/Conventional%20Commits-1.0.0-yellow.svg?style=flat-square)](https://conventionalcommits.org)

> gpm lock version command

在 A 同学在希望修改 GPM 资源时

1. 在 gpm 资源目录中执行 git commit xxx && git push
2. 在已有 GPM 配置的 root 项目目录中，执行 npx lerna gpm-lock  
   会自动帮你更新 gpm 当前本地版本至 lerna.json 中
3. 在 root 项目目录中，执行 git commit xx && git push 即可

## Usage

```bash
lerna gpm-lock [...globs]
```

```json5
// lerna.json
{
  packages: ['packages/*'],
  extendCommands: ['@tutor/lerna-command-gpm-alias'],
  command: {
    'gpm-lock': {}
  },
  version: '0.0.0',
  gpm: {}
}
```

### Options

#### `push`

是否执行 gpm-push (git push)，继承 [gpm-push](../gpm-push) 参数

- Type: `boolean`
- Default: `false`

#### `gitLint`

是否进行 git 校验，如判断是否有未提交改动，是否有未推送提交

- Type: `boolean`
- Default: `true`

#### `nestedLock`

对于嵌套场景下的 gpm 资源，是否锁定嵌套 gpm 资源版本

- Type: `boolean`
- Default: `false`

#### `commit`

lock 导致的 lerna.json，是否执行 git commit

- Type: `boolean`
- Default: `true`

#### `gitCommitMessage`

自动执行的 git commit 的 commit message

- Type: `string`
- Default: `"chore: gpm-lock"`

## Contributing

- Fork it!
- Create your new branch:  
  `git checkout -b feature-new` or `git checkout -b fix-which-bug`
- Start your magic work now
- Make sure npm test passes
- Commit your changes:  
  `git commit -am 'feat: some description (close #123)'` or `git commit -am 'fix: some description (fix #123)'`
- Push to the branch: `git push`
- Submit a pull request :)

## Authors

This library is written and maintained by [imcuttle](mailto:imcuttle@163.com).

## License

MIT - [imcuttle](mailto:imcuttle@163.com)
