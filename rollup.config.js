const pkg = require('./package.json')

export default {
  input: 'index.js',
  output: [
    {
      file: pkg['module'],
      format: 'es'
    },
    {
      file: pkg['main'],
      format: 'umd',
      name: 'blakejs'
    }
  ]
}
