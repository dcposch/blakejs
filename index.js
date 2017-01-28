var b2b = require('./blake2b')
var b2s = require('./blake2s')

module.exports = {
  blake2b: b2b.blake2b,
  blake2bHex: b2b.blake2bHex,
  blake2b_init: b2b.blake2b_init,
  blake2b_update: b2b.blake2b_update,
  blake2b_final: b2b.blake2b_final,
  blake2s: b2s.blake2s,
  blake2sHex: b2s.blake2sHex,
  blake2s_init: b2s.blake2s_init,
  blake2s_update: b2s.blake2s_update,
  blake2s_final: b2s.blake2s_final
}
