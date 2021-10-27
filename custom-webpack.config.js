module.exports = {
  module: {
    rules: [
      {
        test: /\.py$/i,
        use: 'raw-loader',
      }
    ],
  },
}
