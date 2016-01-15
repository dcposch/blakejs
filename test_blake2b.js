var test = require('tape')
var blake2b = require('./blake2b')
var util = require('./util')
var fs = require('fs')

var blake2bHex = blake2b.blake2bHex

test('BLAKE2b basic', function (t) {
  // From the example computation in the RFC
  t.equal('ba80a53f981c4d0d6a2797b69f12f6e94c212f14685ac4b74b12bb6fdbffa2d1' +
  '7d87c5392aab792dc252d5de4533cc9518d38aa8dbf1925ab92386edd4009923',
    blake2bHex('abc'))
  t.equal('ba80a53f981c4d0d6a2797b69f12f6e94c212f14685ac4b74b12bb6fdbffa2d1' +
  '7d87c5392aab792dc252d5de4533cc9518d38aa8dbf1925ab92386edd4009923',
    blake2bHex(new Uint8Array([97, 98, 99])))

  t.equal('786a02f742015903c6c6fd852552d272912f4740e15847618a86e217f71f5419' +
  'd25e1031afee585313896444934eb04b903a685b1448b755d56f701afe9be2ce',
    blake2bHex(''))

  t.equal('a8add4bdddfd93e4877d2746e62817b116364a1fa7bc148d95090bc7333b3673' +
  'f82401cf7aa2e4cb1ecd90296e3f14cb5413f8ed77be73045b13914cdcd6a918',
    blake2bHex('The quick brown fox jumps over the lazy dog'))

  t.end()
})

test('BLAKE2b generated test vectors', function (t) {
  var contents = fs.readFileSync('generated_test_vectors.txt', 'utf8')
  contents.split('\n').forEach(function (line) {
    if (line.length === 0) {
      return
    }
    var parts = line.split('\t')
    var inputHex = parts[0]
    var keyHex = parts[1]
    var outLen = parts[2]
    var outHex = parts[3]

    t.equal(outHex, blake2bHex(hexToBytes(inputHex), hexToBytes(keyHex), outLen))
  })
  t.end()
})

test('BLAKE2b performance', function (t) {
  var N = 1 << 22 // number of bytes to hash
  var RUNS = 3 // how often to repeat, to allow JIT to finish

  console.log('Benchmarking BLAKE2b(' + (N >> 20) + ' MB input)')
  util.testSpeed(blake2bHex, N, RUNS)
  t.end()
})

function hexToBytes (hex) {
  var ret = new Uint8Array(hex.length / 2)
  for (var i = 0; i < ret.length; i++) {
    ret[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16)
  }
  return ret
}
