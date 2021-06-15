const fs = require("fs-extra");
const path = require("path");
const filepath = require("filepath");
const { AppConfig } = require("./AppConfig");
const { listDirectoryPromise } = require("./io-node");
const { walkDirectory } = require("./utils-io");

const cleanMeta = (path, analise = true) => {
  /*assert(Array.isArray(parts));
    assert(parts[0] === 'home');
    assert(parts.pop() === 'README.md');*/
  walkDirectory(
    path,
    listDirectoryPromise,
    {
      recursive: true,
      skipMetaFolder: false,
      skipDotHiddenFolder: false,
      extractText: false,
    },
    (fileEntry) => {
      const pathObj = filepath.create(fileEntry.path);
      const parts = pathObj.split();
      if (parts.includes(AppConfig.metaFolder)) {
        const fileName = parts[parts.size-1];
        const fileExtension = pathObj.extname();
        if (fileName === AppConfig.folderThumbFile) {
        } else if (fileName === AppConfig.folderIndexFile) {
        } else if (fileName === AppConfig.metaFolderFile) {
        } else if (fileExtension === AppConfig.metaFileExt) {
        } else if (fileExtension === AppConfig.thumbFileExt) {
        }
      }
    },
    (directoryEntry) => {}
  )
    .then(() => {
      // entries - can be used for further processing
      // window.walkCanceled = false;
      console.log("Directory cleaned " + path);
      return true;
    })
    .catch((err) => {
      console.error("Error clean dir " + path + ": ", err);
    });
};

module.exports = {
    cleanMeta
};