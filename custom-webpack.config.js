const NodePolyfillPlugin = require("node-polyfill-webpack-plugin")
const cryptoberry = require("cryptoberry");
const CopyPlugin = require("copy-webpack-plugin");
const admZip = require("adm-zip");

const experiences = ['sortierroboter', 'frequent-itemset-mining'];

// adm-zip appears to be the only library which can create zips synchronously (required by transformAll)
function createZip(assets, name) {
  const zip = new admZip();
  const dirs = new Set();

  // folders are not created automatically, although some zip viewers may think they were
  // therefore create folders manually, else emscripten won't write the files
  assets.forEach(asset => {
    const fileName = asset.sourceFilename.replace(`src/assets/experiences/${name}/`, '');
    const parentPath = fileName.substr(0, fileName.lastIndexOf('/'));

    if ('' !== parentPath) {
      const parts = parentPath.split('/');

      // create folders for all subpaths
      for (let i = 1; i <= parts.length; i++) {
        const path = parts.slice(0, i).reduce((a, b) => `${a}/${b}`) + '/'

        if (!dirs.has(path)) {
          dirs.add(path)
          zip.addFile(path, new Buffer.from([]))
        }
      }
    }
    zip.addFile(fileName, asset.data);
  })

  return zip.toBuffer();
}

function createPatternsForExperiences() {
  const patterns = [];

  experiences.forEach(exp => {
    patterns.push(
      {
        from: `src/assets/experiences/${exp}`,
        to: `assets/${exp}.zip`,
        transform: {
          transformer(content, absolutePath) {
            const regex = new RegExp('.*[\\\\\/]' + exp + '[\\\\\/]config\.json');

            return regex.test(absolutePath)
              ? cryptoberry.encryptForBuild('crypt/key', content)
              : Promise.resolve(content);
          }
        },
        transformAll(assets) {
          return createZip(assets, exp);
        }
      }
    )
  })

  return  patterns;
}

 module.exports = {
  module: {
    rules: [
      {
        test: /\.py$/i,
        use: 'raw-loader',
      }
    ],
  },
  plugins: [new NodePolyfillPlugin(), new CopyPlugin({
    patterns: [
      {
        from: 'src/favicon.ico',
        to: 'favicon.ico'
      },
      {
        from: 'pyodide',
        to: 'assets/pyodide'
      },
      {
        from: 'node_modules/monaco-editor',
        to:  'assets/monaco-editor/'
      },
      {
        from: "src/assets",
        to: "assets",
        filter: async (path) => {
          return !path.includes('src/assets/experiences');
        }
      },
      ...createPatternsForExperiences()]
    })
  ],
  devServer: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    }
  }
}
