# lerna-command-gpm-import

[![NPM version](https://img.shields.io/npm/v/lerna-command-gpm-import.svg?style=flat-square)](https://www.npmjs.com/package/lerna-command-gpm-import)
[![NPM Downloads](https://img.shields.io/npm/dm/lerna-command-gpm-import.svg?style=flat-square&maxAge=43200)](https://www.npmjs.com/package/lerna-command-gpm-import)
[![Prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://prettier.io/)
[![Conventional Commits](https://img.shields.io/badge/Conventional%20Commits-1.0.0-yellow.svg?style=flat-square)](https://conventionalcommits.org)

> import git repo like git submodule

## Usage

```bash
# 允许导入本地文件 或 远端giturl
lerna gpm-import <url_or_dir>
```

```json5
// lerna.json
{
  packages: ['packages/*'],
  extendCommands: ['@tutor/lerna-command-gpm-alias'],
  command: {
    'gpm-import': {}
  },
  version: '0.0.0',
  gpm: {}
}
```

### Options

#### `alias`

导入完成后，是否执行 gpm-alias

- Type: `boolean`
- Default: `true`

#### `bootstrap`

导入完成后，是否执行 lerna bootstrap

- Type: `boolean`
- Default: `true`

#### `remote`

Git remote name

- Type: `string`
- Default: `"origin"`

#### `branch`

Git branch name

- Type: `string`
- Default: `"master"`

#### `checkout`

Git checkout keyword, (eg. HEAD)

- Type: `string`

#### `name`

包名

- Type: `string`
- Default: 推导自 gpm `package.json`

#### `dest`

写入的文件夹

- Type: `string`
- Default: 推导自 `lerna.json` packages 配置

#### `nestedHoist`

当发生 gpm 资源嵌套，是否将嵌套 gpm 资源提升

- Type: `string`
- Default: `false`

#### `gitCloneUser`

执行 git clone 时，传入的 username；一般在需要权限的情况下传入

- Type: `string`

#### `gitCloneUserEnvName`

执行 git clone 时，传入的 username（来自于环境变量）；

- Type: `string`

#### `gitClonePassword`

执行 git clone 时，传入的 password；一般在需要权限的情况下传入

- Type: `string`

#### `gitClonePasswordEnvName`

执行 git clone 时，传入的 password（来自于环境变量）；

- Type: `string`

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
