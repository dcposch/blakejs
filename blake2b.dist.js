// Blake2B in pure Javascript
// Adapted from the reference implementation in RFC7693
// Ported to Javascript by DC - https://github.com/dcposch

const ERROR_MSG_INPUT = 'Input must be an string, Buffer or Uint8Array'

/**
 * TextEncoder polyfill for environments that don't support it natively
 * @class
 */
class TextEncoderPolyfill {
	constructor() {
	  this.encoding = 'utf-8';
	}

	/**
	 * Encodes a string into Uint8Array
	 * @param {string} str - The string to encode
	 * @returns {Uint8Array} Encoded bytes
	 */
	encode(str) {
	  const len = str.length;
	  const res = new Uint8Array(len * 3); // Worst case: 3 bytes per char
	  let pos = 0;
	  
	  for (let i = 0; i < len; i++) {
	    const code = str.charCodeAt(i);
	    
	    if (code <= 0x7F) {
	      res[pos++] = code;
	    } else if (code <= 0x7FF) {
	      res[pos++] = 0xC0 | (code >> 6);
	      res[pos++] = 0x80 | (code & 0x3F);
	    } else if (code >= 0xD800 && code <= 0xDFFF) {
	      // Surrogate pair
	      if (++i >= len) throw new Error('Invalid string');
	      const code2 = str.charCodeAt(i);
	      const fullCode = 0x10000 + ((code & 0x3FF) << 10) + (code2 & 0x3FF);
	      res[pos++] = 0xF0 | (fullCode >> 18);
	      res[pos++] = 0x80 | ((fullCode >> 12) & 0x3F);
	      res[pos++] = 0x80 | ((fullCode >> 6) & 0x3F);
	      res[pos++] = 0x80 | (fullCode & 0x3F);
	    } else {
	      res[pos++] = 0xE0 | (code >> 12);
	      res[pos++] = 0x80 | ((code >> 6) & 0x3F);
	      res[pos++] = 0x80 | (code & 0x3F);
	    }
	  }
	  
	  return res.subarray(0, pos);
	}
}


/**
 * Normalizes input to Uint8Array
 * @param {string|Buffer|Uint8Array} input - Input to normalize
 * @returns {Uint8Array} Normalized byte array
 * @throws {Error} If input type is invalid
 */
function normalizeInput(input) {
	let ret;
	if (input instanceof Uint8Array) {
	  ret = input;
	} else if (typeof input === 'string') {
	  const encoder = typeof TextEncoder !== 'undefined' ? 
	    new TextEncoder() : 
	    new TextEncoderPolyfill();
	  ret = encoder.encode(input);
	} else if (input && typeof input === 'object' && 'length' in input) {
	  // Handle array-like objects (including Node.js Buffer)
	  ret = new Uint8Array(input.length);
	  for (let i = 0; i < input.length; i++) {
	    ret[i] = input[i] & 0xFF;
	  }
	} else {
	  throw new Error(ERROR_MSG_INPUT);
	}
	return ret;
}


/**
 * Converts Uint8Array/bytes to hexadecimal string
 * For example, toHex([255, 0, 255]) returns "ff00ff"
 * @param {Uint8Array} bytes - Bytes to convert
 * @returns {string} Hexadecimal representation
 */
function toHex(bytes) {
	return Array.prototype.map
	  .call(bytes, function(n) {
	    return (n < 16 ? '0' : '') + n.toString(16);
	  })
	  .join('');
}


/**
 * Debug function to print hash state in the same format as the RFC
 * sample computation exactly, so that you can diff
 * @param {string} label - Label for debug output
 * @param {Array} arr - Array to print
 * @param {number} size - Word size (32 or 64)
 * @throws {Error} If invalid size is provided
 */
function debugPrint(label, arr, size) {
	let msg = '\n' + label + ' = ';
	for (let i = 0; i < arr.length; i += 2) {
	  if (size === 32) {
	    msg += uint32ToHex(arr[i]).toUpperCase();
	    msg += ' ';
	    msg += uint32ToHex(arr[i + 1]).toUpperCase();
	  } else if (size === 64) {
	    msg += uint32ToHex(arr[i + 1]).toUpperCase();
	    msg += uint32ToHex(arr[i]).toUpperCase();
	  } else throw new Error('Invalid size ' + size);
	  if (i % 6 === 4) {
	    msg += '\n' + new Array(label.length + 4).join(' ');
	  } else if (i < arr.length - 2) {
	    msg += ' ';
	  }
	}
	console.log(msg);
}


