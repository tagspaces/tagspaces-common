const pathJS = require("path");
const {
  loadTextFilePromise,
  saveTextFilePromise,
  listDirectoryPromise,
  getPropertiesPromise,
} = require("./index");
const {
  normalizePath,
  extractContainingDirectoryPath,
  extractFileName,
  getMetaFileLocationForFile,
  getMetaFileLocationForDir,
} = require("@tagspaces/tagspaces-common/paths");
const {
  loadJSONString,
  walkDirectory,
  enhanceEntry,
} = require("@tagspaces/tagspaces-common/utils-io");
const AppConfig = require("@tagspaces/tagspaces-common/AppConfig");

/**
 * @param param
 * @param extractText: boolean = false
 * @param ignorePatterns: Array<string>
 * @param listDirectory function
 * @returns {*}
 */
function createIndex(
  param,
  extractText = false,
  ignorePatterns = [],
  listDirectory = undefined
) {
  let path;
  if (typeof param === "object" && param !== null) {
    path = param.path;
  } else {
    path = param;
  }
  // console.log("createDirectoryIndex started:" + path);
  // console.time("createDirectoryIndex");
  const directoryIndex = [];
  let counter = 0;

  function cleanPath(filePath) {
    const cleanPath = filePath
      .substr(path.length) // remove root location path from index
      .replace(new RegExp("\\" + pathJS.sep, "g"), "/");

    if (cleanPath.startsWith("/")) {
      return cleanPath.substr(1);
    }
    return cleanPath;
  }

  return walkDirectory(
    param,
    listDirectory ? listDirectory : listDirectoryPromise,
    {
      recursive: true,
      skipMetaFolder: true,
      skipDotHiddenFolder: true,
      extractText,
    },
    async (fileEntry) => {
      counter += 1;
      // if (counter > AppConfig.indexerLimit) { TODO set index limit
      //     console.warn('Walk canceled by ' + AppConfig.indexerLimit);
      //     window.walkCanceled = true;
      // }
      const meta = await getEntryMeta({
        ...param,
        path: getMetaFileLocationForFile(fileEntry.path),
      });

      const entry = {
        ...fileEntry,
        path: cleanPath(fileEntry.path),
        thumbPath: cleanPath(fileEntry.thumbPath),
        meta: meta,
      };
      directoryIndex.push(enhanceEntry(entry));
    },
    async (directoryEntry) => {
      if (directoryEntry.name !== AppConfig.metaFolder) {
        counter += 1;
        const meta = await getEntryMeta({
          ...param,
          path: getMetaFileLocationForDir(directoryEntry.path),
        });
        const entry = {
          name: directoryEntry.name,
          isFile: directoryEntry.isFile,
          tags: directoryEntry.tags,
          path: cleanPath(directoryEntry.path),
          thumbPath: cleanPath(directoryEntry.thumbPath),
          meta: meta,
        };
        directoryIndex.push(enhanceEntry(entry));
      }
    },
    ignorePatterns
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
      // console.timeEnd("createDirectoryIndex");
      return directoryIndex;
    })
    .catch((err) => {
      // window.walkCanceled = false;
      // console.timeEnd("createDirectoryIndex");
      console.warn("Error creating index: " + err);
    });
}

/**
 * @param param = {path: , bucketName: }
 * @returns {Promise<*>}
 */
async function getEntryMeta(param) {
  //metaFilePath) {
  // const metaFileProps = await getPropertiesPromise(metaFilePath);
  // if (metaFileProps.isFile) {
  const meta = await loadJSONFile(param); // { path: metaFilePath });
  //}
  return meta;
}

function persistIndex(param, directoryIndex) {
  let directoryPath;
  if (typeof param === "object" && param !== null) {
    directoryPath = param.path;
  } else {
    directoryPath = param;
  }
  const folderIndexPath = getMetaIndexFilePath(directoryPath);
  return saveTextFilePromise(
    { ...param, path: folderIndexPath },
    JSON.stringify(directoryIndex), // relativeIndex),
    true
  )
    .then(() => {
      console.log(
        "Index persisted for: " + directoryPath + " to " + folderIndexPath
      );
      return true;
    })
    .catch((err) => {
      console.error("Error saving the index for " + folderIndexPath, err);
    });
}

/**
 * @param param
 * @param dirSeparator: string
 * @returns {Promise<boolean>}
 */
function hasIndex(param, dirSeparator = AppConfig.dirSeparator) {
  let directoryPath;
  if (typeof param === "object" && param !== null) {
    directoryPath = param.path;
  } else {
    directoryPath = param;
  }
  const folderIndexPath = getMetaIndexFilePath(directoryPath, dirSeparator);
  return getPropertiesPromise({ ...param, path: folderIndexPath })
    .then((lstat) => lstat && lstat.isFile)
    .catch((err) => {
      console.log("Error hasIndex", err);
      return Promise.resolve(false);
    });
}

/**
 * @param param = {directoryPath:string, locationID:string}
 * @param dirSeparator: string
 * @returns {Promise<Array<Object>>}
 */
