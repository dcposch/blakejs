BLAKE.js
====

Pure Javascript implementation of the BLAKE2B hash function.

```js
var Blake = require('blake')
console.log(Blake.blake2bHex('hello world'))
// prints ba80a53f981c4d0d6a2797b69f12f6e94c212f14685ac4b74b12bb6fdbffa2d17d87c5392aab792dc252d5de4533cc9518d38aa8dbf1925ab92386edd4009923
```

API
---
Exports two functions:

```js
// Computes the BLAKE2B hash of a string or byte array, and returns a Uint8Array
//
// Returns a n-byte Uint8Array
//
// Parameters:
// - input - the input bytes, as a Uint8Array or ASCII string
// - key - optional key, either a 32 or 64-byte Uint8Array
// - outlen - optional output length in bytes, default 64
function blake2b(input, key, outlen) {
    [...]
}

// Computes the BLAKE2B hash of a string or byte array
//
// Returns an n-byte hash in hex, all lowercase
//
// Parameters:
// - input - the input bytes, as a Uint8Array or ASCII string
// - outlen - optional output length in bytes, default 64
function blake2bHex(input, outlen) {
    [...]
}
```

Limitations
---
* Can only handle up to 2**53 bytes of input

Performance
---
```
¯\_(ツ)_/¯
```

License
---
Creative Commons CC0. Ported from the reference C implementation in
[RFC 7693](https://tools.ietf.org/html/rfc7693).