/**
 * Converts uint32 to hex string
 * Helper function for debugPrint
 * @param {number} value - 32-bit unsigned integer
 * @returns {string} 8-character hex string
 */
function uint32ToHex(value) {
	return ('0000000' + value.toString(16)).slice(-8);
}


/**
 * Performance testing function: generates N bytes of input, hashes M times
 * Measures and prints MB/second hash performance each time
 * @param {function} hashFn - Hash function to test
 * @param {number} N - Number of bytes to generate
 * @param {number} M - Number of times to hash
 */
function testSpeed(hashFn, N, M) {
	const getTime = typeof Date.now === 'function' ? 
	  Date.now.bind(Date) : 
	  function() { return new Date().getTime(); };
	  
	let startMs = getTime();

	const input = new Uint8Array(N);
	for (let i = 0; i < N; i++) {
	  input[i] = i % 256;
	}
	const genMs = getTime();
	console.log('Generated random input in ' + (genMs - startMs) + 'ms');
	startMs = genMs;

	for (let i = 0; i < M; i++) {
	  const hashHex = hashFn(input);
	  const hashMs = getTime();
	  const ms = hashMs - startMs;
	  startMs = hashMs;
	  console.log('Hashed in ' + ms + 'ms: ' + hashHex.substring(0, 20) + '...');
	  console.log(
	    Math.round((N / (1 << 20) / (ms / 1000)) * 100) / 100 + ' MB PER SECOND'
	  );
	}
}


/**
 * 64-bit unsigned addition of two array elements.
 * Sets v[a,a+1] += v[b,b+1]
 * @param {Uint32Array} v - Array to modify
 * @param {number} a - Index of first element
 * @param {number} b - Index of second element
 */
function ADD64AA(v, a, b) {
	const o0 = v[a] + v[b];
	let o1 = v[a + 1] + v[b + 1];
	if (o0 >= 0x100000000) {
	  o1++;
	}
	v[a] = o0;
	v[a + 1] = o1;
}


/**
 * 64-bit unsigned addition of array element and constants.
 * Sets v[a,a+1] += b
 * @param {Uint32Array} v - Array to modify
 * @param {number} a - Index of element to modify
 * @param {number} b0 - Low 32 bits of b
 * @param {number} b1 - High 32 bits
 */
function ADD64AC(v, a, b0, b1) {
	let o0 = v[a] + b0;
	if (b0 < 0) {
	  o0 += 0x100000000;
	}
	let o1 = v[a + 1] + b1;
	if (o0 >= 0x100000000) {
	  o1++;
	}
	v[a] = o0;
	v[a + 1] = o1;
}


/**
 * Gets 32-bit value from byte array (little-endian)
 * @param {Uint8Array} arr - Byte array
 * @param {number} i - Starting index
 * @returns {number} 32-bit value
 */
function B2B_GET32(arr, i) {
	return arr[i] ^ (arr[i + 1] << 8) ^ (arr[i + 2] << 16) ^ (arr[i + 3] << 24);
}


/**
 * BLAKE2B G Mixing function, The ROTRs are inlined for speed
 * @param {number} a - First index
 * @param {number} b - Second index
 * @param {number} c - Third index
 * @param {number} d - Fourth index
 * @param {number} ix - Message index 1
 * @param {number} iy - Message index 2
 */
