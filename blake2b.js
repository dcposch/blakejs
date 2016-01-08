
// state context
/*
typedef struct {
    uint8_t b[128];                     // input buffer
    uint64_t h[8];                      // chained state
    uint64_t t[2];                      // total number of bytes
    size_t c;                           // pointer for b[]
    size_t outlen;                      // digest size
} blake2b_ctx;
*/


// Cyclic 64-bit right rotation. x0 is low 32 bits, x1 is high 32 bits
// Returns [low 32 bit output, high 32 bit output]
function ROTR64(x, y) {
  var x0 = x[0]
  var x1 = x[1]
  // uint64 rotation is NOT efficient if all you have is float64 :(
  // (JIT compilied to signed int32, but still pretty terrible)
  var o0 = (y < 32 ? x0 >> y : 0) ^
    (y > 32 ? x1 >> (y - 32) : 0) ^
    (y > 0 && y <= 32 ? x1 << (32 - y) : 0) ^
    (y > 32 ? x0 << (64 - y) : 0)
  var o1 = (y < 32 ? x1 >> y : 0) ^
    (y > 32 ? x0 >> (y - 32) : 0) ^
    (y > 32 ? x1 << (64 - y) : 0) ^
    (y > 0 && y <= 32 ? x0 << (32 - y) : 0)
  return [o0, o1]
}

// For debugging: prints out a uint64 represented as an array of two int32s
// Examples:
//  HEX64([0x4030201, 0x8070605]) = "0x0807060504030201"
//  HEX64(ROT64(0x4030201, 0x8070605, 16)) = "0x0201080706050403"
function HEX64(arr) {
  var s0 = (arr[0] >= 0 ? arr[0] : 0x100000000 + arr[0]).toString(16)
  var s1 = (arr[1] >= 0 ? arr[1] : 0x100000000 + arr[1]).toString(16)
  return "0x" +
    new Array(8 - s1.length+1).join('0') + s1 +
    new Array(8 - s0.length+1).join('0') + s0
}

// Little-endian byte access.
/*
#define B2B_GET64(p)                            \
    (((uint64_t) ((uint8_t *) (p))[0]) ^        \
    (((uint64_t) ((uint8_t *) (p))[1]) << 8) ^  \
    (((uint64_t) ((uint8_t *) (p))[2]) << 16) ^ \
    (((uint64_t) ((uint8_t *) (p))[3]) << 24) ^ \
    (((uint64_t) ((uint8_t *) (p))[4]) << 32) ^ \
    (((uint64_t) ((uint8_t *) (p))[5]) << 40) ^ \
    (((uint64_t) ((uint8_t *) (p))[6]) << 48) ^ \
    (((uint64_t) ((uint8_t *) (p))[7]) << 56))
*/

function B2B_GET32(arr, i) {
  return arr[i] ^
    (arr[i+1]<<8) ^
    (arr[i+2]<<16) ^
    (arr[i+3]<<24)
}

/**
 * Adds two little endian uint64s, arr[a,a+1], arr[b,b+1], stores in arr[x,x+1]
 * Expects arr to be a Uint32Array
 */
function AADD64(arr, a, b, x) {
  var o0 = arr[a] + arr[b]
  var o1 = arr[a+1] + arr[b+1]
  if (arr[a] + arr[b] >= 0x100000000) {
    o1++
  }
  arr[x] = o0
  arr[x+1] = o1
}

/**
 * Adds a small integer b to a little endian uint64 arr[a,a+1], stores in arr[x,x+1]
 * Expects arr to be a Uint32Array
 */
function AADD64S(arr, a, b, x) {
  var o0 = arr[a] + b
  var o1 = arr[a+1]
  if (arr[a] + b >= 0x100000000) {
    o1++
  }
  arr[x] = o0
  arr[x+1] = o1
}

function ADD64(a, b) {
  var o0 = a[0] + b[0]
  var o1 = a[1] + b[1]
  if (a[0] + b[0] >= 0x100000000) {
    o1++
  }
  return new Uint32Array([o0, o1])
}

