const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = function override(config, env) {
  // Lägg till fallbacks för Node.js-moduler
  config.resolve.fallback = {
    ...config.resolve.fallback,
    fs: false,
    path: false,
    crypto: false,
    stream: false,
    util: false,
    assert: false,
    os: false,
    http: false,
    https: false,
    url: false,
  };

  // Lägg till stöd för WebAssembly
  config.experiments = {
    ...config.experiments,
    asyncWebAssembly: true,
  };

  // Lägg till CopyWebpackPlugin för att kopiera arbetarfiler
  if (!config.plugins) {
    config.plugins = [];
  }
  
  config.plugins.push(
    new CopyWebpackPlugin({
      patterns: [
        // Kopiera WADO-laddaren och codecs
        {
          from: path.resolve(__dirname, 'node_modules/@cornerstonejs/dicom-image-loader/dist/cornerstoneWADOImageLoaderWebWorker.min.js'),
          to: path.resolve(__dirname, 'public')
        },
        {
          from: path.resolve(__dirname, 'node_modules/@cornerstonejs/dicom-image-loader/dist/cornerstoneWADOImageLoaderCodecs.min.js'),
          to: path.resolve(__dirname, 'public')
        },
        // Kopiera WASM-filen för codec-charls
        {
          from: path.resolve(__dirname, 'node_modules/@cornerstonejs/codec-charls/dist/charlswasm_decode.wasm'),
          to: path.resolve(__dirname, 'public')
        }
      ]
    })
  );

  return config;
}; 