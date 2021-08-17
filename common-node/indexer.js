import { loadTextFilePromise, saveTextFilePromise } from "./io-node";
const { normalizePath } = require("tagspaces-common/paths");
const { loadJSONString } = require("tagspaces-common/utils-io");
const AppConfig = require("tagspaces-common/AppConfig");

const persistIndex = function (directoryPath, directoryIndex) {
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
};

/**
 * works only for Electron use loadJsonContent() with PlatformIO instead
 * @param directoryPath: string
 * @param dirSeparator: string
 * @returns {Promise<Array<Object>>}
 */
const loadIndex = function (
  directoryPath,
  dirSeparator = AppConfig.dirSeparator
) {
  const folderIndexPath = getMetaIndexFilePath(directoryPath);
  return loadJSONFile(folderIndexPath)
    .then((directoryIndex) => {
      return enhanceDirectoryIndex(directoryPath, directoryIndex, dirSeparator);
    })
    .catch((err) => {
      console.log("Error loadIndex", err);
    });
};

const loadJsonContent = function (
  directoryPath,
  jsonContent,
  dirSeparator = AppConfig.dirSeparator
) {
  const directoryIndex = loadJSONString(jsonContent);
  return enhanceDirectoryIndex(directoryPath, directoryIndex, dirSeparator);
};

const enhanceDirectoryIndex = function (
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
};

const getMetaIndexFilePath = (
  directoryPath,
  dirSeparator = AppConfig.dirSeparator
) => {
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
};

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

export {
  persistIndex,
  loadIndex,
  loadJsonContent,
  getMetaIndexFilePath,
  loadJSONFile,
};
