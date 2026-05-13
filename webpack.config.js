const path = require('path');

module.exports = (env, argv) => {
  const isProd = argv.mode === 'production';

  return {
    entry: './src/main.ts',
    output: {
      filename: 'game.js',
      path: path.resolve(__dirname, 'minigame'),
      // WeChat Mini Game uses CJS-like module system
      libraryTarget: 'commonjs2',
    },
    resolve: {
      extensions: ['.ts', '.js'],
      alias: {
        '@game': path.resolve(__dirname, 'src/game'),
        '@combat': path.resolve(__dirname, 'src/combat'),
        '@data': path.resolve(__dirname, 'src/data'),
        '@progression': path.resolve(__dirname, 'src/progression'),
        '@ui': path.resolve(__dirname, 'src/ui'),
        '@render': path.resolve(__dirname, 'src/render'),
        '@audio': path.resolve(__dirname, 'src/audio'),
        '@utils': path.resolve(__dirname, 'src/utils'),
      },
    },
    module: {
      rules: [
        {
          test: /\.ts$/,
          use: 'ts-loader',
          exclude: /node_modules/,
        },
      ],
    },
    optimization: {
      minimize: isProd,
    },
    // WeChat Mini Game has no 'fs', 'path', etc.
    node: {
      global: false,
      __dirname: false,
      __filename: false,
    },
    performance: {
      maxEntrypointSize: 4 * 1024 * 1024, // 4MB
      maxAssetSize: 4 * 1024 * 1024,
    },
    devtool: isProd ? false : 'source-map',
  };
};
