var test = require('tape')
var blake2s = require('./blake2s')
// var fs = require('fs')

var blake2sHex = blake2s.blake2sHex

test('BLAKE2s basic', function (t) {
  // From the example computation in the RFC
  t.equal('508c5e8c327c14e2e1a72ba34eeb452f37458b209ed63a294d999b4c86675982',
    blake2sHex('abc'))
  t.equal('508c5e8c327c14e2e1a72ba34eeb452f37458b209ed63a294d999b4c86675982',
    blake2sHex(new Uint8Array([97, 98, 99])))
  t.end()
})
