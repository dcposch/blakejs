
function testROTR64() {
  assertEquals('0x0807060504030201', HEX64(ROTR64([0x4030201, 0x8070605], 0)))
  assertEquals('0x0201080706050403', HEX64(ROTR64([0x4030201, 0x8070605], 16)))
  assertEquals('0x4030201080706050', HEX64(ROTR64([0x4030201, 0x8070605], 28)))
  assertEquals('0x1080706050403020', HEX64(ROTR64([0x4030201, 0x8070605], 4)))
  assertEquals('0x0403020108070605', HEX64(ROTR64([0x4030201, 0x8070605], 32)))
  assertEquals('0x8070605040302010', HEX64(ROTR64([0x4030201, 0x8070605], 60)))
  assertEquals('0x7772fc2886a76c5f', HEX64(ROTR64([0x6c5f7772, 0xfc2886a7], 16)))
}

function testADD64() {
  assertEquals('0x0000000200000000', HEX64(ADD64([0xffffffff, 1], [1, 0])))
  assertEquals('0x00000002fffffffe', HEX64(ADD64([0xffffffff, 1], [0xffffffff, 0])))
  assertEquals('0x76eb1310ddd333a0', HEX64(ADD64([0xF3BCC908, 0x6A09E667], [0xEA166A98, 0x0CE12CA8])))
  assertEquals('0x76eb1310ddd333a0', HEX64(ADD64([-205731576, 1779033703], [-367629672, 216083624])))
}

function testXOR64() {
  assertEquals('0x0000000600000002', HEX64(XOR64([1, 2], [3, 4])))
  assertEquals('0x1234567812121212', HEX64(XOR64([0x10101010, 0x12005600], [0x02020202, 0x00340078])))
}

function testBLAKE2B() {
  // From the example computation in the RFC
  assertEquals('ba80a53f981c4d0d6a2797b69f12f6e94c212f14685ac4b74b12bb6fdbffa2d1' +
    '7d87c5392aab792dc252d5de4533cc9518d38aa8dbf1925ab92386edd4009923',
    blake2bHex('abc'))
  assertEquals('ba80a53f981c4d0d6a2797b69f12f6e94c212f14685ac4b74b12bb6fdbffa2d1' +
    '7d87c5392aab792dc252d5de4533cc9518d38aa8dbf1925ab92386edd4009923',
    blake2bHex(new Uint8Array([97,98,99])))
}

function assertEquals(expected, actual) {
  if (expected !== actual) {
    throw new Error('Expected ' + expected + ' found ' + actual)
  }
}

function main() {
  var numPassed = 0, numFailed = 0
  for (var name in this) {
    if (typeof(this[name]) !== 'function') {
      continue
    }
    if (!this[name].name.startsWith('test')) {
      continue
    }
    console.log('\nTESTING ' + this[name].name)

    try {
      this[name]()
      numPassed++
    } catch (e) {
      console.error(e)
      numFailed++
    }
  }
  if (numFailed === 0) {
    console.log('\n' + numPassed + ' tests run, all passed!')
    process.exit(0)
  } else {
    console.log('\n' + numFailed + '/' + (numPassed + numFailed) + ' tests failed')
    process.exit(1)
  }
}

main()
