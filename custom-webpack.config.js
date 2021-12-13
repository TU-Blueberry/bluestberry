const path = require('path');

module.exports = {
  module: {
    rules: [
      {
        test: /\.py$/i,
        use: 'raw-loader',
      }
    ],
  },
  target: "node",
  // Do not change this!
  // Finding this shit took me more than 2 weeks
  // https://github.com/TypeFox/monaco-languageclient/blob/master/CHANGELOG.md#breaking-changes-1 (scroll to 0.7.0)
  resolve: {
    alias: {
        'vscode': path.resolve(__dirname, 'node_modules/monaco-languageclient/lib/vscode-compatibility')
    }
  }
}
