const { createAdapter } = require("webdav-fs");
// const { createFsClient } = require("@tagspaces/tagspaces-common/io-fsclient");
const { createFsClient } = require("./io-fsclient");

let fsClient;

function configure(webDavConfig) {
  const wfs = createAdapter("http://localhost:" + webDavConfig.port, {
    username: webDavConfig.username,
    password: webDavConfig.password,
  });

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
