const fs = require("fs-extra");
// const path = require("path");
const filepath = require("filepath");
const AppConfig = require("./AppConfig");
const { listDirectoryPromise } = require("./io-node");
const { walkDirectory } = require("./utils-io");

const cleanMeta = (dirPath, analise = true) => {
  /*assert(Array.isArray(parts));
    assert(parts[0] === 'home');
    assert(parts.pop() === 'README.md');*/
  return walkDirectory(
    dirPath,
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
      const metaFolderIndex = parts.indexOf(AppConfig.metaFolder);
      if (metaFolderIndex !== -1) {
        const fileName = parts[parts.length - 1];
        // console.debug(fileName);
        const fileExtension = pathObj.extname();
        // console.debug(fileExtension);
        if (fileName === AppConfig.folderThumbFile) {
        } else if (fileName === AppConfig.folderIndexFile) {
        } else if (fileName === AppConfig.metaFolderFile) {
        } else if (fileExtension === AppConfig.metaFileExt) {
        } else if (fileExtension === AppConfig.thumbFileExt) {
          const originPath = parts.slice(0, metaFolderIndex);
          originPath.push(
            fileName.substring(0, fileName.length - fileExtension.length)
          );
          const originFile = filepath.create(originPath);
          if (!fs.existsSync(originFile.sep + originFile.path)) {
            // if (!originFile.exists()) {
            console.log("Thumb not exist:" + fileEntry.path);
          }
        }
      }
    },
    (directoryEntry) => {}
  )
    .then(() => {
      // entries - can be used for further processing
      // window.walkCanceled = false;
      console.debug("Directory cleaned " + dirPath);
      return true;
    })
    .catch((err) => {
      console.debug("Error clean dir " + path + ": ", err);
    });
};

module.exports = {
  cleanMeta,
};
