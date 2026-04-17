const pathLib = require("path");
const fs = require("fs-extra");
const klaw = require("klaw");
const AdmZip = require("adm-zip");
const { createFsClient } = require("@tagspaces/tagspaces-common/io-fsclient");
const fsClient = createFsClient(fs);

/**
 * TODO move it to the correct place
 * @param location: TS.Location
 * @returns {string|*}
 */
function getLocationPath(location) {
  let locationPath = "";
  if (location) {
    if (location.path) {
      locationPath = location.path;
    }
    if (location.paths && location.paths[0]) {
      // eslint-disable-next-line prefer-destructuring
      locationPath = location.paths[0];
    }

    if (locationPath && locationPath.startsWith("./")) {
      // TODO test relative path (Directory Back) with other platforms
      // relative paths
      return pathLib.resolve(locationPath);
    }
  }

  return locationPath;
}

async function getDirProperties(directoryPath) {
  let totalSize = 0;
  let filesCount = 0;
  let dirsCount = 0;

  await new Promise((resolve, reject) => {
    klaw(directoryPath, { preserveSymlinks: true })
      .on("data", (item) => {
        if (item.stats.isFile()) {
          totalSize += item.stats.size;
          filesCount += 1;
        } else {
          dirsCount += 1;
        }
      })
      .on("end", () => {
        resolve();
      })
      .on("error", (err) => {
        reject(err);
      });
  });

  return { totalSize, filesCount, dirsCount };
}

/**
 * @param filePath like /home/user/file.zip
 * @param targetPath /home/user/targetDir
 * return Promise<zipPath>: string>
 */
function unZip(filePath, targetPath) {
  return new Promise((resolve, reject) => {
    try {
      const zip = new AdmZip(filePath, {});
      zip.extractAllToAsync(targetPath, true, false, (err) => {
        if (err) {
          reject("Error unzipping ZIP file: ", err);
        } else {
          resolve(filePath);
        }
      });
    } catch (error) {
      reject("Error unzipping ZIP file: " + error.message);
    }
  });
}

function resolveFilePath(filePath) {
  pathLib.resolve(filePath);
}

function mkdirpSync(dir) {
  fsClient.mkdirpSync(dir);
}

function checkDirExist(entryPath) {
  return new Promise((resolve) => {
    require("fs").stat(entryPath, (err, stat) => {
      resolve(!err && stat && stat.isDirectory());
    });
  });
}

function isDirectory(entryPath) {
  return fsClient.isDirectory(entryPath);
}

function listDirectoryPromise(entryPath, mode, ignorePatterns) {
  return fsClient.listDirectoryPromise(entryPath, mode, ignorePatterns);
}

function listMetaDirectoryPromise(entryPath) {
  return fsClient.listMetaDirectoryPromise(entryPath);
}

function saveTextFilePromise(param, content, overwrite) {
  return fsClient.saveTextFilePromise(param, content, overwrite);
}

function saveFilePromise(param, content, overwrite) {
  return fsClient.saveFilePromise(param, content, overwrite);
}

function saveBinaryFilePromise(filePath, content, overwrite) {
  return fsClient.saveBinaryFilePromise(filePath, content, overwrite);
}

function getPropertiesPromise(entryPath) {
  return fsClient.getPropertiesPromise(entryPath);
}

function loadTextFilePromise(entryPath, isPreview = false) {
  return fsClient.loadTextFilePromise(entryPath);
}

function getFileContentPromise(param, type) {
  return fsClient.getFileContentPromise(param, type);
}

function extractAndSavePdf(entry, extractPDFcontent) {
  return fsClient.extractAndSavePdf(entry, extractPDFcontent);
}

function createDirectoryPromise(dirPath) {
  return fsClient.createDirectoryPromise(dirPath);
}

function copyFilePromise(sourceFilePath, targetFilePath) {
  return fsClient.copyFilePromise(sourceFilePath, targetFilePath);
}

function renameFilePromise(
  filePath,
  newFilePath,
  onProgress = undefined,
  force = false
) {
  return fsClient.renameFilePromise(filePath, newFilePath, onProgress, force);
}

function renameDirectoryPromise(dirPath, newDirName) {
  return fsClient.renameDirectoryPromise(pathLib.resolve(dirPath), newDirName);
}

function copyDirectoryPromise(param, newDirName, onProgress) {
  return fsClient.copyDirectoryPromise(
    { ...param, path: pathLib.resolve(param.path) },
    newDirName,
    onProgress
  );
}

function moveDirectoryPromise(param, newDirName, onProgress) {
  return fsClient.moveDirectoryPromise(
    { ...param, path: pathLib.resolve(param.path) },
    newDirName,
    onProgress
  );
}

function deleteFilePromise(path) {
  return fsClient.deleteFilePromise(path);
}

function deleteDirectoryPromise(path) {
  return fsClient.deleteDirectoryPromise(path);
}

module.exports = {
  getLocationPath,
  listMetaDirectoryPromise,
  listDirectoryPromise,
  saveTextFilePromise,
  saveFilePromise,
  saveBinaryFilePromise,
  getPropertiesPromise,
  isDirectory,
  checkDirExist,
  loadTextFilePromise,
  getFileContentPromise,
  extractAndSavePdf,
  createDirectoryPromise,
  copyFilePromise,
  renameFilePromise,
  renameDirectoryPromise,
  moveDirectoryPromise,
  copyDirectoryPromise,
  deleteFilePromise,
  deleteDirectoryPromise,
  unZip,
  getDirProperties,
  mkdirpSync,
};