function XOR64(a, b) {
  var o0 = a[0] ^ b[0]
  var o1 = a[1] ^ b[1]
  return new Uint32Array([o0, o1])
}

// G Mixing function.
function B2B_G(v, a, b, c, d, x, y) {
  v[a] = ADD64(ADD64(v[a], v[b]), x)
  v[d] = ROTR64(XOR64(v[d], v[a]), 32)
  v[c] = ADD64(v[c], v[d])
  v[b] = ROTR64(XOR64(v[b], v[c]), 24)
  v[a] = ADD64(ADD64(v[a], v[b]), y)
  v[d] = ROTR64(XOR64(v[d], v[a]), 16)
  v[c] = ADD64(v[c], v[d])
  v[b] = ROTR64(XOR64(v[b], v[c]), 63)
}

// Initialization Vector.
var BLAKE2B_IV32 = new Uint32Array([
  0x6A09E667, 0xF3BCC908, 0xBB67AE85, 0x84CAA73B,
  0x3C6EF372, 0xFE94F82B, 0xA54FF53A, 0x5F1D36F1,
  0x510E527F, 0xADE682D1, 0x9B05688C, 0x2B3E6C1F,
  0x1F83D9AB, 0xFB41BD6B, 0x5BE0CD19, 0x137E2179
])

var BLAKE2B_IV64 = []
for(var i = 0; i < BLAKE2B_IV32.length; i += 2) {
  BLAKE2B_IV64.push([BLAKE2B_IV32[i+1], BLAKE2B_IV32[i]])
}

var SIGMA8 = new Uint8Array([
  0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
  14, 10, 4, 8, 9, 15, 13, 6, 1, 12, 0, 2, 11, 7, 5, 3,
  11, 8, 12, 0, 5, 2, 15, 13, 10, 14, 3, 6, 7, 1, 9, 4,
  7, 9, 3, 1, 13, 12, 11, 14, 2, 6, 5, 10, 4, 0, 15, 8,
  9, 0, 5, 7, 2, 4, 10, 15, 14, 1, 11, 12, 6, 8, 3, 13,
  2, 12, 6, 10, 0, 11, 8, 3, 4, 13, 7, 5, 15, 14, 1, 9,
  12, 5, 1, 15, 14, 13, 4, 10, 0, 7, 6, 3, 9, 2, 8, 11,
  13, 11, 7, 14, 12, 1, 3, 9, 5, 0, 15, 4, 8, 6, 2, 10,
  6, 15, 14, 9, 11, 3, 0, 8, 12, 2, 13, 7, 1, 4, 10, 5,
  10, 2, 8, 4, 7, 6, 1, 5, 15, 11, 9, 14, 3, 12, 13, 0,
  0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
  14, 10, 4, 8, 9, 15, 13, 6, 1, 12, 0, 2, 11, 7, 5, 3,
])


// Compression function. "last" flag indicates last block.
function blake2b_compress(ctx, last) {
  var i = 0
  var v = new Array(16)
  var m = new Array(16)

  // init work variables
  for (i = 0; i < 8; i++) {
    v[i] = ctx.h[i]
    v[i + 8] = BLAKE2B_IV64[i];
  }

  // low 64 bits of offset
  v[12] = XOR64(v[12], ctx.t)
  // high 64 bits
  //v[13] = XOR64(v[13], ctx.t[1])
  // last block flag set ?
  if (last) {
    v[14][0] = ~v[14][0]
    v[14][1] = ~v[14][1]
  }

  // get little-endian words
  for (i = 0; i < 16; i++) {
    m[i] = [
      B2B_GET32(ctx.b, 8 * i),
      B2B_GET32(ctx.b, 8 * i + 4)
    ]
  }

  // twelve rounds of mixing
  for (i = 0; i < 12; i++) {
    B2B_G(v, 0, 4,  8, 12, m[SIGMA8[i*16 + 0]], m[SIGMA8[i*16 + 1]]);
    B2B_G(v, 1, 5,  9, 13, m[SIGMA8[i*16 + 2]], m[SIGMA8[i*16 + 3]]);
    B2B_G(v, 2, 6, 10, 14, m[SIGMA8[i*16 + 4]], m[SIGMA8[i*16 + 5]]);
    B2B_G(v, 3, 7, 11, 15, m[SIGMA8[i*16 + 6]], m[SIGMA8[i*16 + 7]]);
    B2B_G(v, 0, 5, 10, 15, m[SIGMA8[i*16 + 8]], m[SIGMA8[i*16 + 9]]);
    B2B_G(v, 1, 6, 11, 12, m[SIGMA8[i*16 +10]], m[SIGMA8[i*16 +11]]);
    B2B_G(v, 2, 7,  8, 13, m[SIGMA8[i*16 +12]], m[SIGMA8[i*16 +13]]);
    B2B_G(v, 3, 4,  9, 14, m[SIGMA8[i*16 +14]], m[SIGMA8[i*16 +15]]);
  }

  for (i = 0; i < 8; i++) {
    ctx.h[i] = XOR64(ctx.h[i], XOR64(v[i], v[i + 8]))
  }
}

