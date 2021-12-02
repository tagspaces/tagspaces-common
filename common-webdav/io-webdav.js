const pathLib = require("path");
const { createAdapter } = require("webdav-fs");
const { createFsClient } = require("@tagspaces/tagspaces-common/io-fsclient");
// const { createFsClient } = require("./io-fsclient");

let fsClient;

function configure(webDavConfig) {
  const wfs = createAdapter("http://localhost:" + webDavConfig.port, {
    username: webDavConfig.username,
    password: webDavConfig.password,
  });
  wfs.lstat = wfs.stat;
  // https://github.com/jprichardson/node-fs-extra/blob/master/lib/mkdirs/make-dir.js
  wfs.mkdirp = wfs.mkdir;
  wfs.rm = function (targetPath, options, callback) {
    wfs.rmdir(targetPath, callback);
  };
  /**
   * https://github.com/jprichardson/node-fs-extra/blob/master/lib/output-file/index.js#L9
   * @param file
   * @param data
   * @param encoding
   * @param callback
   */
  wfs.outputFile = function (file, data, encoding, callback) {
    if (typeof encoding === "function") {
      callback = encoding;
      encoding = "utf8";
    }

    const dir = pathLib.dirname(file);
    wfs.stat(dir, (err, fsStat) => {
      if (err) return callback(err);
      if (fsStat.isDirectory())
        return wfs.writeFile(file, data, encoding, callback);

      wfs.mkdir(dir, (err) => {
        //TODO mkdirs
        if (err) return callback(err);

        wfs.writeFile(file, data, encoding, callback);
      });
    });
  };
  fsClient = createFsClient(wfs);
}

function isDirectory(entryPath) {
  return fsClient.isDirectory(entryPath);
}

function listDirectoryPromise(entryPath) {
  return fsClient.listDirectoryPromise(entryPath);
}

function getPropertiesPromise(entryPath) {
  return fsClient.getPropertiesPromise(entryPath);
}

function loadTextFilePromise(entryPath) {
  return fsClient.loadTextFilePromise(entryPath);
}

module.exports = {
  configure,
  listDirectoryPromise,
  /*saveTextFilePromise,
  saveFilePromise,
  saveBinaryFilePromise,*/
  getPropertiesPromise,
  isDirectory,
  loadTextFilePromise,
  /* getFileContentPromise,
  extractTextContent,
  createDirectoryPromise,
  copyFilePromise,
  renameFilePromise,
  renameDirectoryPromise,
  deleteFilePromise,
  deleteDirectoryPromise,
  watchDirectory,
  createDirectoryTree,*/
};
