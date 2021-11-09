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
  getDevicePaths,
  createDirectoryTree,
  createDirectoryIndexInWorker,
  createThumbnailsInWorker,
  listDirectoryPromise,
  getPropertiesPromise,
  createDirectoryPromise,
  copyFilePromise,
  renameFilePromise,
  renameDirectoryPromise,
  loadTextFilePromise,
  // getFileContentPromise,
  saveFilePromise,
  saveTextFilePromise,
  saveBinaryFilePromise,
  deleteFilePromise,
  deleteDirectoryPromise,
  openDirectory,
  showInFileManager,
  openFile,
  resolveFilePath,
  openUrl,
  selectFileDialog,
  selectDirectoryDialog,
  shareFiles,
} = require("./index");
const AppConfig = require("@tagspaces/tagspaces-common/AppConfig");

let objectStoreAPI;

function enableObjectStoreSupport(objectStoreConfig) {
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

function disableObjectStoreSupport() {
  objectStoreAPI = undefined;
}

function haveObjectStoreSupport() {
  return objectStoreAPI !== undefined;
}

function isMinio() {
  return objectStoreAPI !== undefined && objectStoreAPI.config().endpointURL;
}

function getDirSeparator() {
  // TODO rethink usage for S3 on Win
  return haveObjectStoreSupport() ? "/" : AppConfig.dirSeparator;
}

function platformWatchDirectoryIO(dirPath, listener) {
  watchDirectory(dirPath, listener);
}

function platformGetDevicePaths() {
  getDevicePaths();
}

/**
 * @param path : string
 * @param expirationInSeconds?: number
 */
function getURLforPath(path, expirationInSeconds) {
  if (objectStoreAPI) {
    const param = {
      path,
      bucketName: objectStoreAPI.config().bucketName,
    };
    return objectStoreAPI.getURLforPath(param, expirationInSeconds);
  }
}

function platformCreateDirectoryTree(directoryPath) {
  if (createDirectoryTree) {
    return createDirectoryTree(directoryPath);
  }
  return undefined;
}

/**
 * @param directoryPath: string
 * @param extractText: boolean
 * @param ignorePatterns: Array<string>
 */
function platformCreateDirectoryIndexInWorker(
  directoryPath,
  extractText,
  ignorePatterns
) {
  return createDirectoryIndexInWorker(
    directoryPath,
    extractText,
    ignorePatterns
  );
}

/**
 * @param tmbGenerationList: Array<string>
 */
function platformCreateThumbnailsInWorker(tmbGenerationList) {
  return createThumbnailsInWorker(tmbGenerationList);
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
  }
  return listDirectoryPromise(path, mode, ignorePatterns);
}

/**
 * @deprecated TODO for remove (use listDirectoryPromise only)
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
async function platformCopyFilePromise(
  sourceFilePath,
  targetFilePath
) {
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
  }
  return loadTextFilePromise(filePath, isPreview);
}

/*function platformGetFileContentPromise(filePath, type) {
  if (objectStoreAPI) {
    const param = {
      path: filePath,
      bucketName: objectStoreAPI.config().bucketName,
    };
    return objectStoreAPI.getFileContentPromise(param, type);
  }
  return getFileContentPromise(filePath, type);
}*/

function platformSaveFilePromise(filePath, content, overwrite) {
  if (objectStoreAPI) {
    const param = {
      path: filePath,
      bucketName: objectStoreAPI.config().bucketName,
    };
    return objectStoreAPI.saveFilePromise(param, content, overwrite);
  }
  //PlatformIO.ignoreByWatcher(filePath);

  return saveFilePromise(filePath, content, overwrite).then((result) => {
    //PlatformIO.deignoreByWatcher(filePath);
    return result;
  });
}

