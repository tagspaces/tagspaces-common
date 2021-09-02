const { walkDirectory, enhanceEntry } = require("tagspaces-common/utils-io");
const {
  extractContainingDirectoryPath,
  extractFileName,
} = require("tagspaces-common/paths");
const AppConfig = require("tagspaces-common/AppConfig");
const tsPlatform = require("./io-objectstore");
/*
 * @param path
 * @param bucketName
 * @returns {Promise<[]>}
 */
function createIndex(path, bucketName) {
  console.log(
    "createDirectoryIndex started:" + path + " bucketName:" + bucketName
  );
  console.time("createDirectoryIndex");
  const directoryIndex = [];
  let counter = 0;
  return walkDirectory(
    { path: path, bucketName: bucketName },
    tsPlatform.listDirectoryPromise,
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
      directoryIndex.push(enhanceEntry(fileEntry));
    },
    (directoryEntry) => {
      if (directoryEntry.name !== AppConfig.metaFolder) {
        counter += 1;
        directoryIndex.push(enhanceEntry(directoryEntry));
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
}

function persistIndex(
  directoryPath,
  directoryIndex,
  bucketName,
  dirSeparator = "/"
) {
  const folderIndexPath = getMetaIndexFilePath(directoryPath);
  return tsPlatform
    .saveTextFilePromise(
      { path: folderIndexPath, bucketName: bucketName },
      JSON.stringify(directoryIndex), // relativeIndex),
      true
    )
    .then(() => {
      console.log(
        "Index persisted for: " + directoryPath + " to " + folderIndexPath
      );
      return true;
    })
    .catch(() => {
      console.warn("Error saving the index for " + directoryPath);
    });
}

function addToIndex(key, size, LastModified, thumbPath, bucketName) {
  if (key.indexOf(AppConfig.metaFolder + "/") !== -1) {
    console.info("addToIndex skip meta folder" + key);
    return Promise.resolve(true);
  }
  const dirPath = extractContainingDirectoryPath(key, "/");
  const metaFilePath = getMetaIndexFilePath(dirPath);
  return tsPlatform
    .loadTextFilePromise({
      path: metaFilePath,
      bucketName: bucketName,
    })
    .then((metaFileContent) => {
      let tsi = [];
      if (metaFileContent) {
        tsi = JSON.parse(metaFileContent.trim());
      }

      const eentry = {};
      eentry.name = extractFileName(key);
      eentry.path = key;
      eentry.bucketName = bucketName;
      eentry.tags = [];
      eentry.thumbPath = thumbPath;
      eentry.meta = {};
      eentry.isFile = true;
      eentry.size = size;
      eentry.lmdt = Date.parse(LastModified);

      tsi.push(eentry);

      return persistIndex(dirPath, tsi, bucketName);
    });
}

function removeFromIndex(key, bucketName) {
  console.info("removeFromIndex key:" + key + " bucket:" + bucketName);
  if (key.indexOf(AppConfig.metaFolder + "/") !== -1) {
    console.info("removeFromIndex skip meta folder" + key);
    return Promise.resolve(true);
  }
  const dirPath = extractContainingDirectoryPath(key, "/");
  const metaFilePath = getMetaIndexFilePath(dirPath);
  return tsPlatform
    .loadTextFilePromise({
      path: metaFilePath,
      bucketName: bucketName,
    })
    .then((metaFileContent) => {
      if (metaFileContent) {
        const tsi = JSON.parse(metaFileContent.trim());
        const newTsi = tsi.filter((item) => item.path !== key);
        if (tsi.size !== newTsi.size) {
          return persistIndex(dirPath, newTsi, bucketName);
        }
      }
    });
}

const getMetaIndexFilePath = (directoryPath, dirSeparator = "/") => {
  return directoryPath.length > 0 && directoryPath !== dirSeparator
    ? directoryPath +
        dirSeparator +
        AppConfig.metaFolder +
        dirSeparator +
        AppConfig.folderIndexFile
    : AppConfig.metaFolder + dirSeparator + AppConfig.folderIndexFile;
};

module.exports = {
  createIndex,
  persistIndex,
  addToIndex,
  removeFromIndex,
};
