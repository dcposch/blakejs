BLAKE.js
====

Pure Javascript implementation of the BLAKE2B hash function.

```js
var Blake = require('blake')

// prints 00000000000000000000000000000000000000000000000000000000000000
console.log(Blake.blake2bStringToHex('hello world'))

// ascii values for 'hello world'
var input = new Uint8Array([104, 101, 108, 108, 111, 32, 119, 111, 114, 108, 100])
var output = Blake.blake2b(input)
var hex = Array.prototype.map.call(output, function(n) {
  return (n < 16 ? '0' : '') + n.toString(16)
}).join('')

// prints the same thing again
console.log(hex)
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
