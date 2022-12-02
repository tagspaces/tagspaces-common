/**
 * TagSpaces - universal file and folder organizer
 * Copyright (C) 2017-present TagSpaces UG (haftungsbeschraenkt)
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License (version 3) as
 * published by the Free Software Foundation.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 *
 */

const {
  watchDirectory,
  getLocationPath,
  setLanguage,
  isWorkerAvailable,
  readMacOSTags,
  watchFolder,
  tiffJs,
  setZoomFactorElectron,
  setGlobalShortcuts,
  showMainWindow,
  quitApp,
  focusWindow,
  getDevicePaths,
  createDirectoryTree,
  createDirectoryIndexInWorker,
  createThumbnailsInWorker,
  listDirectoryPromise,
  listMetaDirectoryPromise,
  getPropertiesPromise,
  createDirectoryPromise,
  copyFilePromise,
  renameFilePromise,
  renameDirectoryPromise,
  loadTextFilePromise,
  getFileContentPromise,
  saveFilePromise,
  saveTextFilePromise,
  saveBinaryFilePromise,
  deleteFilePromise,
  moveToTrash,
  deleteDirectoryPromise,
  openDirectory,
  showInFileManager,
  openFile,
  resolveFilePath,
  openUrl,
  selectFileDialog,
  selectDirectoryDialog,
  shareFiles,
  createNewInstance,
  checkFileExist,
  checkDirExist,
} = require("./index");
const AppConfig = require("@tagspaces/tagspaces-common/AppConfig");
const Indexer = require("./indexer");

let objectStoreAPI, webDavAPI;

function platformEnableObjectStoreSupport(objectStoreConfig) {
  platformDisableWebdavSupport();
  return new Promise((resolve, reject) => {
    if (
      objectStoreAPI !== undefined &&
      objectStoreAPI.config().bucketName === objectStoreConfig.bucketName &&
      objectStoreAPI.config().secretAccessKey ===
        objectStoreConfig.secretAccessKey &&
      objectStoreAPI.config().region === objectStoreConfig.region &&
      objectStoreAPI.config().endpointURL === objectStoreConfig.endpointURL &&
      objectStoreAPI.config().accessKeyId === objectStoreConfig.accessKeyId
    ) {
      resolve();
    } else {
      objectStoreAPI = require("./aws");
      objectStoreAPI.configure(objectStoreConfig);
      resolve();
    }
  });
}

function platformDisableObjectStoreSupport() {
  objectStoreAPI = undefined;
}

function platformEnableWebdavSupport(webdavConfig) {
  platformDisableObjectStoreSupport();
  if (
    webDavAPI === undefined ||
    webDavAPI.username !== webdavConfig.username ||
    webDavAPI.password !== webdavConfig.password ||
    webDavAPI.port !== webdavConfig.port
  ) {
    webDavAPI = require("@tagspaces/tagspaces-common-webdav");
    webDavAPI.configure(webdavConfig);
  }
}

function platformDisableWebdavSupport() {
  webDavAPI = undefined;
}

function platformHaveObjectStoreSupport() {
  return objectStoreAPI !== undefined;
}

function platformHaveWebDavSupport() {
  return webDavAPI !== undefined;
}

function platformIsMinio() {
  return objectStoreAPI !== undefined && objectStoreAPI.config().endpointURL;
}

function platformGetDirSeparator() {
  // TODO rethink usage for S3 on Win
  return platformHaveObjectStoreSupport() || platformHaveWebDavSupport()
    ? "/"
    : AppConfig.dirSeparator;
}

function platformWatchDirectory(dirPath, listener) {
  if (watchDirectory) {
    watchDirectory(dirPath, listener);
  } else {
    console.log("watchDirectory not supported");
  }
}

function platformGetLocationPath(location) {
  if (getLocationPath) {
    return getLocationPath(location);
  }
  return location ? location.path : "";
}

function platformSetLanguage(language) {
  if (setLanguage) {
    setLanguage(language);
  } else {
    console.log("setLanguage not supported");
  }
}

