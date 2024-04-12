const {
  normalizePath,
  extractContainingDirectoryPath,
  extractFileName,
  getMetaFileLocationForFile,
  getMetaFileLocationForDir,
  joinPaths,
  cleanRootPath,
  cleanTrailingDirSeparator,
} = require("@tagspaces/tagspaces-common/paths");
const {
  loadJSONString,
  walkDirectory,
  enhanceEntry,
} = require("@tagspaces/tagspaces-common/utils-io");
const AppConfig = require("@tagspaces/tagspaces-common/AppConfig");

/*function cleanPath(filePath, rootPathLength) {
  const cleanPath = filePath
    .substr(rootPathLength) // remove root location path from index
    .replace(/\/\/+/g, "/");
  // .replace(new RegExp("\\" + pathJS.sep, "g"), "/");

  if (cleanPath.startsWith("/")) {
    return cleanPath.substr(1);
  }
  return cleanPath;
}*/

/**
 * @param param
 * @param listDirectoryPromise function
 * @param mode  ['extractTextContent', 'extractThumbURL', 'extractThumbPath']
 * @param ignorePatterns: Array<string>
 * @param loadTextFilePromise function
 * @returns {Promise<*>}
 */
function createIndex(
  param,
  listDirectoryPromise,
  loadTextFilePromise,
  mode = ["extractThumbPath"],
  ignorePatterns = []
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

  return walkDirectory(
    param,
    listDirectoryPromise,
    {
      recursive: true,
      skipMetaFolder: true,
      skipDotHiddenFolder: true,
      mode,
    },
    async (fileEntry) => {
      counter += 1;
      // if (counter > AppConfig.indexerLimit) { TODO set index limit
      //     console.warn('Walk canceled by ' + AppConfig.indexerLimit);
      //     window.walkCanceled = true;
      // }
      const meta = await getEntryMeta(
        {
          ...param,
          path: getMetaFileLocationForFile(
            fileEntry.path,
            AppConfig.dirSeparator
          ),
        },
        loadTextFilePromise
      );
      /*const thumb =
        fileEntry.meta && fileEntry.meta.thumbPath
          ? cleanRootPath(
              fileEntry.meta.thumbPath,
              path,
              AppConfig.dirSeparator
            )
          : undefined;*/
      const entry = {
        ...fileEntry,
        path: cleanRootPath(fileEntry.path, path, AppConfig.dirSeparator),
        meta: meta,
        //meta: { ...(meta && meta), ...(thumb && { thumbPath: thumb }) },
      };
      directoryIndex.push(enhanceEntry(entry));
    },
    async (directoryEntry) => {
      if (directoryEntry.name !== AppConfig.metaFolder) {
        counter += 1;
        const meta = await getEntryMeta(
          {
            ...param,
            path: getMetaFileLocationForDir(directoryEntry.path),
          },
          loadTextFilePromise
        );
        const entry = {
          name: directoryEntry.name,
          isFile: directoryEntry.isFile,
          tags: directoryEntry.tags,
          path: cleanRootPath(
            directoryEntry.path,
            path,
            AppConfig.dirSeparator
          ),
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
 * @param loadTextFilePromise  function
 * @returns {Promise<*>}
 */
async function getEntryMeta(param, loadTextFilePromise) {
  //metaFilePath) {
  // const metaFileProps = await getPropertiesPromise(metaFilePath);
  // if (metaFileProps.isFile) {
  const meta = await loadJSONFile(param, loadTextFilePromise); // { path: metaFilePath });
  //}
  return meta;
}

/**
 * use it for native platform only (saveTextFilePromise cannot switch -location can be S3).
 * look at utils-io -> persistIndex with PlatformIO.saveTextFilePromise instead
 * @param param
 * @param directoryIndex
 */
function persistIndex(param, directoryIndex) {
  if (!param.saveTextFilePromise) {
    console.error("persistIndex param.saveTextFilePromise is not set!");
    return Promise.resolve(false);
  }
  let directoryPath;
  if (typeof param === "object" && param !== null) {
    directoryPath = param.path;
  } else {
    directoryPath = param;
  }
  const folderIndexPath = getMetaIndexFilePath(directoryPath);
  return param
    .saveTextFilePromise(
      { ...param, path: folderIndexPath },
      JSON.stringify(directoryIndex), // relativeIndex),
      true
    )
    .then((result) => {
      if (result) {
        console.log(
          "Index persisted for: " + directoryPath + " to " + folderIndexPath
        );
      }
      return result;
    })
    .catch((err) => {
      console.error("Error saving the index for " + folderIndexPath, err);
    });
}

/**
 * @param param
 * @param getPropertiesPromise function
 * @returns {Promise<boolean>}
 */
function hasIndex(param, getPropertiesPromise) {
  let directoryPath;
  if (typeof param === "object" && param !== null) {
    directoryPath = param.path;
  } else {
    directoryPath = param;
  }
  const folderIndexPath = getMetaIndexFilePath(directoryPath);
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
 * @param loadTextFilePromise function
 * @returns {Promise<Array<Object>>}
 */
function loadIndex(
  param,
  dirSeparator = AppConfig.dirSeparator,
  loadTextFilePromise
) {
  let directoryPath, locationID;
  if (typeof param === "object" && param !== null) {
    directoryPath = param.path;
    locationID = param.locationID;
  } else {
    directoryPath = param;
  }
  const folderIndexPath = getMetaIndexFilePath(directoryPath);
  return loadJSONFile({ ...param, path: folderIndexPath }, loadTextFilePromise)
    .then((directoryIndex) => {
      return enhanceDirectoryIndex(
        param,
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

/*function loadJsonContent(
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
}*/

function enhanceDirectoryIndex(
  param,
  directoryIndex,
  locationID,
  dirSeparator = AppConfig.dirSeparator
) {
  if (!directoryIndex) {
    return undefined;
  }
  let directoryPath;
  if (typeof param === "object" && param !== null) {
    directoryPath = param.path;
  } else {
    directoryPath = param;
  }

  if (AppConfig.isCordova) {
    if (!directoryPath.startsWith(dirSeparator)) {
      // in cordova search results needs to start with dirSeparator
      directoryPath = dirSeparator + directoryPath;
    }
    directoryPath = cleanTrailingDirSeparator(directoryPath);
  }
  return directoryIndex.map((entry) => {
    if (entry.meta && entry.meta.thumbPath) {
      let thumbPath;
      if (param.bucketName) {
        thumbPath = entry.meta.thumbPath;
      } else {
        thumbPath = joinPaths(
          dirSeparator,
          directoryPath,
          toPlatformPath(entry.meta.thumbPath)
        );
      }

      return {
        ...entry,
        locationID,
        path: joinPaths(
          dirSeparator,
          directoryPath,
          toPlatformPath(entry.path)
        ),
        meta: {
          thumbPath: thumbPath,
        },
      };
    }
    return {
      ...entry,
      locationID,
      path: joinPaths(dirSeparator, directoryPath, toPlatformPath(entry.path)),
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
  if (!param.loadTextFilePromise) {
    console.error("addToIndex param.loadTextFilePromise is not set!");
    return Promise.resolve(false);
  }
  if (!param.saveTextFilePromise) {
    console.error("addToIndex param.saveTextFilePromise is not set!");
    return Promise.resolve(false);
  }
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
  return param
    .loadTextFilePromise({
      path: metaFilePath,
      bucketName: param.bucketName,
    })
    .then((metaFileContent) => {
      console.info("addToIndex metaFileContent:" + metaFileContent);
      let tsi = [];
      if (metaFileContent) {
        try {
          tsi = JSON.parse(metaFileContent.trim());
        } catch (ex) {
          console.warn("Error JSON.parse for " + metaFilePath, ex);
        }
      }

      const eentry = {
        ...param,
        name: extractFileName(param.path),
        tags: [],
        meta: { thumbPath },
        isFile: true,
        size: size,
        lmdt: Date.parse(LastModified),
      };

      tsi.push(eentry);

      return persistIndex(
        {
          ...param,
          path: dirPath,
          saveTextFilePromise: param.saveTextFilePromise,
        },
        tsi
      );
    });
}

function removeFromIndex(param) {
  if (!param.loadTextFilePromise) {
    console.error("removeFromIndex param.loadTextFilePromise is not set!");
    return Promise.resolve(false);
  }
  if (!param.saveTextFilePromise) {
    console.error("addToIndex param.saveTextFilePromise is not set!");
    return Promise.resolve(false);
  }
  console.info(
    "removeFromIndex path:" + param.path + " bucket:" + param.bucketName
  );
  if (param.path.indexOf(AppConfig.metaFolder + "/") !== -1) {
    console.info("removeFromIndex skip meta folder" + param.path);
    return Promise.resolve(true);
  }
  const dirPath = extractContainingDirectoryPath(param.path, "/");
  const metaFilePath = getMetaIndexFilePath(dirPath);
  return param
    .loadTextFilePromise({
      ...param,
      path: metaFilePath,
    })
    .then((metaFileContent) => {
      if (metaFileContent) {
        let tsi = [];
        try {
          tsi = JSON.parse(metaFileContent.trim());
        } catch (ex) {
          console.warn("Error JSON.parse for " + metaFilePath, ex);
        }
        const newTsi = tsi.filter((item) => item.path !== param.path);
        if (tsi.size !== newTsi.size) {
          return persistIndex(
            {
              ...param,
              path: dirPath,
              saveTextFilePromise: param.saveTextFilePromise,
            },
            newTsi
          );
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
 * @param loadTextFilePromise
 */
function loadJSONFile(param, loadTextFilePromise) {
  if (!loadTextFilePromise) {
    console.error("loadJSONFile loadTextFilePromise is not set!");
    return Promise.resolve(false);
  }
  return loadTextFilePromise(param)
    .then((jsonContent) => loadJSONString(jsonContent))
    .catch((e) => {
      console.log("File not exist: " + param.path, e);
      return undefined;
    });
}

module.exports = {
  createIndex,
  persistIndex,
  hasIndex,
  loadIndex,
  enhanceDirectoryIndex,
  // loadJsonContent,
  getMetaIndexFilePath,
  loadJSONFile,
  addToIndex,
  removeFromIndex,
};
