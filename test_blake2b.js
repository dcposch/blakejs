var test = require('tape')
var blake2b = require('./blake2b')

var blake2bHex = blake2b.blake2bHex
var ROTR64 = blake2b.test.ROTR64
var ADD64 = blake2b.test.ADD64
var XOR64 = blake2b.test.XOR64

test('ROTR64', function (t) {
  t.equal('0x0807060504030201', HEX64(ROTR64([0x4030201, 0x8070605], 0)))
  t.equal('0x0201080706050403', HEX64(ROTR64([0x4030201, 0x8070605], 16)))
  t.equal('0x4030201080706050', HEX64(ROTR64([0x4030201, 0x8070605], 28)))
  t.equal('0x1080706050403020', HEX64(ROTR64([0x4030201, 0x8070605], 4)))
  t.equal('0x0403020108070605', HEX64(ROTR64([0x4030201, 0x8070605], 32)))
  t.equal('0x8070605040302010', HEX64(ROTR64([0x4030201, 0x8070605], 60)))
  t.equal('0x7772fc2886a76c5f', HEX64(ROTR64([0x6c5f7772, 0xfc2886a7], 16)))
  t.end()
})

test('ADD64', function (t) {
  t.equal('0x0000000200000000', HEX64(ADD64([0xffffffff, 1], [1, 0])))
  t.equal('0x00000002fffffffe', HEX64(ADD64([0xffffffff, 1], [0xffffffff, 0])))
  t.equal('0x76eb1310ddd333a0', HEX64(ADD64([0xF3BCC908, 0x6A09E667], [0xEA166A98, 0x0CE12CA8])))
  t.equal('0x76eb1310ddd333a0', HEX64(ADD64([-205731576, 1779033703], [-367629672, 216083624])))
  t.end()
})

test('XOR64', function (t) {
  t.equal('0x0000000600000002', HEX64(XOR64([1, 2], [3, 4])))
  t.equal('0x1234567812121212', HEX64(XOR64([0x10101010, 0x12005600], [0x02020202, 0x00340078])))
  t.end()
})

test('BLAKE2b', function (t) {
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

// Prints out a uint64 represented as an array of two uint32s
// Examples:
//  HEX64([0x4030201, 0x8070605]) = '0x0807060504030201'
//  HEX64(ROT64(0x4030201, 0x8070605, 16)) = '0x0201080706050403'
function HEX64 (arr) {
  var s0 = (arr[0] >= 0 ? arr[0] : 0x100000000 + arr[0]).toString(16)
  var s1 = (arr[1] >= 0 ? arr[1] : 0x100000000 + arr[1]).toString(16)
  return '0x' +
    new Array(8 - s1.length + 1).join('0') + s1 +
    new Array(8 - s0.length + 1).join('0') + s0
}