function platformIsWorkerAvailable() {
  if (isWorkerAvailable) {
    return isWorkerAvailable();
  }
  return false;
}

function platformReadMacOSTags(filename) {
  if (readMacOSTags) {
    return readMacOSTags(filename);
  }
  return false;
}

function platformWatchFolder(locationPath, options) {
  if (watchFolder) {
    return watchFolder(locationPath, options);
  }
  return undefined;
}

function platformTiffJs() {
  if (tiffJs) {
    return tiffJs();
  }
  return undefined;
}

function platformSetZoomFactorElectron(zoomLevel) {
  if (setZoomFactorElectron) {
    setZoomFactorElectron(zoomLevel);
  } else {
    console.log("setZoomFactorElectron not supported");
  }
}

function platformSetGlobalShortcuts(globalShortcutsEnabled) {
  if (setGlobalShortcuts) {
    setGlobalShortcuts(globalShortcutsEnabled);
  } else {
    console.log("setGlobalShortcuts not supported");
  }
}

function platformShowMainWindow() {
  showMainWindow();
}

function platformQuitApp() {
  quitApp();
}

function platformFocusWindow() {
  focusWindow();
}

function platformGetDevicePaths() {
  if (getDevicePaths) {
    return getDevicePaths();
  } else {
    console.log("getDevicePaths not supported");
    return Promise.resolve(undefined);
  }
}

/**
 * @param path : string
 * @param expirationInSeconds?: number
 */
function platformGetURLforPath(path, expirationInSeconds) {
  if (objectStoreAPI) {
    const param = {
      path,
      bucketName: objectStoreAPI.config().bucketName,
    };
    return objectStoreAPI.getURLforPath(param, expirationInSeconds);
  } else if (webDavAPI) {
    return webDavAPI.getURLforPath(path);
  }
}

function platformCreateIndex(
  param,
  mode = ["extractThumbPath"],
  ignorePatterns = [],
  listDirectory = undefined,
  loadTextFile = undefined
) {
  if (objectStoreAPI) {
    param = {
      ...param,
      bucketName: objectStoreAPI.config().bucketName,
    };
  }
  return Indexer.createIndex(
    param,
    mode,
    ignorePatterns,
    listDirectory,
    loadTextFile
  );
}

function platformCreateDirectoryTree(directoryPath) {
  if (createDirectoryTree) {
    return createDirectoryTree(directoryPath);
  }
  return undefined;
}

/**
 * @param token
 * @param directoryPath: string
 * @param extractText: boolean
 * @param ignorePatterns: Array<string>
 */
function platformCreateDirectoryIndexInWorker(
  token,
  directoryPath,
  extractText,
  ignorePatterns
) {
  return createDirectoryIndexInWorker(
    token,
    directoryPath,
    extractText,
    ignorePatterns
  );
}

/**
 * @param token
 * @param tmbGenerationList: Array<string>
 */
function platformCreateThumbnailsInWorker(token, tmbGenerationList) {
  return createThumbnailsInWorker(token, tmbGenerationList);
}

/**
 * Promise === undefined on error
 * @param path: string
 * @param mode = ['extractTextContent', 'extractThumbPath']
 * @param ignorePatterns: Array<string> = []
 */
function platformListDirectoryPromise(
  path,
  mode = ["extractThumbPath"],
  ignorePatterns
) {
  if (objectStoreAPI) {
    const param = {
      path,
      bucketName: objectStoreAPI.config().bucketName,
    };
    return objectStoreAPI.listDirectoryPromise(param, mode, ignorePatterns);
  } else if (webDavAPI) {
    return webDavAPI.listDirectoryPromise(path, mode, ignorePatterns);
  }
  return listDirectoryPromise(path, mode, ignorePatterns);
}

function platformListMetaDirectoryPromise(path) {
  if (objectStoreAPI) {
    const param = {
      path,
      bucketName: objectStoreAPI.config().bucketName,
    };
    return objectStoreAPI.listMetaDirectoryPromise(param);
  } else if (webDavAPI) {
    return webDavAPI.listMetaDirectoryPromise(path);
  }
  return listMetaDirectoryPromise(path);
}

