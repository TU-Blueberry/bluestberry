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

    compiler.hooks.thisCompilation.tap(pluginName, (compilation) => {
      compilation.hooks.processAssets.tapPromise({
        name: pluginName,
        stage: Compilation.PROCESS_ASSETS_STAGE_ANALYSE,
      }, (assets) => {
        const zipPromises = zipPaths.map(zipPath => {
          const zip = new JsZip();
          Object.entries(assets)
            .filter(([path]) => path.startsWith(zipPath))
            .forEach(([path, source]) => {
              path = path.replace(zipPath, '');
              // console.log('adding file: ', path);
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
  module: {
    rules: [
      {
        test: /\.py$/i,
        use: 'raw-loader',
      }
    ],
  },
  plugins: [new NodePolyfillPlugin(), customZipPlugin],
  devServer: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    }
  }
}
