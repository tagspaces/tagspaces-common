const pathLib = require("path");
const tsPaths = require("@tagspaces/tagspaces-common/paths");
const fs = require("fs-extra");
const klaw = require("klaw");
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

/*function mkdirpSync(dir) {
  /!*if (fs.existsSync(dir)) {
    return;
  }*!/
  // mkdirpSync(pathLib.dirname(dir));
  fs.ensureDirSync(dir);
  //fs.mkdirSync(dir);
}*/

async function getDirProperties(directoryPath) {
  let totalSize = 0;
  let filesCount = 0;
  let dirsCount = 0;

  await new Promise((resolve, reject) => {
    klaw(directoryPath)
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
            // if (!filename.startsWith("__MACOSX")) {
            const dirName = tsPaths
              .extractFileName(filePath)
              .split(".")
              .slice(0, -1)
              .join(".");
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

function mkdirpSync(dir) {
  fsClient.mkdirpSync(dir);
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

/**
 * @param srcDir
 * @param targetDir
 * @param onProgress
 * @param onAbort
 * @returns {Promise<string>} targetDir
 */
/*function moveDirectoryPromise(srcDir, targetDir, onProgress, onAbort) {
  return new Promise((resolve, reject) => {
    const files = [];
    const dirs = [];
    let totalSize = {};
    klaw(srcDir)
      .on("data", (item) => {
        if (item.stats.isFile()) {
          totalSize[item.path] = item.stats.size;
          files.push(item.path);
        } else {
          dirs.push(item.path);
        }
      })
      .on("end", () => {
        // fs.ensureDir(targetDir, (err) => {
        dirs.forEach((dir) => {
          const relativePath = pathLib.relative(srcDir, dir);
          const targetPath = pathLib.join(targetDir, relativePath);
          mkdirpSync(targetPath);
        });
        const promises = files.map((item) => {
          const relativePath = pathLib.relative(srcDir, item);
          const targetPath = pathLib.join(targetDir, relativePath);
          // const targetDirname = pathLib.dirname(targetPath);

          return new Promise((resolve, reject) => {
            let completedSize = 0;
            // fs.ensureDir(targetDirname, (err) => {
            const readStream = fs.createReadStream(item);
            const writeStream = fs.createWriteStream(targetPath);

            readStream.on("error", reject);
            writeStream.on("error", reject);

            readStream.on("data", (chunk) => {
              if (onProgress) {
                completedSize += chunk.length;

                const progress = {
                  loaded: completedSize,
                  total: totalSize[item],
                  //part: part,
                  key: item,
                };
                onProgress(progress);
              }
              if (onAbort) {
                onAbort = () => {
                  throw new Error(
                    "Aborted: move " + item + " to " + targetPath
                  );
                };
              }
            });

            readStream
              .pipe(writeStream) //, { end: false });
              .on("finish", () => {
                fs.unlink(item, (err) => {
                  if (err) {
                    reject(err);
                  } else {
                    resolve();
                  }
                });
              });
          });
        });

        // divide the promises into sub-arrays of 10
        const promisesChunks = [];
        for (let i = 0; i < promises.length; i += 10) {
          const chunk = promises.slice(i, i + 10);
          promisesChunks.push(chunk);
        }

        // call Promise.all() on each sub-array
        (async () => {
          for (const chunk of promisesChunks) {
            const results = await Promise.allSettled(chunk);
            console.log(results);
          }
          resolve();
        })();
        /!*Promise.allSettled(promises).then(() => {
          resolve();
        });*!/
        /!*.catch((err) => {
              console.debug('error:',err);
              resolve();
              //reject(err);
            });*!/
        // });
      });
  }).then(() => deleteDirectoryPromise(srcDir).then(() => targetDir));
}*/

/*function moveDirectoryPromise(srcDir, targetDir, onProgress, onAbort) {
  return new Promise((resolve, reject) => {
    const items = [];

    klaw(srcDir)
      .on("data", (item) => {
        items.push(item.path);
      })
      .on("end", () => {
        const promises = [];
        let count = 0;

        items.forEach((item) => {
          const relativePath = path.relative(srcDir, item);
          const targetPath = path.join(targetDir, relativePath);

          promises.push(
            fs
              .move(item, targetPath, { overwrite: true })
              .on("progress", (progress) => {
                count++;
                const progress_percent = Math.round(
                  (count / items.length) * 100
                );
                console.log(progress_percent);
              })
          );
        });

        Promise.all(promises)
          .then(() => {
            resolve();
          })
          .catch((err) => {
            reject(err);
          });
      });
  });
}*/

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
  moveDirectoryPromise,
  copyDirectoryPromise,
  deleteFilePromise,
  deleteDirectoryPromise,
  watchDirectory,
  createDirectoryTree,
  unZip,
  getDirProperties,
  mkdirpSync,
};