/**
 * @deprecated TODO for remove (use listDirectoryPromise only) -> after set path to param
 * @param param
 * @param mode
 * @param ignorePatterns
 */
function platformListObjectStoreDir(
  param,
  mode = ["extractThumbPath"],
  ignorePatterns = []
) {
  return objectStoreAPI.listDirectoryPromise(param, mode, ignorePatterns);
}

/**
 * @param path: string
 */
function platformGetPropertiesPromise(path) {
  if (objectStoreAPI) {
    const param = {
      path,
      bucketName: objectStoreAPI.config().bucketName,
    };
    return objectStoreAPI.getPropertiesPromise(param);
  } else if (webDavAPI) {
    return webDavAPI.getPropertiesPromise(path);
  }
  return getPropertiesPromise(path);
}

/*static ignoreByWatcher = (...paths) => {   // TODO Pro..
    if (Pro && Pro.Watcher && Pro.Watcher.isWatching()) {
      for (let i = 0; i < paths.length; i += 1) {
        Pro.Watcher.addToIgnored(paths[i]);
      }
    }
  };

  static deignoreByWatcher = (...paths) => {
    if (Pro && Pro.Watcher && Pro.Watcher.isWatching()) {
      for (let i = 0; i < paths.length; i += 1) {
        Pro.Watcher.removeFromIgnored(paths[i]);
      }
    }
  };*/

function platformCreateDirectoryPromise(dirPath) {
  if (objectStoreAPI) {
    const param = {
      path: dirPath,
      bucketName: objectStoreAPI.config().bucketName,
    };
    return objectStoreAPI.createDirectoryPromise(param);
  } else if (webDavAPI) {
    return webDavAPI.createDirectoryPromise(dirPath);
  }
  // PlatformIO.ignoreByWatcher(dirPath); // TODO rethink move Watcher

  return createDirectoryPromise(dirPath).then((result) => {
    // PlatformIO.deignoreByWatcher(dirPath);
    return result;
  });
}

/**
 * @param sourceFilePath: string
 * @param targetFilePath: string
 */
async function platformCopyFilePromise(sourceFilePath, targetFilePath) {
  return copyFilePromiseOverwrite(sourceFilePath, targetFilePath);
}

/**
 * @param sourceFilePath
 * @param targetFilePath - if exist overwrite it
 */
function copyFilePromiseOverwrite(sourceFilePath, targetFilePath) {
  if (objectStoreAPI) {
    const param = {
      path: sourceFilePath,
      bucketName: objectStoreAPI.config().bucketName,
    };
    return objectStoreAPI.copyFilePromise(param, targetFilePath);
  } else if (webDavAPI) {
    return webDavAPI.copyFilePromise(sourceFilePath, targetFilePath);
  }
  // PlatformIO.ignoreByWatcher(targetFilePath);

  return copyFilePromise(sourceFilePath, targetFilePath).then((result) => {
    // PlatformIO.deignoreByWatcher(targetFilePath);
    return result;
  });
}

function platformRenameFilePromise(filePath, newFilePath) {
  if (objectStoreAPI) {
    const param = {
      path: filePath,
      bucketName: objectStoreAPI.config().bucketName,
    };
    return objectStoreAPI.renameFilePromise(param, newFilePath);
    // .then(result => result);
  } else if (webDavAPI) {
    return webDavAPI.renameFilePromise(filePath, newFilePath);
  }
  // PlatformIO.ignoreByWatcher(filePath, newFilePath);

  return renameFilePromise(filePath, newFilePath).then((result) => {
    // PlatformIO.deignoreByWatcher(filePath, newFilePath);
    return result;
  });
}

function platformRenameDirectoryPromise(dirPath, newDirName) {
  if (objectStoreAPI) {
    const param = {
      path: dirPath,
      bucketName: objectStoreAPI.config().bucketName,
    };
    return objectStoreAPI.renameDirectoryPromise(param, newDirName);
  } else if (webDavAPI) {
    return webDavAPI.renameDirectoryPromise(dirPath, newDirName);
  }
  // PlatformIO.ignoreByWatcher(dirPath, newDirName);

  return renameDirectoryPromise(dirPath, newDirName).then((result) => {
    // PlatformIO.deignoreByWatcher(dirPath, newDirName);
    return result;
  });
}

