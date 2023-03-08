const pathLib = require("path");
const tsPaths = require("@tagspaces/tagspaces-common/paths");
const fs = require("fs-extra");
// const zlib = require("minizlib");
// const zlib = require("zlib");
const JSZip = require("jszip");
const JSZipUtils = require("jszip-utils");
//const AppConfig = require("@tagspaces/tagspaces-common/AppConfig");
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

function mkdirpSync(dir) {
  if (fs.existsSync(dir)) {
    return;
  }
  mkdirpSync(pathLib.dirname(dir));
  fs.mkdirSync(dir);
}
/**
 * @param filePath like /home/user/file.zip
 * @param targetPath /home/user/targetDir
 * return Promise<zipPath: string>
 */
function unZip(filePath, targetPath) {
  return new Promise((resolve, reject) => {
    try {
      JSZipUtils.getBinaryContent(filePath, (err, data) => {
        if (err) {
          throw err; // or handle err
        }
        // Load the zipped data
        JSZip.loadAsync(data).then((zip) => {
          // Iterate through the files and extract them
          const promises = Object.keys(zip.files).map((filename) => {
            if (!filename.startsWith("__MACOSX")) {
              const dirName = tsPaths.extractFileName(filePath).split(".").slice(0, -1).join(".");
              const targetFile = pathLib.join(targetPath, dirName, filename);
              // Check if the file is a directory
              if (zip.files[filename].dir) {
                // Create the directory if it doesn't exist
                mkdirpSync(targetFile);
                return true;
              } else {
                const dir = pathLib.dirname(targetFile);
                if (dir) {
                  mkdirpSync(dir);
                }
                // Extract the file
                return zip
                  .file(filename)
                  .async("nodebuffer")
                  .then((content) => {
                    // Save the file to disk
                    fs.writeFileSync(targetFile, content);
                    return true;
                  });
              }
            }
            return true;
          });
          Promise.all(promises).then(() => resolve(filePath));
        });
      });

      /*const readStream = fs.createReadStream(filePath);
      const unzipStream = zlib.createUnzip();
      const writeStream = fs.createWriteStream(targetPath);

      readStream
        .on("error", reject)
        .pipe(unzipStream)
        .on("error", reject)
        .pipe(writeStream)
        .on("error", reject)
        .on("finish", resolve);*/

      // const dirName = filePath.split(".").slice(0, -1).join(".");
      /*const readStream = fs.createReadStream(filePath);
      const writeStream = fs.createWriteStream(targetPath); //dirName); //targetPath);
      const unzipStream = new zlib.Gunzip(); //Unzip();

      readStream.on("error", reject);
      writeStream.on("error", reject);
      unzipStream.on("error", reject);

      writeStream.on("finish", () => {
        resolve();
      });

      readStream.pipe(unzipStream).pipe(writeStream);*/
      // -----------------------------
      /*const readStream = fs.createReadStream(filePath);
      const dirName = filePath.split(".").slice(0, -1).join("."); // remove .zip extension
      // const writeDir = pathLib.join(targetPath ? targetPath : ".", dirName);
      fs.mkdirp(dirName, (error) => {
        if (error) {
          console.error("Error creating folder: " + dirName + " with ", error);
          return;
        }
        const writeStream = fs.createWriteStream(dirName);

        const unzipper = zlib.createGunzip();
        readStream.pipe(unzipper).pipe(writeStream);

        writeStream.on("close", () => {
          console.log("File unzipped successfully!");
          resolve(true);
        });

        writeStream.on("error", (error) => {
          console.error("Error unzipping file:", error);
          reject(error);
        });
      });*/
    } catch (err) {
      console.error(err);
      reject(err);
    }
  });
}

function resolveFilePath(filePath) {
  pathLib.resolve(filePath);
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

function loadTextFilePromise(entryPath) {
  return fsClient.loadTextFilePromise(entryPath);
}

function getFileContentPromise(param, type) {
  return fsClient.getFileContentPromise(param, type);
}

function extractTextContent(fileName, textContent) {
  return fsClient.extractTextContent(fileName, textContent);
}

function createDirectoryPromise(dirPath) {
  return fsClient.createDirectoryPromise(dirPath); /*.then((result) => {
    if (AppConfig.isWin && dirPath.endsWith("\\" + AppConfig.metaFolder)) {
      // hide .ts folder on Windows
      import("winattr").then((winattr) => {
        winattr.set(dirPath, { hidden: true }, (err) => {
          if (err) {
            console.warn("Error setting hidden attr. to dir: " + dirPath);
          } else {
            console.log("Success setting hidden attr. to dir: " + dirPath);
          }
        });
      });
      return true;
    }
    return result;
  });*/
}

function copyFilePromise(sourceFilePath, targetFilePath) {
  return fsClient.copyFilePromise(sourceFilePath, targetFilePath);
}

function renameFilePromise(filePath, newFilePath) {
  return fsClient.renameFilePromise(filePath, newFilePath);
}

function renameDirectoryPromise(dirPath, newDirName) {
  return fsClient.renameDirectoryPromise(pathLib.resolve(dirPath), newDirName);
}

function deleteFilePromise(path) {
  return fsClient.deleteFilePromise(path);
}

function deleteDirectoryPromise(path) {
  return fsClient.deleteDirectoryPromise(path);
}

function watchDirectory(dirPath, listener) {
  return fsClient.watchDirectory(dirPath, listener);
}

function createDirectoryTree(dirPath) {
  return fsClient.createDirectoryTree(dirPath);
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
  loadTextFilePromise,
  getFileContentPromise,
  extractTextContent,
  createDirectoryPromise,
  copyFilePromise,
  renameFilePromise,
  renameDirectoryPromise,
  deleteFilePromise,
  deleteDirectoryPromise,
  watchDirectory,
  createDirectoryTree,
  unZip,
};
