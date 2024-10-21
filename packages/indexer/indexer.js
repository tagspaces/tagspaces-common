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
 * @param param param.listDirectoryPromise function is required, add getFileContentPromise function to get meta in index
 * @param mode  ['extractTextContent', 'extractThumbURL', 'extractThumbPath']
 * @param ignorePatterns: Array<string>
 * @param isWalking
 * @returns {Promise<*>}
 */
function createIndex(
  param,
  mode = ["extractThumbPath"],
  ignorePatterns = [],
  isWalking = () => true
) {
  const {
    listDirectoryPromise,
    getFileContentPromise,
    extractPDFcontent,
    ...restParam
  } = param;
  if (!listDirectoryPromise) {
    return Promise.reject(
      new Error("Error creating index: no listDirectoryPromise in params!")
    );
  }
  const path = restParam.path;
  // console.log("createDirectoryIndex started:" + path);
  // console.time("createDirectoryIndex");
  const directoryIndex = [];
  let counter = 0;

  return walkDirectory(
    restParam,
    listDirectoryPromise,
    {
      recursive: true,
      skipMetaFolder: true,
      skipDotHiddenFolder: true,
      mode,
      ...(extractPDFcontent && { extractText: extractPDFcontent }),
    },
    async (fileEntry) => {
      counter += 1;
      // if (counter > AppConfig.indexerLimit) { TODO set index limit
      //     console.warn('Walk canceled by ' + AppConfig.indexerLimit);
      //     window.walkCanceled = true;
      // }
      let textContent, meta;
      if (getFileContentPromise) {
        meta = await getEntryMeta(
          {
            ...restParam,
            path: getMetaFileLocationForFile(
              fileEntry.path,
              AppConfig.dirSeparator
            ),
          },
          getFileContentPromise
        );
      }
      const entry = {
        ...fileEntry,
        ...(textContent && { textContent }), // Spreads textContent only if it exists
        path: cleanRootPath(fileEntry.path, path, AppConfig.dirSeparator),
        ...(meta && meta),
      };
      directoryIndex.push(enhanceEntry(entry));
    },
    async (directoryEntry) => {
      if (directoryEntry.name !== AppConfig.metaFolder) {
        counter += 1;
        let meta;
        if (getFileContentPromise) {
          meta = await getEntryMeta(
            {
              ...restParam,
              path: getMetaFileLocationForDir(directoryEntry.path),
            },
            getFileContentPromise
          );
        }
        const entry = {
          name: directoryEntry.name,
          isFile: directoryEntry.isFile,
          tags: directoryEntry.tags,
          path: cleanRootPath(
            directoryEntry.path,
            path,
            AppConfig.dirSeparator
          ),
          ...(meta && meta),
        };
        directoryIndex.push(enhanceEntry(entry));
      }
    },
    ignorePatterns,
    isWalking
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
      return directoryIndex;
    });
}

/**
 * @param param = {path: , bucketName: }
 * @param getFileContentPromise  function
 * @returns {Promise<*>}
 */
async function getEntryMeta(param, getFileContentPromise) {
  //metaFilePath) {
  // const metaFileProps = await getPropertiesPromise(metaFilePath);
  // if (metaFileProps.isFile) {
  const meta = await loadJSONFile(param, getFileContentPromise); // { path: metaFilePath });
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
 * @param getFileContentPromise function
 * @returns {Promise<Array<Object>>}
 */
function loadIndex(
  param,
  dirSeparator = AppConfig.dirSeparator,
  getFileContentPromise
) {
  let directoryPath, locationID;
  if (typeof param === "object" && param !== null) {
    directoryPath = param.path;
    locationID = param.locationID;
  } else {
    directoryPath = param;
  }
  const folderIndexPath = getMetaIndexFilePath(directoryPath);
  return loadJSONFile(
    { ...param, path: folderIndexPath },
    getFileContentPromise
  )
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
  if (!param.getFileContentPromise) {
    console.error("addToIndex param.getFileContentPromise is not set!");
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
    .getFileContentPromise(
      {
        path: metaFilePath,
        bucketName: param.bucketName,
      },
      "text"
    )
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
  if (!param.getFileContentPromise) {
    console.error("removeFromIndex param.getFileContentPromise is not set!");
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
    .getFileContentPromise(
      {
        ...param,
        path: metaFilePath,
      },
      "text"
    )
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
 * @param getFileContentPromise
 */
function loadJSONFile(param, getFileContentPromise) {
  if (!getFileContentPromise) {
    console.error("loadJSONFile getFileContentPromise is not set!");
    return Promise.resolve(false);
  }
  return getFileContentPromise(param, "text")
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
