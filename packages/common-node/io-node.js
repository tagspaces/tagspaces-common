const pathLib = require("path");
const fs = require("fs-extra");
const AppConfig = require("@tagspaces/tagspaces-common/AppConfig");
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
/*
function createDirectoryTree(directoryPath) {
  const generateDirectoryTree = (dirPath) => {
    try {
      const tree = {};
      const dstats = fs.lstatSync(dirPath);
      tree.name = pathLib.basename(dirPath);
      tree.isFile = false;
      tree.lmdt = dstats.mtime;
      tree.path = dirPath;
      tree.children = [];
      const dirList = fs.readdirSync(dirPath);
      for (let i = 0; i < dirList.length; i += 1) {
        const path = dirPath + AppConfig.dirSeparator + dirList[i];
        const stats = fs.lstatSync(path);
        if (stats.isFile()) {
          tree.children.push({
            name: pathLib.basename(path),
            isFile: true,
            size: stats.size,
            lmdt: stats.mtime,
            path,
          });
        } else {
          tree.children.push(generateDirectoryTree(path));
        }
      }
      return tree;
    } catch (ex) {
      console.error("Generating tree for " + dirPath + " failed " + ex);
    }
  };
  // console.log(JSON.stringify(directoryTree));
  return generateDirectoryTree(directoryPath);
}

/!**
 * Create a promise that rejects in <ms> milliseconds
 * @param ms: number
 *!/
function timeout(ms) {
  return new Promise((resolve, reject) => {
    const id = setTimeout(() => {
      clearTimeout(id);
      reject(new Error("Timed out in " + ms + "ms."));
    }, ms);
  });
}

/!**
 * @param param (path - deprecated or Object)
 * return on success: resolve Promise<TS.FileSystemEntry>
 *        on error:   resolve Promise<false> (file not exist) TODO rethink this to reject error too
 *        on timeout: reject error
 *!/
function getPropertiesPromise(param) {
  let path;
  if (typeof param === "object" && param !== null) {
    path = param.path;
  } else {
    path = param;
  }
  const promise = new Promise((resolve) => {
    /!* stats for file:
     * "dev":41, "mode":33204, "nlink":1, "uid":1000, "gid":1000,  "rdev":0,
     * "blksize":4096, "ino":2634172, "size":230, "blocks":24,  "atime":"2015-11-24T09:56:41.932Z",
     * "mtime":"2015-11-23T14:29:29.689Z", "ctime":"2015-11-23T14:29:29.689Z",  "birthtime":"2015-11-23T14:29:29.689Z",
     * "isFile":true, "path":"/home/somefile.txt" *!/
    fs.lstat(path, (err, stats) => {
      if (err) {
        resolve(false);
        return;
      }

      if (stats) {
        resolve({
          name: path.substring(path.lastIndexOf(pathLib.sep) + 1, path.length),
          isFile: stats.isFile(),
          size: stats.size,
          lmdt: stats.mtime.getTime(),
          path,
        });
      } else {
        resolve(false);
      }
    });
  });

  // Returns a race between our timeout and the passed in promise
  return Promise.race([promise, timeout(2000)]);
}

function saveTextFilePromise(param, content, overwrite) {
  let filePath;
  if (typeof param === "object" && param !== null) {
    filePath = param.path;
  } else {
    filePath = param;
  }
  console.log("Saving file: " + filePath);

  // Handling the UTF8 support for text files
  const UTF8_BOM = "\ufeff";
  let textContent = content;

  if (content.indexOf(UTF8_BOM) === 0) {
    console.log("Content begins with a UTF8 bom");
  } else {
    textContent = UTF8_BOM + content;
  }

  return saveFilePromise(param, textContent, overwrite);
}

function saveFilePromise(param, content, overwrite = true) {
  let filePath;
  if (typeof param === "object" && param !== null) {
    filePath = param.path;
  } else {
    filePath = param;
  }
  return new Promise((resolve, reject) => {
    function saveFile(entry, tContent) {
      fs.outputFile(entry.path, tContent, (error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(entry);
      });
    }
    function getDefaultFile() {
      return {
        name: tsPaths.extractFileName(filePath, pathLib.sep),
        isFile: true,
        path: filePath,
        extension: tsPaths.extractFileExtension(filePath, pathLib.sep),
        size: 0,
        lmdt: new Date().getTime(),
        isNewFile: true,
        tags: [],
      };
    }

    getPropertiesPromise(param)
      .then((entry) => {
        if (!entry) {
          saveFile(getDefaultFile(), content);
        } else if (overwrite) {
          if (entry.isFile) {
            saveFile({ ...entry, isNewFile: false, tags: [] }, content);
          } /!*else {  // directory exist!
            saveFile({ ...entry, isNewFile: true, tags: [] }, content);
          }*!/
        }
        return true;
      })
      .catch((error) => {
        // Trying to save as new file
        console.log(
          "Getting properties for " + filePath + " failed with: " + error
        );
        saveFile(getDefaultFile(), content);
      });
  });
}

/!**
 * @param filePath: string
 * @param content: any
 * @param overwrite: boolean
 *!/
function saveBinaryFilePromise(filePath, content, overwrite) {
  console.log("Saving binary file: " + filePath);
  const buff = arrayBufferToBuffer(content);
  return saveFilePromise(filePath, buff, overwrite);
}

/!**
 * @param path: string
 *!/
function deleteFilePromise(path) {
  return new Promise((resolve, reject) => {
    fs.unlink(path, (error) => {
      if (error) {
        return reject(error);
      }
      return resolve(path);
    });
  });
}

/!**
 * @param path: string
 * deprecated useTrash -> use moveToTrash from electron-io
 *!/
function deleteDirectoryPromise(path) {
  /!*if (useTrash) {
    return new Promise((resolve, reject) => {
      if (this.moveToTrash([path])) {
        resolve(path);
      } else {
        // console.error('deleteDirectoryPromise '+path+' failed');
        reject(new Error("deleteDirectoryPromise " + path + " failed"));
      }
    });
  }*!/

  return new Promise((resolve, reject) => {
    fs.rm(path, { recursive: true, force: true }, (error) => {
      if (error) {
        return reject(error);
      }
      return resolve(path);
    });
  });
}

function listMetaDirectoryPromise(param) {
  let path;
  if (typeof param === "object" && param !== null) {
    path = param.path;
  } else {
    path = param;
  }
  const metaPath = tsPaths.getMetaDirectoryPath(path, pathLib.sep);
  return new Promise((resolve) => {
    fs.readdir(metaPath, (error, entries) => {
      if (error) {
        console.warn("Error listing meta directory " + metaPath);
        resolve([]); // returning results even if any promise fails
        return;
      }
      resolve(
        entries.map((entry) => ({
          path: entry,
        }))
      );
    });
  });
}

/!**
 *
 * @param param
 * @param mode = ['extractTextContent', 'extractThumbPath']
 * @returns {Promise<FileSystemEntry[]>}
 *!/
function listDirectoryPromise(param, mode = ["extractThumbPath"]) {
  let path;
  if (typeof param === "object" && param !== null) {
    path = param.path;
  } else {
    path = param;
  }

  return new Promise(async (resolve) => {
    const loadMeta = mode.includes("extractThumbPath");
    let metaContent = [];
    if (loadMeta) {
      metaContent = await listMetaDirectoryPromise(param);
    }

    const enhancedEntries = [];
    let entryPath;
    let metaFolderPath;
    let stats;
    let eentry;
    // let containsMetaFolder = false;
    // const metaMetaFolder = metaFolder + pathLib.sep + metaFolder;
    if (path.startsWith("./") || path.startsWith("../")) {
      // relative tsPaths
      path = pathLib.resolve(path);
    }
    fs.readdir(path, (error, entries) => {
      if (error) {
        console.warn("Error listing directory " + path);
        resolve(enhancedEntries); // returning results even if any promise fails
        return;
      }

      /!*if (window.walkCanceled) {
            resolve(enhancedEntries); // returning results even if walk canceled
            return;
        }
*!/
      if (entries) {
        entries.forEach((entry) => {
          entryPath = path + pathLib.sep + entry;
          eentry = {};
          eentry.name = entry;
          eentry.path = entryPath;
          eentry.tags = [];
          eentry.thumbPath = "";
          eentry.meta = {};

          try {
            stats = fs.statSync(entryPath);
            eentry.isFile = stats.isFile();
            eentry.size = stats.size;
            eentry.lmdt = stats.mtime.getTime();

            /!*if (!eentry.isFile && eentry.name.endsWith(AppConfig.metaFolder)) {
              containsMetaFolder = true;
            }*!/

            // Read tsm.json from sub folders
            const folderMetaPath = tsPaths.getMetaFileLocationForDir(
              eentry.path,
              pathLib.sep
            );
            if (
              !eentry.isFile &&
              metaContent.some((meta) => meta.path === folderMetaPath)
            ) {
              // mode.includes("extractThumbPath")) {
              /!*const folderMetaPath =
                eentry.path +
                pathLib.sep +
                (!eentry.path.includes("/" + AppConfig.metaFolder)
                  ? AppConfig.metaFolder + pathLib.sep
                  : "") +
                AppConfig.metaFolderFile;*!/
              try {
                eentry.meta = fs.readJsonSync(folderMetaPath);
                // console.log('Success reading meta folder file ' + folderMetaPath);
              } catch (err) {
                console.error(
                  "Failed reading meta folder file " + folderMetaPath
                );
              }

              // Loading thumbs for folders
              if (!eentry.path.includes("/" + AppConfig.metaFolder)) {
                // skipping meta folder
                const folderTmbPath = tsPaths.getThumbFileLocationForDirectory(
                  eentry.path,
                  pathLib.sep
                );
                //if (metaContent.includes(folderMetaPath)) {
                /!*eentry.path +
                  pathLib.sep +
                  AppConfig.metaFolder +
                  pathLib.sep +
                  AppConfig.folderThumbFile;*!/
                // const tmbStats = fs.statSync(folderTmbPath);
                // if (tmbStats.isFile()) {
                eentry.thumbPath = folderTmbPath;
                //}
                //}
              }
            }

            if (mode.includes("extractTextContent") && eentry.isFile) {
              const fileName = eentry.name.toLowerCase();
              if (
                fileName.endsWith(".txt") ||
                fileName.endsWith(".md") ||
                fileName.endsWith(".html")
              ) {
                const fileContent = fs.readFileSync(eentry.path, "utf8");
                eentry.textContent = extractTextContent(fileName, fileContent);
              }
            }

            /!*if (window.walkCanceled) {
                resolve(enhancedEntries);
                return;
              }*!/
          } catch (e) {
            console.warn("Can not load properties for: " + entryPath + " " + e);
          }
          enhancedEntries.push(eentry);
        });

        // Read the .ts meta content TODO extract read meta dir in listMetaDirectoryPromise()
        /!*if (containsMetaFolder && mode.includes("extractThumbPath")) {
          metaFolderPath = tsPaths.getMetaDirectoryPath(path, pathLib.sep);
          fs.readdir(metaFolderPath, (err, metaEntries) => {
            if (err) {
              console.log(
                "Error listing meta directory " + metaFolderPath + " - " + err
              );
              resolve(enhancedEntries); // returning results even if any promise fails
              return;
            }*!/

        /!*if (window.walkCanceled) {
              resolve(enhancedEntries); // returning results even if walk canceled
              return;
            }*!/

        if (metaContent.length > 0) {
          metaFolderPath = tsPaths.getMetaDirectoryPath(path, pathLib.sep);
          metaContent.forEach((metaEntry) => {
            // Reading meta json files with tags and description
            if (metaEntry.path.endsWith(AppConfig.metaFileExt)) {
              const fileNameWithoutMetaExt = metaEntry.path.substr(
                0,
                metaEntry.path.lastIndexOf(AppConfig.metaFileExt)
              );
              const origFile = enhancedEntries.find(
                (result) => result.name === fileNameWithoutMetaExt
              );
              if (origFile) {
                const metaFilePath =
                  metaFolderPath + pathLib.sep + metaEntry.path;
                const metaFileObj = fs.readJsonSync(metaFilePath);
                if (metaFileObj) {
                  enhancedEntries.map((enhancedEntry) => {
                    if (enhancedEntry.name === fileNameWithoutMetaExt) {
                      enhancedEntry.meta = metaFileObj;
                    }
                    return true;
                  });
                }
              }
            }

            // Finding if thumbnail available
            if (metaEntry.path.endsWith(AppConfig.thumbFileExt)) {
              const fileNameWithoutMetaExt = metaEntry.path.substr(
                0,
                metaEntry.path.lastIndexOf(AppConfig.thumbFileExt)
              );
              enhancedEntries.map((enhancedEntry) => {
                if (enhancedEntry.name === fileNameWithoutMetaExt) {
                  enhancedEntry.thumbPath =
                    metaFolderPath +
                    pathLib.sep +
                    encodeURIComponent(metaEntry.path);
                }
                return true;
              });
            }

            /!*if (window.walkCanceled) {
                  resolve(enhancedEntries);
                }*!/
          });
        }
        resolve(enhancedEntries);
        /!*});
        } else {
          resolve(enhancedEntries);
        }*!/
      }
    });
  });
}

/!**
 * @param param: { path: }
 * @param isPreview: boolean
 * @returns {Promise<string>}
 *!/
function loadTextFilePromise(param, isPreview = false) {
  let filePath;
  if (typeof param === "object" && param !== null) {
    filePath = param.path;
  } else {
    filePath = param;
  }
  if (filePath.startsWith("./") || filePath.startsWith("../")) {
    // relative paths
    filePath = pathLib.resolve(filePath);
  }
  return new Promise((resolve, reject) => {
    if (isPreview) {
      const stream = fs.createReadStream(filePath, {
        start: 0,
        end: 10000,
      });

      stream.on("error", (err) => {
        reject(err);
      });

      const chunks = [];
      stream.on("data", (chunk) => {
        chunks.push(chunk.toString());
        // console.log('stream data ' + chunk);
      });

      stream.on("end", () => {
        const textContent = chunks.join("");
        resolve(textContent);
        // console.log('final output ' + string);
      });
    } else {
      fs.readFile(filePath, "utf8", (error, content) => {
        if (error) {
          reject(error);
        } else {
          resolve(content);
        }
      });
    }
  });
}

/!**
 * @param param
 * @param type = text | arraybuffer (for text use loadTextFilePromise) text return type is not supported for node
 * @returns {Promise<ArrayBuffer>}
 *!/
function getFileContentPromise(param, type = "arraybuffer") {
  let filePath;
  if (typeof param === "object" && param !== null) {
    filePath = param.path;
  } else {
    filePath = param;
  }
  if (filePath.startsWith("./") || filePath.startsWith("../")) {
    // relative paths
    filePath = pathLib.resolve(filePath);
  }
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, (error, content) => {
      if (error) {
        reject(error);
      } else {
        resolve(content);
      }
    });
  });
}

/!*function getFileContentPromise(param) {
  let fileURL;
  if (typeof param === "object" && param !== null) {
    fileURL = param.path;
  } else {
    fileURL = param;
  }
  return new Promise((resolve, reject) => {
    if (fileURL.indexOf("file://") === -1) {
      if (fileURL.startsWith("./") || fileURL.startsWith("../")) {
        // relative paths
        fileURL = pathLib.resolve(fileURL);
      }
      fileURL = "file://" + fileURL;
    }
    const xhr = new XMLHttpRequest();
    xhr.open("GET", fileURL, true);
    xhr.responseType = "arraybuffer";
    xhr.onerror = reject;

    xhr.onload = () => {
      const response = xhr.response || xhr.responseText;
      if (response) {
        resolve(response);
      } else {
        reject("getFileContentPromise error");
      }
    };
    xhr.send();
  });
}*!/

function extractTextContent(fileName, textContent) {
  // Convert to lowercase
  let fileContent = textContent.toLowerCase();
  let contentArray;
  if (fileName.endsWith(".md")) {
    const marked = require("marked");
    const tokens = marked.lexer(fileContent, {});
    contentArray = tokens.map((token) => {
      if (token.text) {
        return token.text;
      }
      return "";
    });
  } else if (fileName.endsWith(".html")) {
    const marked = require("marked");
    const lexer = new marked.Lexer({});
    const tokens = lexer.inlineTokens(fileContent);
    // const tokens = marked.lexer(fileContent, { });
    contentArray = tokens.map((token) => {
      if (token.type === "text") {
        return token.text;
      }
      return "";
    });
  } else {
    contentArray = fileContent.split(" ");
  }

  // clear duplicate words
  contentArray = [...new Set(contentArray)];

  /!*if (fileName.endsWith(".html")) {
    // Use only the content in the body
    const pattern = /<body[^>]*>((.|[\n\r])*)<\/body>/im;
    const matches = pattern.exec(fileContent);
    if (matches && matches.length > 0) {
      fileContent = matches[1];
    }

    const span = document.createElement("span");
    span.innerHTML = fileContent;
    fileContent = span.textContent || span.innerText;
  }*!/

  // Todo remove very long word e.g. dataUrls or other binary data which could be in the text

  // replace unnecessary chars. leave only chars, numbers and space
  // fileContent = fileContent.replace(/[^\w\d ]/g, ''); // leaves only latin chars
  // fileContent = fileContent.replace(/[^a-zA-Za-åa-ö-w-я0-9\d ]/g, '');
  fileContent = contentArray.join(" ").trim();
  fileContent = fileContent.replace(/[~!@#$%^&*()_+=\-[\]{};:"\\\/<>?.,]/g, "");
  fileContent = fileContent.replace(/\n/g, "");
  return fileContent;
}

function createDirectoryPromise(dirPath) {
  console.log("Creating directory: " + dirPath);
  return new Promise((resolve, reject) => {
    fs.mkdirp(dirPath, (error) => {
      if (error) {
        reject(
          new Error("Error creating folder: " + dirPath + " with " + error)
        );
        return;
      }
      resolve(dirPath);
    });
  });
}

function copyFilePromise(sourceFilePath, targetFilePath) {
  console.log("Copying file: " + sourceFilePath + " to " + targetFilePath);
  return new Promise((resolve, reject) => {
    if (sourceFilePath === targetFilePath) {
      reject(
        'Trying to copy over the same file. Copying "' +
          sourceFilePath +
          '" failed'
      );
    } else if (fs.lstatSync(sourceFilePath).isDirectory()) {
      reject("Trying to copy a file: " + sourceFilePath + ". Copying failed");
      /!* } else if (fs.existsSync(targetFilePath)) {
      reject('File "' + targetFilePath + '" exists. Copying failed.'); *!/
    } else {
      fs.copy(sourceFilePath, targetFilePath, (error) => {
        if (error) {
          reject("Copying: " + sourceFilePath + " failed.");
          return;
        }
        resolve([sourceFilePath, targetFilePath]);
      });
    }
  });
}

function renameFilePromise(filePath, newFilePath) {
  console.log("Renaming file: " + filePath + " to " + newFilePath);
  // stopWatchingDirectories();
  return new Promise((resolve, reject) => {
    if (filePath === newFilePath) {
      reject(
        'Source and target file paths are the same. Renaming of "' +
          filePath +
          '" failed'
      );
      return;
    }
    if (fs.lstatSync(filePath).isDirectory()) {
      reject(
        'Trying to rename a directory. Renaming of "' + filePath + '" failed'
      );
      return;
    }
    if (!fs.existsSync(filePath)) {
      reject(
        'Source file does not exist. Renaming of "' + filePath + '" failed'
      );
      return;
    }
    if (fs.existsSync(newFilePath)) {
      reject(
        'Target filename "' +
          newFilePath +
          '" exists. Renaming of "' +
          filePath +
          '" failed'
      );
      return;
    }
    fs.move(filePath, newFilePath, { clobber: true }, (error) => {
      if (error) {
        reject("Renaming: " + filePath + " failed with: " + error);
        return;
      }
      resolve([filePath, newFilePath]);
    });
  });
}

function renameDirectoryPromise(dirPath, newDirName) {
  dirPath = pathLib.resolve(dirPath);
  const newDirPath =
    tsPaths.extractParentDirectoryPath(dirPath, AppConfig.dirSeparator) +
    AppConfig.dirSeparator +
    newDirName;
  console.log("Renaming dir: " + dirPath + " to " + newDirPath);
  // stopWatchingDirectories();
  return new Promise((resolve, reject) => {
    if (dirPath === newDirPath) {
      reject("Trying to move in the same directory. Moving failed");
      return;
    }
    if (fs.existsSync(newDirPath)) {
      reject(
        'Directory "' +
          newDirPath +
          '" exists. Renaming of "' +
          dirPath +
          '" failed'
      );
      return;
    }
    const dirStatus = fs.lstatSync(dirPath);
    if (dirStatus.isDirectory) {
      fs.rename(dirPath, newDirPath, (error) => {
        if (error) {
          reject('Renaming "' + dirPath + '" failed with: ' + error);
          return;
        }
        resolve(newDirPath);
      });
    } else {
      reject("Path is not a directory. Renaming of " + dirPath + " failed.");
    }
  });
}*/

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
  return fsClient.createDirectoryPromise(dirPath).then((result) => {
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
  });
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
};
