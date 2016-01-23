var b2b = require('./a.out.o3opt.js')

function blake2b (val, key, outlen) {
  if (typeof val === 'string') {
    val = new Buffer(val, 'utf8')
  }
  outlen = +outlen || 64
  var inlen = val.length
  var keylen = key ? key.length : 0

  // copy inputs to emscripten heap
  var pout = b2b._malloc(outlen)
  var pkey = key ? b2b._malloc(keylen) : 0
  var pin = b2b._malloc(inlen)
  if (key) {
    b2b.writeArrayToMemory(key, pkey)
  }
  b2b.writeArrayToMemory(val, pin)

  // invoke blake2b
  b2b._blake2b(pout, outlen, pkey, keylen, pin, inlen)

  // copy outputs from heap
  var ret = new Buffer(b2b.HEAPU8.slice(pout, pout + outlen))
  b2b._free(pout)
  b2b._free(pin)
  if (key) {
    b2b._free(pkey)
  }

  return ret
}

function blake2bHex (val, key, outlen) {
  return blake2b(val, key, outlen).toString('hex')
}

module.exports = {
  blake2b: blake2b,
  blake2bHex: blake2bHex
}
