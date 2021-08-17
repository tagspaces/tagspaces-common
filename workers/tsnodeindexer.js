const pathJS = require("path");
const tsCommon = require("tagspaces-common-node/io-node");
const tsUtils = require("tagspaces-common/utils-io");
const AppConfig = require("tagspaces-common/AppConfig");
/*
 * @param path
 * @param bucketName
 * @returns {Promise<[]>}
 */
const indexer = function (path) {
  console.log("createDirectoryIndex started:" + path);
  console.time("createDirectoryIndex");
  const directoryIndex = [];
  let counter = 0;

  function cleanPath(filePath) {
    const cleanPath = filePath
      .substr(path.length)
      .replace(new RegExp("\\" + pathJS.sep, "g"), "/");

    if (cleanPath.startsWith("/")) {
      return cleanPath.substr(1);
    }
    return cleanPath;
  }

  return tsUtils
    .walkDirectory(
      path,
      tsCommon.listDirectoryPromise,
      {
        recursive: true,
        skipMetaFolder: true,
        skipDotHiddenFolder: true,
        extractText: false,
      },
      (fileEntry) => {
        counter += 1;
        // if (counter > AppConfig.indexerLimit) { TODO set index limit
        //     console.warn('Walk canceled by ' + AppConfig.indexerLimit);
        //     window.walkCanceled = true;
        // }
        const entry = {
          ...fileEntry,
          path: cleanPath(fileEntry.path),
          thumbPath: cleanPath(fileEntry.thumbPath),
        };
        directoryIndex.push(tsUtils.enhanceEntry(entry));
      },
      (directoryEntry) => {
        if (directoryEntry.name !== AppConfig.metaFolder) {
          counter += 1;
          const entry = {
            name: directoryEntry.name,
            isFile: directoryEntry.isFile,
            tags: directoryEntry.tags,
            path: cleanPath(directoryEntry.path),
            thumbPath: cleanPath(directoryEntry.thumbPath),
          };
          directoryIndex.push(tsUtils.enhanceEntry(entry));
        }
      }
    )
    .then(() => {
      // entries - can be used for further processing
      // window.walkCanceled = false;
      console.log(
        "Directory index created " +
          path +
          " containing " +
          directoryIndex.length
      );
      console.timeEnd("createDirectoryIndex");
      return directoryIndex;
    })
    .catch((err) => {
      // window.walkCanceled = false;
      console.timeEnd("createDirectoryIndex");
      console.warn("Error creating index: " + err);
    });
};

/*const addToIndex = function (key, size, LastModified, thumbPath) {
  if (key.indexOf(AppConfig.metaFolder + "/") !== -1) {
    console.info("addToIndex skip meta folder" + key);
    return Promise.resolve(true);
  }
  const dirPath = tsPaths.extractContainingDirectoryPath(key);
  const metaFilePath = getMetaIndexFilePath(dirPath);
  return tsCommon.loadTextFilePromise(metaFilePath).then((metaFileContent) => {
    let tsi = [];
    if (metaFileContent) {
      tsi = JSON.parse(metaFileContent.trim());
    }

    const eentry = {};
    eentry.name = tsPaths.extractFileName(key);
    eentry.path = key;
    eentry.tags = [];
    eentry.thumbPath = thumbPath;
    eentry.meta = {};
    eentry.isFile = true;
    eentry.size = size;
    eentry.lmdt = Date.parse(LastModified);

    tsi.push(eentry);

    return persistIndex(dirPath, tsi);
  });
};

const removeFromIndex = function (key, bucketName) {
  if (key.indexOf(AppConfig.metaFolder + "/") !== -1) {
    console.info("removeFromIndex skip meta folder" + key);
    return Promise.resolve(true);
  }
  const dirPath = tsPaths.extractContainingDirectoryPath(key);
  const metaFilePath = getMetaIndexFilePath(dirPath);
  return tsCommon
    .loadTextFilePromise(metaFilePath, bucketName)
    .then((metaFileContent) => {
      if (metaFileContent) {
        const tsi = JSON.parse(metaFileContent.trim());
        const newTsi = tsi.filter((item) => item.path !== key);
        if (tsi.size !== newTsi.size) {
          return persistIndex(dirPath, newTsi);
        }
      }
    });
};*/

module.exports = {
  indexer,
  persistIndex,
  loadIndex,
  // addToIndex,
  // removeFromIndex,
};
