const NodePolyfillPlugin = require("node-polyfill-webpack-plugin")
const JsZip = require("jszip");
const customZipPlugin = {
  apply: (compiler) => {
    const pluginName = 'CustomZipPlugin';
    const zipPaths = [
      'assets/sortierroboter/',
      'assets/experience2/',
    ];
    const { webpack } = compiler;
    const { Compilation } = webpack;
    const { RawSource } = webpack.sources;

    console.log('custom zip plugin apply called');

    compiler.hooks.thisCompilation.tap(pluginName, (compilation) => {
      console.log('tap1');

      compilation.hooks.afterProcessAssets.tap(pluginName, (compilation) => {console.log(compilation.assets);});
      compilation.hooks.processAssets.tapPromise({
        name: pluginName,
        stage: Compilation.PROCESS_ASSETS_STAGE_ANALYSE,
      }, (assets) => {
        console.log('tap2');
        const zipPromises = zipPaths.map(zipPath => {
          const zip = new JsZip();
          Object.keys(assets).forEach(a => console.log(a));
          Object.entries(assets)
            .filter(([path]) => path.startsWith(zipPath))
            .forEach(([path, source]) => {
              path = path.replace(zipPath, '');
              console.log('adding file: ', path);
              zip.file(path, source.buffer().buffer);
            });
          return zip.generateAsync({type: 'uint8array'}).then(array => {
            const outPath = zipPath.replace(/\/$/, '.zip');
            compilation.emitAsset(outPath, new RawSource(Buffer.from(array)));
          });
        });
        return Promise.all(zipPromises);
      });
    });
  }
};

module.exports = {
  plugins: [
    customZipPlugin
  ],
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