function B2B_G(a, b, c, d, ix, iy) {
	const x0 = m[ix];
	const x1 = m[ix + 1];
	const y0 = m[iy];
	const y1 = m[iy + 1];

	ADD64AA(v, a, b); // v[a,a+1] += v[b,b+1] ... in JS we must store a uint64 as two uint32s
	ADD64AC(v, a, x0, x1); // v[a, a+1] += x ... x0 is the low 32 bits of x, x1 is the high 32 bits

	// v[d,d+1] = (v[d,d+1] xor v[a,a+1]) rotated to the right by 32 bits
	let xor0 = v[d] ^ v[a];
	let xor1 = v[d + 1] ^ v[a + 1];
	v[d] = xor1;
	v[d + 1] = xor0;

	ADD64AA(v, c, d);

	// v[b,b+1] = (v[b,b+1] xor v[c,c+1]) rotated right by 24 bits
	xor0 = v[b] ^ v[c];
	xor1 = v[b + 1] ^ v[c + 1];
	v[b] = (xor0 >>> 24) ^ (xor1 << 8);
	v[b + 1] = (xor1 >>> 24) ^ (xor0 << 8);

	ADD64AA(v, a, b);
	ADD64AC(v, a, y0, y1);

	// v[d,d+1] = (v[d,d+1] xor v[a,a+1]) rotated right by 16 bits
	xor0 = v[d] ^ v[a];
	xor1 = v[d + 1] ^ v[a + 1];
	v[d] = (xor0 >>> 16) ^ (xor1 << 16);
	v[d + 1] = (xor1 >>> 16) ^ (xor0 << 16);

	ADD64AA(v, c, d);

	// v[b,b+1] = (v[b,b+1] xor v[c,c+1]) rotated right by 63 bits
	xor0 = v[b] ^ v[c];
	xor1 = v[b + 1] ^ v[c + 1];
	v[b] = (xor1 >>> 31) ^ (xor0 << 1);
	v[b + 1] = (xor0 >>> 31) ^ (xor1 << 1);
}

// Initialization Vector
const BLAKE2B_IV32 = new Uint32Array([
	0xf3bcc908, 0x6a09e667, 0x84caa73b, 0xbb67ae85, 0xfe94f82b, 0x3c6ef372,
	0x5f1d36f1, 0xa54ff53a, 0xade682d1, 0x510e527f, 0x2b3e6c1f, 0x9b05688c,
	0xfb41bd6b, 0x1f83d9ab, 0x137e2179, 0x5be0cd19
]);

const SIGMA8 = [
	0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 14, 10, 4, 8, 9, 15, 13,
	6, 1, 12, 0, 2, 11, 7, 5, 3, 11, 8, 12, 0, 5, 2, 15, 13, 10, 14, 3, 6, 7, 1,
	9, 4, 7, 9, 3, 1, 13, 12, 11, 14, 2, 6, 5, 10, 4, 0, 15, 8, 9, 0, 5, 7, 2, 4,
	10, 15, 14, 1, 11, 12, 6, 8, 3, 13, 2, 12, 6, 10, 0, 11, 8, 3, 4, 13, 7, 5,
	15, 14, 1, 9, 12, 5, 1, 15, 14, 13, 4, 10, 0, 7, 6, 3, 9, 2, 8, 11, 13, 11, 7,
	14, 12, 1, 3, 9, 5, 0, 15, 4, 8, 6, 2, 10, 6, 15, 14, 9, 11, 3, 0, 8, 12, 2,
	13, 7, 1, 4, 10, 5, 10, 2, 8, 4, 7, 6, 1, 5, 15, 11, 9, 14, 3, 12, 13, 0, 0,
	1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 14, 10, 4, 8, 9, 15, 13, 6,
	1, 12, 0, 2, 11, 7, 5, 3
];

// These are offsets into a uint64 buffer.
// Multiply them all by 2 to make them offsets into a uint32 buffer,
// because this is Javascript and we don't have uint64s
const SIGMA82 = new Uint8Array(
	SIGMA8.map(function(x) {
	  return x * 2;
	})
);

// Compression function. 'last' flag indicates last block.
// Note we're representing 16 uint64s as 32 uint32s
const v = new Uint32Array(32);
const m = new Uint32Array(32);
/**
 * BLAKE2B compression function
 * @param {Object} ctx - Hash context
 * @param {boolean} last - Whether this is the last block
 */
