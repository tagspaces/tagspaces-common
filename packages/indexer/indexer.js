const {
  normalizePath,
  extractContainingDirectoryPath,
  extractFileName,
  extractFileExtension,
  joinPaths,
  cleanRootPath,
  cleanTrailingDirSeparator,
} = require("@tagspaces/tagspaces-common/paths");
const {
  loadJSONString,
  walkDirectory,
  getUuid,
} = require("@tagspaces/tagspaces-common/utils-io");
const AppConfig = require("@tagspaces/tagspaces-common/AppConfig");

// Pre-compile regex pattern for newline replacement to avoid recreating it on every call
const NEWLINE_REGEX = /[\r\n]+/g;

/**
 * Helper function to extract directory path from param object
 * Handles both string and object param types
 */
function extractDirectoryPath(param) {
  return typeof param === "object" && param !== null ? param.path : param;
}

/**
 * Helper function to clean and process description metadata
 */
function cleanDescription(description) {
  if (!description) return undefined;
  return description.replace(NEWLINE_REGEX, " ").trim();
}

/**
 * Helper function to safely parse JSON with error handling
 */
function safeJSONParse(jsonString, filePath) {
  if (!jsonString) return [];
  try {
    return JSON.parse(jsonString.trim()) || [];
  } catch (ex) {
    console.warn(`Error JSON.parse for ${filePath}:`, ex);
    return [];
  }
}

/**
 * Helper function to check if path is in meta folder
 */
function isMetaFolderPath(path) {
  return path.indexOf(AppConfig.metaFolder + "/") !== -1;
}

/**
 * @param param param.listDirectoryPromise function is required, add getFileContentPromise function to get meta in index
 * @param mode  ['extractTextContent', 'extractLinks', 'extractThumbURL', 'extractThumbPath']
 * @param ignorePatterns: Array<string>
 * @param isWalking
 * @returns {Promise<*>}
 */