function loadIndex(param, dirSeparator = AppConfig.dirSeparator) {
  let directoryPath, locationID;
  if (typeof param === "object" && param !== null) {
    directoryPath = param.path;
    locationID = param.locationID;
  } else {
    directoryPath = param;
  }
  const folderIndexPath = getMetaIndexFilePath(directoryPath);
  return loadJSONFile({ ...param, path: folderIndexPath })
    .then((directoryIndex) => {
      return enhanceDirectoryIndex(
        directoryPath,
        directoryIndex,
        locationID,
        dirSeparator
      );
    })
    .catch((err) => {
      console.log("Error loadIndex", err);
      return Promise.resolve([]);
    });
}

function loadJsonContent(
  directoryPath,
  jsonContent,
  dirSeparator = AppConfig.dirSeparator
) {
  const directoryIndex = loadJSONString(jsonContent);
  return enhanceDirectoryIndex(
    directoryPath,
    directoryIndex,
    undefined,
    dirSeparator
  );
}

function enhanceDirectoryIndex(
  directoryPath,
  directoryIndex,
  locationID,
  dirSeparator = AppConfig.dirSeparator
) {
  if (AppConfig.isCordova) {
    if (!directoryPath.startsWith(dirSeparator)) {
      // in cordova search results needs to start with dirSeparator
      directoryPath = dirSeparator + directoryPath;
    }
  }
  return directoryIndex.map((entry) => {
    if (entry.thumbPath) {
      return {
        ...entry,
        locationID,
        path: directoryPath + dirSeparator + toPlatformPath(entry.path),
        thumbPath:
          directoryPath + dirSeparator + toPlatformPath(entry.thumbPath),
      };
    }
    return {
      ...entry,
      locationID,
      path: directoryPath + dirSeparator + toPlatformPath(entry.path),
    };
  });
}

function toPlatformPath(path, dirSeparator = AppConfig.dirSeparator) {
  if (AppConfig.isWin) {
    // index is created with Unix dir separator /
    return path.replaceAll("/", dirSeparator);
  }
  return path;
}

function addToIndex(param, size, LastModified, thumbPath) {
  if (param.path.indexOf(AppConfig.metaFolder + "/") !== -1) {
    console.info("addToIndex skip meta folder" + param.path);
    return Promise.resolve(true);
  }
  const dirPath = extractContainingDirectoryPath(param.path, "/");
  const metaFilePath = getMetaIndexFilePath(dirPath);
  console.info(
    "addToIndex path:" +
      param.path +
      " size:" +
      size +
      " LastModified:" +
      LastModified +
      " thumbPath:" +
      thumbPath +
      " bucketName:" +
      param.bucketName
  );
  return loadTextFilePromise({
    path: metaFilePath,
    bucketName: param.bucketName,
  }).then((metaFileContent) => {
    console.info("addToIndex metaFileContent:" + metaFileContent);
    let tsi = [];
    if (metaFileContent) {
      tsi = JSON.parse(metaFileContent.trim());
    }

    const eentry = {
      ...param,
      name: extractFileName(param.path),
      tags: [],
      thumbPath,
      meta: {},
      isFile: true,
      size: size,
      lmdt: Date.parse(LastModified),
    };

    tsi.push(eentry);

    return persistIndex({ ...param, path: dirPath }, tsi);
  });
}

function removeFromIndex(param) {
  console.info(
    "removeFromIndex path:" + param.path + " bucket:" + param.bucketName
  );
  if (param.path.indexOf(AppConfig.metaFolder + "/") !== -1) {
    console.info("removeFromIndex skip meta folder" + param.path);
    return Promise.resolve(true);
  }
  const dirPath = extractContainingDirectoryPath(param.path, "/");
  const metaFilePath = getMetaIndexFilePath(dirPath);
  return loadTextFilePromise({
    ...param,
    path: metaFilePath,
  }).then((metaFileContent) => {
    if (metaFileContent) {
      const tsi = JSON.parse(metaFileContent.trim());
      const newTsi = tsi.filter((item) => item.path !== param.path);
      if (tsi.size !== newTsi.size) {
        return persistIndex({ ...param, path: dirPath }, newTsi);
      }
    }
  });
}

function getMetaIndexFilePath(
  directoryPath,
  dirSeparator = AppConfig.dirSeparator
) {
  return directoryPath.length > 0 && directoryPath !== dirSeparator
    ? normalizePath(
        directoryPath +
          dirSeparator +
          AppConfig.metaFolder +
          dirSeparator +
          AppConfig.folderIndexFile
      )
    : normalizePath(
        AppConfig.metaFolder + dirSeparator + AppConfig.folderIndexFile
      );
}

/**
 * @returns {Promise<*>}
 * @param param
 */
function loadJSONFile(param) {
  return loadTextFilePromise(param)
    .then((jsonContent) => loadJSONString(jsonContent))
    .catch(() => {
      return undefined;
      // console.debug("File not exist: " + param.path);
    });
}

module.exports = {
  createIndex,
  persistIndex,
  hasIndex,
  loadIndex,
  enhanceDirectoryIndex,
  loadJsonContent,
  getMetaIndexFilePath,
  loadJSONFile,
  addToIndex,
  removeFromIndex,
};
