/**
 * @file helper
 */

const nps = require('path')

export function fixture(...args) {
  return nps.join.apply(nps, [__dirname, 'fixture'].concat(...args))
}

