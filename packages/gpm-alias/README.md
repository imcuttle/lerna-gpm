# lerna-command-gpm-alias

[![NPM version](https://img.shields.io/npm/v/lerna-command-gpm-alias.svg?style=flat-square)](https://www.npmjs.com/package/lerna-command-gpm-alias)
[![NPM Downloads](https://img.shields.io/npm/dm/lerna-command-gpm-alias.svg?style=flat-square&maxAge=43200)](https://www.npmjs.com/package/lerna-command-gpm-alias)
[![Prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://prettier.io/)
[![Conventional Commits](https://img.shields.io/badge/Conventional%20Commits-1.0.0-yellow.svg?style=flat-square)](https://conventionalcommits.org)

> Alias GPM Package

## Usage

```bash
lerna gpm-alias
```

```json5
// lerna.json
{
  packages: ['packages/*'],
  extendCommands: ['@tutor/lerna-command-gpm-alias'],
  command: {
    'gpm-alias': {
      // be default
      aliasTypes: ['link', 'ts-js-config']
    }
  },
  version: '0.0.0',
  gpm: {}
}
```

### Options

#### `aliasTypes`

gpm 资源链接方式；`link` 为使用软链方式，链接至 node_modules/PKG_NAME；`ts-js-config` 为修改 `tsconfig` 和 `jsconfig`

- Type: `Array<'link' | 'ts-js-config'>`
- Default: `['link', 'ts-js-config']`

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

This library is written and maintained by [imcuttle](mailto:yucong@yuanfudao.com).

## License

MIT - [imcuttle](mailto:yucong@yuanfudao.com)