function blake2bCompress(ctx, last) {
	let i = 0;

	// init work variables
	for (i = 0; i < 16; i++) {
	  v[i] = ctx.h[i];
	  v[i + 16] = BLAKE2B_IV32[i];
	}

	// low 64 bits of offset
	v[24] = v[24] ^ ctx.t;
	v[25] = v[25] ^ (ctx.t / 0x100000000);
	// high 64 bits not supported, offset may not be higher than 2**53-1

	// last block flag set ?
	if (last) {
	  v[28] = ~v[28];
	  v[29] = ~v[29];
	}

	// get little-endian words
	for (i = 0; i < 32; i++) {
	  m[i] = B2B_GET32(ctx.b, 4 * i);
	}

	// twelve rounds of mixing
	// uncomment the DebugPrint calls to log the computation
	// and match the RFC sample documentation
	// debugPrint('          m[16]', m, 64)
	for (i = 0; i < 12; i++) {
	  // debugPrint('   (i=' + (i < 10 ? ' ' : '') + i + ') v[16]', v, 64)
	  B2B_G(0, 8, 16, 24, SIGMA82[i * 16 + 0], SIGMA82[i * 16 + 1]);
	  B2B_G(2, 10, 18, 26, SIGMA82[i * 16 + 2], SIGMA82[i * 16 + 3]);
	  B2B_G(4, 12, 20, 28, SIGMA82[i * 16 + 4], SIGMA82[i * 16 + 5]);
	  B2B_G(6, 14, 22, 30, SIGMA82[i * 16 + 6], SIGMA82[i * 16 + 7]);
	  B2B_G(0, 10, 20, 30, SIGMA82[i * 16 + 8], SIGMA82[i * 16 + 9]);
	  B2B_G(2, 12, 22, 24, SIGMA82[i * 16 + 10], SIGMA82[i * 16 + 11]);
	  B2B_G(4, 14, 16, 26, SIGMA82[i * 16 + 12], SIGMA82[i * 16 + 13]);
	  B2B_G(6, 8, 18, 28, SIGMA82[i * 16 + 14], SIGMA82[i * 16 + 15]);
	}
	// debugPrint('   (i=12) v[16]', v, 64)

	for (i = 0; i < 16; i++) {
	  ctx.h[i] = ctx.h[i] ^ v[i] ^ v[i + 16];
	}
	// debugPrint('h[8]', ctx.h, 64)
}

// reusable parameterBlock
const parameterBlock = new Uint8Array([
	0, 0, 0, 0, //  0: outlen, keylen, fanout, depth
	0, 0, 0, 0, //  4: leaf length, sequential mode
	0, 0, 0, 0, //  8: node offset
	0, 0, 0, 0, // 12: node offset
	0, 0, 0, 0, // 16: node depth, inner length, rfu
	0, 0, 0, 0, // 20: rfu
	0, 0, 0, 0, // 24: rfu
	0, 0, 0, 0, // 28: rfu
	0, 0, 0, 0, // 32: salt
	0, 0, 0, 0, // 36: salt
	0, 0, 0, 0, // 40: salt
	0, 0, 0, 0, // 44: salt
	0, 0, 0, 0, // 48: personal
	0, 0, 0, 0, // 52: personal
	0, 0, 0, 0, // 56: personal
	0, 0, 0, 0  // 60: personal
]);


/**
 * Initializes BLAKE2B hash context
 * @param {number} outlen - Output length in bytes (1-64)
 * @param {Uint8Array} [key] - Optional key
 * @param {Uint8Array} [salt] - Optional salt (16 bytes)
 * @param {Uint8Array} [personal] - Optional personalization (16 bytes)
 * @returns {Object} Hash context
 * @throws {Error} If parameters are invalid
 */
