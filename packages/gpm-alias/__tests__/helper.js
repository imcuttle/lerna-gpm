/**
 * @file helper
 */

const nps = require('path')

exports.fixture = function fixture(...args) {
  return nps.join.apply(nps, [__dirname, 'fixture'].concat(...args))
}