// Initialize the hashing context with optional key "key"
// Returns a newly created context
function blake2b_init(outlen, key) {
  if (outlen == 0 || outlen > 64) {
    throw new Error('Illegal output length, expected 0 < length <= 64')
  }
  if (key && key.length > 64) {
    throw new Error('Illegal key, expected Uint8Array with 0 < length <= 64')
  }

  // state, "param block"
  var ctx = {
    b: new Uint8Array(128),
    h: new Array(8),
    t: 0, // input count
    c: 0, // pointer within buffer
    outlen: outlen // output length in bytes
  }

  // initialize hash state
  for (var i = 0; i < 8; i++) {
    ctx.h[i] = BLAKE2B_IV64[i]
  }
  var keylen = key ? key.length : 0
  ctx.h[0] = XOR64(ctx.h[0], [0x01010000 ^ (keylen << 8) ^ outlen, 0])

  // key the hash, if applicable
  if (key) {
    blake2b_update(ctx, key)
    // at the end
    ctx.c = 128
  }

  return ctx
}

// Add "in" into the hash. Expects a Uint8Array
function blake2b_update(ctx, input) {
  for (var i = 0; i < input.length; i++) {
    if (ctx.c === 128) {             // buffer full ?
        ctx.t += ctx.c               // add counters
        blake2b_compress(ctx, false) // compress (not last)
        ctx.c = 0                    // counter to zero
    }
    ctx.b[ctx.c++] = input[i];
  }
}

// Generate the message digest.
// Returns a Uint8Array
function blake2b_final(ctx) {
  ctx.t += ctx.c              // mark last block offset

  while (ctx.c < 128) {       // fill up with zeros
    ctx.b[ctx.c++] = 0
  }
  blake2b_compress(ctx, true) // final block flag = 1

  // little endian convert and store
  var out = new Uint8Array(ctx.outlen)
  for (var i = 0; i < ctx.outlen; i++) {
    out[i] = (ctx.h[i >> 3] >> (8 * (i & 7))) & 0xFF;
  }
  return out
}

// Convenience function for all-in-one computation.
// Returns a outlen-byte Uint8Array
function blake2b(outlen, key, input) {
  var ctx = blake2b_init(outlen, key)
  blake2b_update(ctx, input)
  return blake2b_final(ctx)
}

// More convenient convenience function
// Input string must be ASCII. Returns 32 byte hex digest.
function blake2bStringToHex(str, outlen) {
  var input = new Uint8Array(str.length)
  for (var i = 0; i < str.length; i++) {
    if (str.charCodeAt(i) > 255) {
      throw new Error('Input string must be ASCII')
    }
    input[i] = str.charCodeAt(i)
  }
  var output = blake2b(32, null, input)
  return Array.prototype.map.call(output, function(n) {
    return (n < 16 ? '0' : '') + n.toString(16)
  }).join('')
}

module.exports = {
  blake2b: blake2b,
  blake2bStringToHex: blake2bStringToHex
}
