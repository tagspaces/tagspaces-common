const { join, resolve } = require("path");
var webpack = require("webpack");

// package.json contains the version number of the dependencies
// that we want to make external.  Parsing the package.json
// makes it automatic to keep the package version in sync with
// the CDN URL used in the HtmlWebpackPlugin
const packageJson = require(join(__dirname, "package.json"));

// This is the object webpack looks at for configuration.
// Webpack doesn't  care about any other javascript in the file.
// Because this is javascript, you can write functions to help build up the configuration.
module.exports = {
  // Tells webpack what kind of source maps to produce.
  // There are a lot of options, but I chose the standalone file option.
  devtool: process.env.NODE_ENV === 'production' ? false : "source-map",

  // Tells webpack where start walking the dependencies to build a bundle.
  entry: {
    app: [join(__dirname, "index.js")],
  },

  // When the env is "development", this tells webpack to provide debuggable information in the source maps and turns off some optimizations.
  mode: process.env.NODE_ENV,

  // Tells webpack how to run file transformation pipeline of webpack.
  // Awesome-typescript-loader will run on all typescript files.
  // Source-map-loader will run on the JS files.
  module: {
    rules: [
      // All output '.js' files will have any sourcemaps re-processed by 'source-map-loader'.
      { enforce: "pre", test: /\.js?$/, loader: "source-map-loader" },
      { test: /.node$/, loader: "node-loader" },
      // { test: /\.css$/, use: ['style-loader', 'css-loader'] },
    ],
  },

  // Tells webpack not to touch __dirname and __filename.
  // If you run the bundle in node.js it falls back to these values of node.js.
  // https://github.com/webpack/webpack/issues/2010
  node: {
    __dirname: false,
    __filename: false,
  },

  // Tells webpack where to output the bundled javascript
  output: {
    filename: "index.js",
    //library: 'TagspacesWS',
    //libraryTarget: 'umd',
    //umdNamedDefine: true,
    path: join(__dirname, "build"),
  },

  // Tells the HTML webpack plug-in to use a template and emit dist/index.html
  plugins: [],
  target: "node",

  externals: {
    sharp: "commonjs sharp",
    bufferutil: "bufferutil",
    "utf-8-validate": "utf-8-validate",
  },
  // Tells webpack what file extesions it should look at.
  resolve: {
    extensions: [".js", ".json"],
  },
};
