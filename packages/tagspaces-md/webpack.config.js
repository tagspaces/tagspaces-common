const { resolve } = require('path');
// var webpack = require('webpack');

// This is the object webpack looks at for configuration.
// Webpack doesn't  care about any other javascript in the file.
// Because this is javascript, you can write functions to help build up the configuration.
module.exports = function (_env, argv) {
  const isProduction = argv.mode === 'production';
  const isDevelopment = !isProduction;

  return {
    // Tells webpack what kind of source maps to produce.
    // There are a lot of options, but I chose the standalone file option.
    devtool: isDevelopment && 'cheap-module-source-map', //'source-map',

    // Tells webpack where start walking the dependencies to build a bundle.
    entry: {
      app: ['./src/index.ts']
    },

    // When the env is "development", this tells webpack to provide debuggable information in the source maps and turns off some optimizations.
    mode: process.env.NODE_ENV,

    // Tells webpack how to run file transformation pipeline of webpack.
    // Awesome-typescript-loader will run on all typescript files.
    // Source-map-loader will run on the JS files.
    module: {
      rules: [
        {
          test: /\.[jt]sx?$/,
          exclude: /node_modules/,
          // include: [/app/],
          use: [
            {
              loader: 'babel-loader',
              options: {
                cacheDirectory: true
              }
            },
            {
              loader: 'ts-loader',
              options: {
                transpileOnly: true,
                experimentalWatchApi: true
              }
            }
          ]
        },
        // All output '.js' files will have any sourcemaps re-processed by 'source-map-loader'.
        // { enforce: 'pre', test: /\.js?$/, loader: 'source-map-loader' },
        {
          test: /\.css$/i,
          loader: 'css-loader',
          options: {
            url: true
          }
        }
        // { test: /\.css$/, use: ['style-loader', 'css-loader'] },
      ]
    },

    // Tells webpack not to touch __dirname and __filename.
    // If you run the bundle in node.js it falls back to these values of node.js.
    // https://github.com/webpack/webpack/issues/2010
    node: {
      __dirname: false,
      __filename: false
    },

    /*experiments: {
      outputModule: true,
    },*/
    // Tells webpack where to output the bundled javascript
    output: {
      /*library: {
        //type: 'commonjs-static'
        type: 'commonjs-static'
        // type: 'module', //https://webpack.js.org/configuration/output/#type-module
        // name: "TagspacesMD",
      },*/
      filename: 'index.js',
      library: 'TagspacesMD',
      libraryTarget: 'umd',
      umdNamedDefine: true,
      path: resolve(__dirname, 'build')
    },

    // Tells the HTML webpack plug-in to use a template and emit dist/index.html
    plugins: [],
    target: 'node',

    // Tells webpack what file extesions it should look at.
    resolve: {
      extensions: ['.ts', '.tsx', '.js', '.json']
    }
  };
};