function platformLoadTextFilePromise(filePath, isPreview) {
  if (objectStoreAPI) {
    const param = {
      path: filePath,
      bucketName: objectStoreAPI.config().bucketName,
    };
    return objectStoreAPI.loadTextFilePromise(param, isPreview);
  } else if (webDavAPI) {
    return webDavAPI.loadTextFilePromise(filePath, isPreview);
  }
  return loadTextFilePromise(filePath, isPreview);
}

function platformGetFileContentPromise(filePath, type) {
  if (objectStoreAPI) {
    const param = {
      path: filePath,
      bucketName: objectStoreAPI.config().bucketName,
    };
    return objectStoreAPI.getFileContentPromise(param, type);
  } else if (webDavAPI) {
    return webDavAPI.getFileContentPromise(filePath, type);
  }
  return getFileContentPromise(filePath, type);
}

function platformGetLocalFileContentPromise(filePath, type) {
  return getFileContentPromise(filePath, type);
}

function platformSaveFilePromise(filePath, content, overwrite) {
  if (objectStoreAPI) {
    const param = {
      path: filePath,
      bucketName: objectStoreAPI.config().bucketName,
    };
    return objectStoreAPI.saveFilePromise(param, content, overwrite);
  } else if (webDavAPI) {
    return webDavAPI.saveFilePromise(filePath, content, overwrite);
  }

  return saveFilePromise(filePath, content, overwrite);
}

function saveTextFilePlatform(param, content, overwrite) {
  if (objectStoreAPI) {
    return objectStoreAPI.saveTextFilePromise(param, content, overwrite);
  } else if (webDavAPI) {
    return webDavAPI.saveTextFilePromise(param.path, content, overwrite);
  }
  return platformSaveTextFilePromise(param.path, content, overwrite);
}

function platformSaveTextFilePromise(filePath, content, overwrite) {
  if (objectStoreAPI) {
    const param = {
      path: filePath,
      bucketName: objectStoreAPI.config().bucketName,
    };
    return objectStoreAPI.saveTextFilePromise(param, content, overwrite);
  } else if (webDavAPI) {
    return webDavAPI.saveTextFilePromise(filePath, content, overwrite);
  }

  return saveTextFilePromise(filePath, content, overwrite);
}

function platformSaveBinaryFilePromise(
  filePath,
  content,
  overwrite,
  onUploadProgress
) {
  if (objectStoreAPI) {
    const param = {
      path: filePath,
      bucketName: objectStoreAPI.config().bucketName,
    };
    return objectStoreAPI.saveBinaryFilePromise(
      param,
      content,
      overwrite,
      onUploadProgress
    );
  } else if (webDavAPI) {
    return webDavAPI.saveBinaryFilePromise(
      filePath,
      content,
      overwrite,
      onUploadProgress
    );
  }

  return saveBinaryFilePromise(filePath, content, overwrite).then(
    (succeeded) => {
      if (succeeded && onUploadProgress) {
        onUploadProgress({ key: filePath, loaded: 1, total: 1 }, undefined);
      }
      return succeeded;
    }
  );
}

function platformUploadFileByMultiPart(
  filePath,
  file,
  overwrite,
  onUploadProgress
) {
  if (objectStoreAPI) {
    const param = {
      path: filePath,
      bucketName: objectStoreAPI.config().bucketName,
    };
    return objectStoreAPI.uploadFileByMultiPart(
      param,
      file,
      overwrite,
      onUploadProgress
    );
  }
}

function platformDeleteFilePromise(path, useTrash) {
  if (objectStoreAPI) {
    const param = {
      path,
      bucketName: objectStoreAPI.config().bucketName,
    };
    return objectStoreAPI.deleteFilePromise(param);
  } else if (webDavAPI) {
    return webDavAPI.deleteFilePromise(path);
  }
  if (useTrash && moveToTrash) {
    return moveToTrash([path]);
  } else {
    return deleteFilePromise(path);
  }
}