function blake2bInit(outlen, key, salt, personal) {
	if (outlen === 0 || outlen > 64) {
	  throw new Error('Illegal output length, expected 0 < length <= 64');
	}
	if (key && key.length > 64) {
	  throw new Error('Illegal key, expected Uint8Array with 0 < length <= 64');
	}
	if (salt && salt.length !== 16) {
	  throw new Error('Illegal salt, expected Uint8Array with length is 16');
	}
	if (personal && personal.length !== 16) {
	  throw new Error('Illegal personal, expected Uint8Array with length is 16');
	}

	// state, 'param block'
	const ctx = {
	  b: new Uint8Array(128),
	  h: new Uint32Array(16),
	  t: 0, // input count
	  c: 0, // pointer within buffer
	  outlen: outlen // output length in bytes
	};

	// initialize parameterBlock before usage
	parameterBlock.fill(0);
	parameterBlock[0] = outlen;
	if (key) parameterBlock[1] = key.length;
	parameterBlock[2] = 1; // fanout
	parameterBlock[3] = 1; // depth
	if (salt) parameterBlock.set(salt, 32);
	if (personal) parameterBlock.set(personal, 48);

	// initialize hash state
	for (let i = 0; i < 16; i++) {
	  ctx.h[i] = BLAKE2B_IV32[i] ^ B2B_GET32(parameterBlock, i * 4);
	}

	// key the hash, if applicable
	if (key) {
	  blake2bUpdate(ctx, key);
	  // at the end
	  ctx.c = 128;
	}

	return ctx;
}


/**
 * Updates hash context with new input
 * @param {Object} ctx - Hash context
 * @param {Uint8Array} input - Input bytes
 */
function blake2bUpdate(ctx, input) {
	for (let i = 0; i < input.length; i++) {
	  if (ctx.c === 128) {
	    // buffer full ?
	    ctx.t += ctx.c; // add counters
	    blake2bCompress(ctx, false); // compress (not last)
	    ctx.c = 0; // counter to zero
	  }
	  ctx.b[ctx.c++] = input[i];
	}
}


/**
 * Finalizes hash computation
 * @param {Object} ctx - Hash context
 * @returns {Uint8Array} Hash result
 */
function blake2bFinal(ctx) {
	ctx.t += ctx.c; // mark last block offset

	while (ctx.c < 128) {
	  // fill up with zeros
	  ctx.b[ctx.c++] = 0;
	}
	blake2bCompress(ctx, true); // final block flag = 1

	// little endian convert and store
	const out = new Uint8Array(ctx.outlen);
	for (let i = 0; i < ctx.outlen; i++) {
	  out[i] = ctx.h[i >> 2] >> (8 * (i & 3));
	}
	return out;
}


/**
 * Computes BLAKE2B hash
 * @param {string|Buffer|Uint8Array} input - Input to hash
 * @param {Uint8Array} [key] - Optional key
 * @param {number} [outlen=64] - Output length in bytes
 * @param {string|Buffer|Uint8Array} [salt] - Optional salt
 * @param {string|Buffer|Uint8Array} [personal] - Optional personalization
 * @returns {Uint8Array} Hash result
 */
function blake2b(input, key, outlen, salt, personal) {
	// preprocess inputs
	outlen = outlen || 64;
	input = normalizeInput(input);
	if (salt) {
	  salt = normalizeInput(salt);
	}
	if (personal) {
	  personal = normalizeInput(personal);
	}

	// do the math
	const ctx = blake2bInit(outlen, key, salt, personal);
	blake2bUpdate(ctx, input);
	return blake2bFinal(ctx);
}


/**
 * Computes BLAKE2B hash and returns as hex string
 * @param {string|Buffer|Uint8Array} input - Input to hash
 * @param {Uint8Array} [key] - Optional key
 * @param {number} [outlen=64] - Output length in bytes
 * @param {string|Buffer|Uint8Array} [salt] - Optional salt
 * @param {string|Buffer|Uint8Array} [personal] - Optional personalization
 * @returns {string} Hexadecimal hash string
 */
function blake2bHex(input, key, outlen, salt, personal) {
	const output = blake2b(input, key, outlen, salt, personal);
	return toHex(output);
}


/**
 * BLAKE2B hash functions and utilities
 * @namespace
 */
const Blake = {
	utils: { normalizeInput, toHex, debugPrint, testSpeed },
	blake2b,
	blake2bHex,
	blake2bInit,
	blake2bUpdate,
	blake2bFinal
};

if (typeof module !== 'undefined' && module.exports) {
	module.exports = Blake;
} else if (typeof define === 'function' && define.amd) {
	define([], function() { return Blake; });
} else if (typeof globalThis !== 'undefined') {
	globalThis.Blake = Blake;
} else if (typeof window !== 'undefined') {
	window.Blake = Blake;
} else if (typeof self !== 'undefined') {
	self.Blake = Blake;
}