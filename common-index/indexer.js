const pathJS = require("path");
const {
  loadTextFilePromise,
  saveTextFilePromise,
  listDirectoryPromise,
  getPropertiesPromise,
} = require("./index");
const { normalizePath } = require("tagspaces-common/paths");
const {
  loadJSONString,
  walkDirectory,
  enhanceEntry,
} = require("tagspaces-common/utils-io");
const AppConfig = require("tagspaces-common/AppConfig");

/**
 * @param path string
 * @param extractText: boolean = false
 * @param ignorePatterns: Array<string>
 * @returns {*}
 */
function createIndex(path, extractText = false, ignorePatterns = []) {
  // console.log("createDirectoryIndex started:" + path);
  // console.time("createDirectoryIndex");
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

  return walkDirectory(
    path,
    listDirectoryPromise,
    {
      recursive: true,
      skipMetaFolder: true,
      skipDotHiddenFolder: true,
      extractText,
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
      directoryIndex.push(enhanceEntry(entry));
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

function persistIndex(directoryPath, directoryIndex) {
  const folderIndexPath = getMetaIndexFilePath(directoryPath);
  return saveTextFilePromise(
    folderIndexPath,
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
 * @param directoryPath: string
 * @param dirSeparator: string
 * @returns {Promise<boolean>}
 */
function hasIndex(directoryPath, dirSeparator = AppConfig.dirSeparator) {
  const folderIndexPath = getMetaIndexFilePath(directoryPath, dirSeparator);
  return getPropertiesPromise(folderIndexPath)
    .then((lstat) => lstat && lstat.isFile)
    .catch((err) => {
      console.log("Error hasIndex", err);
      return Promise.resolve(false);
    });
}

/**
 * works only for Electron use loadJsonContent() with PlatformIO instead
 * @param directoryPath: string
 * @param dirSeparator: string
 * @returns {Promise<Array<Object>>}
 */
function loadIndex(directoryPath, dirSeparator = AppConfig.dirSeparator) {
  const folderIndexPath = getMetaIndexFilePath(directoryPath);
  return loadJSONFile(folderIndexPath)
    .then((directoryIndex) => {
      return enhanceDirectoryIndex(directoryPath, directoryIndex, dirSeparator);
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
  return enhanceDirectoryIndex(directoryPath, directoryIndex, dirSeparator);
}

function enhanceDirectoryIndex(
  directoryPath,
  directoryIndex,
  dirSeparator = AppConfig.dirSeparator
) {
  return directoryIndex.map((entry) => {
    if (entry.thumbPath) {
      return {
        ...entry,
        path: directoryPath + dirSeparator + entry.path,
        thumbPath: directoryPath + dirSeparator + entry.thumbPath,
      };
    }
    return {
      ...entry,
      path: directoryPath + dirSeparator + entry.path,
    };
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
 *
 * @param filePath: string
 * @returns {Promise<*>}
 */
function loadJSONFile(filePath) {
  return loadTextFilePromise(filePath).then((jsonContent) =>
    loadJSONString(jsonContent)
  );
}

module.exports = {
  createIndex,
  persistIndex,
  hasIndex,
  loadIndex,
  loadJsonContent,
  getMetaIndexFilePath,
  loadJSONFile,
};