function createIndex(
  param,
  mode = ["loadMeta"], //"extractThumbPath"],
  ignorePatterns = [],
  isWalking = () => true,
) {
  const {
    listDirectoryPromise,
    getFileContentPromise,
    extractPDFcontent,
    ...restParam
  } = param;
  if (!listDirectoryPromise) {
    return Promise.reject(
      new Error("Error creating index: no listDirectoryPromise in params!"),
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
      directoryIndex.push(getIndexedEntry(fileEntry, path));
    },
    async (directoryEntry) => {
      if (directoryEntry.name !== AppConfig.metaFolder) {
        counter += 1;
        directoryIndex.push(getIndexedEntry(directoryEntry, path));
      }
    },
    ignorePatterns,
    isWalking,
  )
    .then(() => {
      // entries - can be used for further processing
      // window.walkCanceled = false;
      console.log(
        "Directory index created " +
          path +
          " containing " +
          directoryIndex.length,
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

function getIndexedEntry(entry, dirPath) {
  if (!entry) return null;
  const { tags, bucketName, ...cleanEntry } = entry;
  const cleanedDescription = cleanDescription(entry.meta?.description);
  const meta = {};
  
  // Build meta object only with non-empty values
  if (entry.meta?.tags) {
    meta.tags = entry.meta.tags;
  }
  if (entry.meta?.color) {
    meta.color = entry.meta.color;
  }
  if (cleanedDescription) {
    meta.description = cleanedDescription;
  }
  
  const indexedEntry = {
    ...cleanEntry,
    uuid: entry.meta?.id || getUuid(),
    path: cleanRootPath(entry.path, dirPath),
  };
  
  // Only add extension for files
  if (entry.isFile) {
    indexedEntry.extension = extractFileExtension(entry.name, AppConfig.dirSeparator);
  }
  
  // Only add meta if it has content
  if (Object.keys(meta).length > 0) {
    indexedEntry.meta = meta;
  }
  
  return indexedEntry;
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
  const directoryPath = extractDirectoryPath(param);
  const folderIndexPath = getMetaIndexFilePath(directoryPath);
  const indexJson = JSON.stringify(directoryIndex);
  
  return param
    .saveTextFilePromise(
      { ...param, path: folderIndexPath },
      indexJson,
      true,
    )
    .then((result) => {
      if (result) {
        console.log(
          `Index persisted for: ${directoryPath} to ${folderIndexPath}`,
        );
      }
      return result;
    })
    .catch((err) => {
      console.error(`Error saving the index for ${folderIndexPath}`, err);
    });
}

/**
 * @param param
 * @param getPropertiesPromise function
 * @returns {Promise<boolean>}
 */
function hasIndex(param, getPropertiesPromise) {
  const directoryPath = extractDirectoryPath(param);
  const folderIndexPath = getMetaIndexFilePath(directoryPath);
  
  return getPropertiesPromise({ ...param, path: folderIndexPath })
    .then((lstat) => !!(lstat && lstat.isFile))
    .catch((err) => {
      console.log("Error hasIndex", err);
      return false;
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
  getFileContentPromise,
) {
  const directoryPath = extractDirectoryPath(param);
  const locationID = typeof param === "object" ? param.locationID : undefined;
  const folderIndexPath = getMetaIndexFilePath(directoryPath);
  
  return loadJSONFile(
    { ...param, path: folderIndexPath },
    getFileContentPromise,
  )
    .then((directoryIndex) => enhanceDirectoryIndex(
      param,
      directoryIndex,
      locationID,
      dirSeparator,
    ))
    .catch((err) => {
      console.log("Error loadIndex", err);
      return [];
    });
}

function enhanceDirectoryIndex(
  param,
  directoryIndex,
  locationID,
  dirSeparator = AppConfig.dirSeparator,
) {
  if (!directoryIndex) {
    return undefined;
  }
  let directoryPath = extractDirectoryPath(param);
  
  // Optimize path normalization for Cordova platform
  if (AppConfig.isCordova) {
    if (!directoryPath.startsWith(dirSeparator)) {
      directoryPath = dirSeparator + directoryPath;
    }
    directoryPath = cleanTrailingDirSeparator(directoryPath);
  }
  
  // Cache the platform path conversion function result
  const convertPath = (entryPath) => joinPaths(
    dirSeparator,
    directoryPath,
    toPlatformPath(entryPath),
  );
  
  return directoryIndex.map((entry) => ({
    ...entry,
    locationID,
    path: convertPath(entry.path),
  }));
}

function toPlatformPath(path, dirSeparator = AppConfig.dirSeparator) {
  // index is created with Unix dir separator /
  // only convert on Windows platform
  return AppConfig.isWin ? path.replaceAll("/", dirSeparator) : path;
}

function addToIndex(param, size, lastModified) {
  if (!param.getFileContentPromise) {
    console.error("addToIndex param.getFileContentPromise is not set!");
    return Promise.resolve(false);
  }
  if (!param.saveTextFilePromise) {
    console.error("addToIndex param.saveTextFilePromise is not set!");
    return Promise.resolve(false);
  }
  
  if (isMetaFolderPath(param.path)) {
    console.info(`addToIndex skip meta folder ${param.path}`);
    return Promise.resolve(true);
  }
  
  const dirPath = extractContainingDirectoryPath(param.path, "/");
  const metaFilePath = getMetaIndexFilePath(dirPath);
  
  console.info(
    `addToIndex path:${param.path} size:${size} LastModified:${lastModified} bucketName:${param.bucketName}`,
  );
  
  const newEntry = {
    ...param,
    name: extractFileName(param.path),
    tags: [],
    isFile: true,
    size,
    lmdt: Date.parse(lastModified),
  };
  
  const persistIndexParam = {
    ...param,
    path: dirPath,
    saveTextFilePromise: param.saveTextFilePromise,
  };
  
  return param
    .getFileContentPromise(
      { path: metaFilePath, bucketName: param.bucketName },
      "text",
    )
    .then((metaFileContent) => {
      console.info(`addToIndex metaFileContent:${metaFileContent}`);
      const tsi = safeJSONParse(metaFileContent, metaFilePath);
      tsi.push(newEntry);
      return persistIndex(persistIndexParam, tsi);
    })
    .catch((err) => {
      console.info("addToIndex:", err);
      const tsi = [newEntry];
      return persistIndex(persistIndexParam, tsi);
    });
}

function removeFromIndex(param) {
  if (!param.getFileContentPromise) {
    console.error("removeFromIndex param.getFileContentPromise is not set!");
    return Promise.resolve(false);
  }
  if (!param.saveTextFilePromise) {
    console.error("removeFromIndex param.saveTextFilePromise is not set!");
    return Promise.resolve(false);
  }
  
  console.info(`removeFromIndex path:${param.path} bucket:${param.bucketName}`);
  
  if (isMetaFolderPath(param.path)) {
    console.info(`removeFromIndex skip meta folder ${param.path}`);
    return Promise.resolve(true);
  }
  
  const dirPath = extractContainingDirectoryPath(param.path, "/");
  const metaFilePath = getMetaIndexFilePath(dirPath);
  
  const persistIndexParam = {
    ...param,
    path: dirPath,
    saveTextFilePromise: param.saveTextFilePromise,
  };
  
  return param
    .getFileContentPromise(
      { ...param, path: metaFilePath },
      "text",
    )
    .then((metaFileContent) => {
      const tsi = safeJSONParse(metaFileContent, metaFilePath);
      const newTsi = tsi.filter((item) => item.path !== param.path);
      
      // Only persist if entries were actually removed
      if (tsi.length !== newTsi.length) {
        return persistIndex(persistIndexParam, newTsi);
      }
      return undefined;
    })
    .catch((err) => {
      console.error("removeFromIndex:", err);
      return false;
    });
}

function getMetaIndexFilePath(
  directoryPath,
  dirSeparator = AppConfig.dirSeparator,
) {
  // Build path more efficiently with conditional logic
  const basePath = directoryPath && directoryPath.length > 0 && directoryPath !== dirSeparator
    ? `${directoryPath}${dirSeparator}`
    : "";
  
  return normalizePath(
    `${basePath}${AppConfig.metaFolder}${dirSeparator}${AppConfig.folderIndexFile}`,
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
      console.log(`File not exist: ${param.path}`, e);
      return undefined;
    });
}

module.exports = {
  createIndex,
  persistIndex,
  hasIndex,
  loadIndex,
  enhanceDirectoryIndex,
  getMetaIndexFilePath,
  loadJSONFile,
  addToIndex,
  removeFromIndex,
};