function platformDeleteDirectoryPromise(path, useTrash) {
  if (objectStoreAPI) {
    const param = {
      path,
      bucketName: objectStoreAPI.config().bucketName,
    };
    return objectStoreAPI.deleteDirectoryPromise(param);
  } else if (webDavAPI) {
    return webDavAPI.deleteDirectoryPromise(path);
  }

  if (useTrash && moveToTrash) {
    return moveToTrash([path]);
  } else {
    return deleteDirectoryPromise(path);
  }
}

function platformOpenDirectory(dirPath) {
  return openDirectory(dirPath);
}

function platformShowInFileManager(dirPath) {
  return showInFileManager(dirPath);
}

function platformOpenFile(filePath) {
  openFile(filePath);
}

function platformResolveFilePath(filePath) {
  return objectStoreAPI ? filePath : resolveFilePath(filePath);
}

function platformOpenUrl(url) {
  openUrl(url);
}

/**
 * TODO not used
 * @returns {*}
 */
function platformSelectFileDialog() {
  return selectFileDialog();
}

function platformSelectDirectoryDialog() {
  return selectDirectoryDialog();
}

function platformShareFiles(files) {
  if (AppConfig.isCordova) {
    shareFiles(files);
  } else {
    console.log("shareFiles is implemented in Cordova only.");
  }
}

function platformCreateNewInstance(url) {
  if (AppConfig.isElectron) {
    return createNewInstance(url);
  } else {
    console.log("Creating new instances is supported only on Electron.");
  }
}

function platformCheckFileExist(file) {
  if (AppConfig.isCordova) {
    return checkFileExist(file);
  }
  return getPropertiesPromise(file).then((stats) => {
    return stats && stats.isFile;
  });
}

function platformCheckDirExist(dir) {
  if (AppConfig.isCordova) {
    return checkDirExist(dir);
  }
  // In cordova this check is too expensive for dirs like /.ts
  return getPropertiesPromise(dir).then((stats) => {
    return stats && !stats.isFile;
  });
}

module.exports = {
  platformGetLocationPath,
  platformSetLanguage,
  platformIsWorkerAvailable,
  platformReadMacOSTags,
  platformWatchFolder,
  platformTiffJs,
  platformSetZoomFactorElectron,
  platformSetGlobalShortcuts,
  platformShowMainWindow,
  platformQuitApp,
  platformEnableObjectStoreSupport,
  platformEnableWebdavSupport,
  platformDisableObjectStoreSupport,
  platformDisableWebdavSupport,
  platformHaveObjectStoreSupport,
  platformHaveWebDavSupport,
  platformIsMinio,
  platformGetDirSeparator,
  platformWatchDirectory,
  platformFocusWindow,
  platformGetDevicePaths,
  platformGetURLforPath,
  platformCreateDirectoryTree,
  platformCreateDirectoryIndexInWorker,
  platformCreateThumbnailsInWorker,
  platformListDirectoryPromise,
  platformListMetaDirectoryPromise,
  platformListObjectStoreDir,
  platformGetPropertiesPromise,
  platformCreateDirectoryPromise,
  platformCopyFilePromise,
  platformRenameFilePromise,
  platformRenameDirectoryPromise,
  platformLoadTextFilePromise,
  platformGetFileContentPromise,
  platformGetLocalFileContentPromise,
  platformSaveFilePromise,
  platformUploadFileByMultiPart,
  saveTextFilePlatform,
  platformSaveTextFilePromise,
  platformSaveBinaryFilePromise,
  platformDeleteFilePromise,
  platformDeleteDirectoryPromise,
  platformOpenDirectory,
  platformShowInFileManager,
  platformOpenFile,
  platformResolveFilePath,
  platformOpenUrl,
  platformSelectFileDialog,
  platformSelectDirectoryDialog,
  platformShareFiles,
  platformCreateIndex,
  platformCreateNewInstance,
  platformCheckDirExist,
  platformCheckFileExist,
};
