const pathLib = require("path");
const { createAdapter } = require("webdav-fs");
const { createFsClient } = require("@tagspaces/tagspaces-common/io-fsclient");
// const { normalizePath } = require("@tagspaces/tagspaces-common/paths");
// const { createFsClient } = require("./io-fsclient");

let fsClient, username, password, port;

function configure(webDavConfig) {
  username = webDavConfig.username;
  password = webDavConfig.password;
  port = webDavConfig.port;

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

function saveTextFilePromise(param, content, overwrite) {
  return fsClient.saveTextFilePromise(param, content, overwrite);
}

function saveFilePromise(param, content, overwrite) {
  return fsClient.saveFilePromise(param, content, overwrite);
}

function saveBinaryFilePromise(filePath, content, overwrite) {
  return fsClient.saveFilePromise(filePath, content, overwrite);
}

function getPropertiesPromise(entryPath) {
  return fsClient.getPropertiesPromise(entryPath);
}

function loadTextFilePromise(entryPath) {
  return fsClient.loadTextFilePromise(entryPath);
}

function getFileContentPromise(param, type) {
  return fsClient.getFileContentPromise(param, type);
}

function extractTextContent(fileName, textContent) {
  return fsClient.extractTextContent(fileName, textContent);
}

function createDirectoryPromise(dirPath) {
  return fsClient.createDirectoryPromise(dirPath);
}

function copyFilePromise(sourceFilePath, targetFilePath) {
  return fsClient.copyFilePromise(sourceFilePath, targetFilePath);
}

function renameFilePromise(filePath, newFilePath) {
  return fsClient.renameFilePromise(filePath, newFilePath);
}

function renameDirectoryPromise(dirPath, newDirName) {
  return fsClient.renameDirectoryPromise(dirPath, newDirName);
}

function deleteFilePromise(path) {
  return fsClient.deleteFilePromise(path);
}

function deleteDirectoryPromise(path) {
  return fsClient.deleteDirectoryPromise(path);
}

function watchDirectory(dirPath, listener) {
  return fsClient.watchDirectory(dirPath, listener);
}

function createDirectoryTree(dirPath) {
  return fsClient.watchDirectory(dirPath);
}

module.exports = {
  configure,
  isDirectory,
  listDirectoryPromise,
  saveTextFilePromise,
  saveFilePromise,
  saveBinaryFilePromise,
  getPropertiesPromise,
  loadTextFilePromise,
  getFileContentPromise,
  extractTextContent,
  createDirectoryPromise,
  copyFilePromise,
  renameFilePromise,
  renameDirectoryPromise,
  deleteFilePromise,
  deleteDirectoryPromise,
  watchDirectory,
  createDirectoryTree
};
