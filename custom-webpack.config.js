const NodePolyfillPlugin = require("node-polyfill-webpack-plugin")
module.exports = {
  module: {
    rules: [
      {
        test: /\.py$/i,
        use: 'raw-loader',
      }
    ],
  },
  plugins: [new NodePolyfillPlugin()]
  // target: "node",
  // Do not change this!
  // Finding this shit took me more than 2 weeks
  // https://github.com/TypeFox/monaco-languageclient/blob/master/CHANGELOG.md#breaking-changes-1 (scroll to 0.7.0)
  /**
  resolve: {
    fallback: {
      "fs": false,
      "tls": false,
      "net": false,
      "path": false,
      "zlib": false,
      "http": false,
      "https": false,
      "stream": false,
      "crypto": false,
      "os": false,
      "crypto-browserify": require.resolve('crypto-browserify'), //if you want to use this module also don't forget npm i crypto-browserify 
    } ,
    alias: {
        // 'vscode': require.resolve('monaco-languageclient/lib/vscode-compatibility')
        'vscode': 'monaco-languageclient/lib/vscode-compatibility'
      }
  }
  */
}