function saveTextFilePlatform(param, content, overwrite) {
  if (objectStoreAPI) {
    return objectStoreAPI.saveTextFilePromise(param, content, overwrite);
  }

  // PlatformIO.ignoreByWatcher(param.path);

  return platformSaveTextFilePromise(param.path, content, overwrite).then(
    (result) => {
      // PlatformIO.deignoreByWatcher(param.path);
      return result;
    }
  );
}

function platformSaveTextFilePromise(filePath, content, overwrite) {
  if (objectStoreAPI) {
    const param = {
      path: filePath,
      bucketName: objectStoreAPI.config().bucketName,
    };
    return objectStoreAPI.saveTextFilePromise(param, content, overwrite);
  }

  // PlatformIO.ignoreByWatcher(filePath);

  return saveTextFilePromise(filePath, content, overwrite).then((result) => {
    // PlatformIO.deignoreByWatcher(filePath);
    return result;
  });
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
  }
  // PlatformIO.ignoreByWatcher(filePath);

  return saveBinaryFilePromise(filePath, content, overwrite).then(
    (succeeded) => {
      if (succeeded && onUploadProgress) {
        onUploadProgress({ key: filePath, loaded: 1, total: 1 }, undefined);
      }
      // PlatformIO.deignoreByWatcher(filePath);
      return succeeded;
    }
  );
}

function platformDeleteFilePromise(path, useTrash) {
  if (objectStoreAPI) {
    const param = {
      path,
      bucketName: objectStoreAPI.config().bucketName,
    };
    return objectStoreAPI.deleteFilePromise(param, useTrash);
  }
  // PlatformIO.ignoreByWatcher(path);

  return deleteFilePromise(path, useTrash).then((result) => {
    // PlatformIO.deignoreByWatcher(path);
    return result;
  });
}

function platformDeleteDirectoryPromise(path, useTrash) {
  if (objectStoreAPI) {
    const param = {
      path,
      bucketName: objectStoreAPI.config().bucketName,
    };
    return objectStoreAPI.deleteDirectoryPromise(param, useTrash);
  }
  //PlatformIO.ignoreByWatcher(path);

  return deleteDirectoryPromise(path, useTrash).then((result) => {
    //PlatformIO.deignoreByWatcher(path);
    return result;
  });
}

function platformOpenDirectory(dirPath) {
  return openDirectory(dirPath);
}

function platformShowInFileManager(dirPath) {
  return showInFileManager(dirPath);
}

function platformOpenFile(filePath, warningOpeningFilesExternally) {
  if (
    !warningOpeningFilesExternally ||
    confirm(
      'Do you really want to open "' +
        filePath +
        '"? Execution of some files can be potentially dangerous!'
    )
  ) {
    openFile(filePath);
  }
}

function platformResolveFilePath(filePath) {
  return objectStoreAPI ? filePath : resolveFilePath(filePath);
}

function platformOpenUrl(url) {
  openUrl(url);
}

function platformSelectFileDialog() {
  selectFileDialog();
}

function platformSelectDirectoryDialog() {
  selectDirectoryDialog();
}

function platformShareFiles(files) {
  if (AppConfig.isCordova) {
    shareFiles(files);
  } else {
    console.log("shareFiles is implemented in Cordova only.");
  }
}

module.exports = {
  enableObjectStoreSupport,
  disableObjectStoreSupport,
  haveObjectStoreSupport,
  isMinio,
  getDirSeparator,
  platformWatchDirectoryIO,
  platformGetDevicePaths,
  getURLforPath,
  platformCreateDirectoryTree,
  platformCreateDirectoryIndexInWorker,
  platformListDirectoryPromise,
  platformGetPropertiesPromise,
  platformCreateDirectoryPromise,
  platformCopyFilePromise,
  platformRenameFilePromise,
  platformRenameDirectoryPromise,
  platformLoadTextFilePromise,
  // platformGetFileContentPromise,
  platformSaveFilePromise,
  saveTextFilePlatform,
  platformSaveTextFilePromise,
  platformSaveBinaryFilePromise,
  platformDeleteFilePromise,
  platformDeleteDirectoryPromise
};
