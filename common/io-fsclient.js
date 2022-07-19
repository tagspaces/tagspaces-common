const pathLib = require("path");
const tsPaths = require("./paths");
const { arrayBufferToBuffer, streamToBuffer } = require("./misc");
const AppConfig = require("./AppConfig");

/**
 * this is common module with io-node
 * @param fs
 * @param dirSeparator
 * @returns {{listDirectoryPromise: (function(*=, *=): Promise<unknown>), getPropertiesPromise: (function(*=): Promise<unknown>), loadTextFilePromise: (function(*=, *=): Promise<unknown>), extractTextContent: (function(*, *): string), isDirectory: (function(*=): Promise<unknown>)}}
 */
function createFsClient(fs, dirSeparator = AppConfig.dirSeparator) {
  function getPath(param) {
    if (typeof param === "object" && param !== null) {
      return param.path;
    } else if (param) {
      return param;
    }
    return "";
  }

  /**
   * @param param
   * @returns {Promise<boolean>} catch reject if path not exists
   */
  function isDirectory(param) {
    const path = getPath(param);
    return new Promise((resolve, reject) => {
      fs.lstat(path, (err, fsStat) => {
        if (err !== null) {
          reject(err);
        } else {
          resolve(fsStat.isDirectory());
        }
      });
    });
  }

  function exist(param) {
    const path = getPath(param);
    return new Promise((resolve) => {
      fs.lstat(path, (err) => {
        if (err !== null) {
          resolve(false);
        } else {
          resolve(true);
        }
      });
    });
  }

  /**
   * TODO not used now implement it in DirectoryTreeView.tsx
   */
  function createDirectoryTree(dirPath) {
    return new Promise(async (resolve) => {
      const tree = {};
      /*fs.lstat(dirPath, (err, dstats) => {
            if (err !== null) {
              console.error("Generating tree for " + dirPath + " failed " + ex);
            }*/
      tree.name = pathLib.basename(dirPath);
      tree.isFile = false;
      // tree.lmdt = dstats.mtime;
      tree.path = dirPath;
      tree.children = await getTreeChildren(dirPath);
      //})
      resolve(tree);
    });
  }

  function getTreeChildren(dirPath) {
    const children = [];
    return new Promise((resolve) => {
      fs.readdir(dirPath, async (error, dirList) => {
        if (error) {
          console.warn("Error listing directory " + dirPath);
          resolve(children); // returning results even if any promise fails
        } else {
          for (let i = 0; i < dirList.length; i += 1) {
            const path = dirPath + AppConfig.dirSeparator + dirList[i];
            try {
              const isDir = await isDirectory(path);
              if (!isDir) {
                children.push({
                  name: pathLib.basename(path),
                  isFile: true,
                  // size: stats.size,
                  // lmdt: stats.mtime,
                  path,
                });
              } else {
                children.push(createDirectoryTree(path));
              }
            } catch (ex) {
              console.error(
                "Error listing directory " + path + " not exist:" + ex
              );
            }
          }
          resolve(children);
        }
      });
    });
  }

  /**
   * Create a promise that rejects in <ms> milliseconds
   * @param ms: number
   */
  function timeout(ms) {
    return new Promise((resolve, reject) => {
      const id = setTimeout(() => {
        clearTimeout(id);
        reject(new Error("Timed out in " + ms + "ms."));
      }, ms);
    });
  }

  /**
   * @param param (path - deprecated or Object)
   * return on success: resolve Promise<TS.FileSystemEntry>
   *        on error:   resolve Promise<false> (file not exist) TODO rethink this to reject error too
   *        on timeout: reject error
   */
  function getPropertiesPromise(param) {
    const path = getPath(param);
    const promise = new Promise((resolve) => {
      /* stats for file:
       * "dev":41, "mode":33204, "nlink":1, "uid":1000, "gid":1000,  "rdev":0,
       * "blksize":4096, "ino":2634172, "size":230, "blocks":24,  "atime":"2015-11-24T09:56:41.932Z",
       * "mtime":"2015-11-23T14:29:29.689Z", "ctime":"2015-11-23T14:29:29.689Z",  "birthtime":"2015-11-23T14:29:29.689Z",
       * "isFile":true, "path":"/home/somefile.txt" */
      fs.lstat(path, (err, stats) => {
        if (err) {
          resolve(false);
          return;
        }

        if (stats) {
          resolve({
            name: path.substring(
              path.lastIndexOf(dirSeparator) + 1,
              path.length
            ),
            isFile: stats.isFile(),
            size: stats.size,
            lmdt: stats.mtime.getTime ? stats.mtime.getTime() : stats.mtime,
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
    const filePath = getPath(param);
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
    const filePath = getPath(param);
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
          name: tsPaths.extractFileName(filePath, dirSeparator),
          isFile: true,
          path: filePath,
          extension: tsPaths.extractFileExtension(filePath, dirSeparator),
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
            } /*else {  // directory exist!
            saveFile({ ...entry, isNewFile: true, tags: [] }, content);
          }*/
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

  /**
   * @param filePath: string
   * @param content: any
   * @param overwrite: boolean
   */
  async function saveBinaryFilePromise(filePath, content, overwrite) {
    console.log("Saving binary file: " + filePath);
    let buff;
    if (content.readable) {
      buff = await streamToBuffer(content);
    } else {
      buff = arrayBufferToBuffer(content);
    }
    return saveFilePromise(filePath, buff, overwrite);
  }

  /**
   * @param path: string
   */
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

  /**
   * @param path: string
   * deprecated useTrash -> use moveToTrash from electron-io
   */
  function deleteDirectoryPromise(path) {
    /*if (useTrash) {
      return new Promise((resolve, reject) => {
        if (this.moveToTrash([path])) {
          resolve(path);
        } else {
          // console.error('deleteDirectoryPromise '+path+' failed');
          reject(new Error("deleteDirectoryPromise " + path + " failed"));
        }
      });
    }*/

    return new Promise((resolve, reject) => {
      fs.rm(path, { recursive: true, force: true }, (error) => {
        if (error) {
          return reject(error);
        }
        return resolve(path);
      });
    });
  }

  /*async function enhanceEntry(entry, path, mode) {
    const entryPath = path + pathLib.sep + entry;
    const eentry = {};
    // let containsMetaFolder = false;

    eentry.name = entry;
    eentry.path = entryPath;
    eentry.tags = [];
    eentry.thumbPath = "";
    eentry.meta = {};

    try {
      const stats = await getPropertiesPromise(entryPath);
      eentry.isFile = stats.isFile;
      eentry.size = stats.size;
      eentry.lmdt = stats.lmdt;

      // Read tsm.json from sub folders
      if (!eentry.isFile && mode.includes("extractThumbPath")) {
        const folderMetaPath =
          eentry.path +
          pathLib.sep +
          (!eentry.path.includes("/" + AppConfig.metaFolder)
            ? AppConfig.metaFolder + pathLib.sep
            : "") +
          AppConfig.metaFolderFile;

        const folderMeta = await loadTextFilePromise(folderMetaPath);
        if (folderMeta) {
          eentry.meta = JSON.parse(folderMeta);
        }

        // Loading thumbs for folders
        if (!eentry.path.includes("/" + AppConfig.metaFolder)) {
          // skipping meta folder
          const folderTmbPath =
            eentry.path +
            pathLib.sep +
            AppConfig.metaFolder +
            pathLib.sep +
            AppConfig.folderThumbFile;
          const isDir = await isDirectory(folderTmbPath);
          if (!isDir) {
            eentry.thumbPath = folderTmbPath;
          }
        }
      }

      if (mode.includes("extractTextContent") && eentry.isFile) {
        const fileName = eentry.name.toLowerCase();
        if (
          fileName.endsWith(".txt") ||
          fileName.endsWith(".md") ||
          fileName.endsWith(".html")
        ) {
          const fileContent = await loadTextFilePromise(eentry.path);
          eentry.textContent = extractTextContent(fileName, fileContent);
        }
      }
    } catch (e) {
      console.warn("Can not load properties for: " + entryPath, e);
    }
    return eentry;
  }*/

  function listMetaDirectoryPromise(param) {
    const path = getPath(param);
    const metaPath = tsPaths.getMetaDirectoryPath(path, dirSeparator);
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

  /**
   * @param param
   * @param mode = ['extractTextContent', 'extractThumbPath']
   * @returns {Promise<FileSystemEntry[]>}
   */
  function listDirectoryPromise(param, mode = ["extractThumbPath"]) {
    let path = getPath(param);

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
      fs.readdir(path, async (error, entries) => {
        if (error) {
          console.warn("Error listing directory " + path);
          resolve(enhancedEntries); // returning results even if any promise fails
          return;
        }

        /*if (window.walkCanceled) {
              resolve(enhancedEntries); // returning results even if walk canceled
              return;
          }
  */
        if (entries) {
          for (const entry of entries) {
            entryPath = path + dirSeparator + entry;
            eentry = {};
            eentry.name = entry;
            eentry.path = entryPath;
            eentry.tags = [];
            eentry.thumbPath = "";
            eentry.meta = {};

            try {
              stats = await new Promise((resolve, rej) => {
                fs.stat(entryPath, (err, data) => {
                  if (err) {
                    rej(err);
                  } else {
                    resolve(data);
                  }
                });
              });
              eentry.isFile = stats.isFile();
              eentry.size = stats.size;
              eentry.lmdt = stats.mtime.getTime
                ? stats.mtime.getTime()
                : stats.mtime;

              // Read tsm.json from sub folders
              const folderMetaPath = tsPaths.getMetaFileLocationForDir(
                eentry.path,
                dirSeparator
              );
              if (
                !eentry.isFile &&
                metaContent.some((meta) => meta.path === folderMetaPath)
              ) {
                try {
                  eentry.meta = await fs.readJson(folderMetaPath);
                  // console.log('Success reading meta folder file ' + folderMetaPath);
                } catch (err) {
                  console.error(
                    "Failed reading meta folder file " + folderMetaPath
                  );
                }

                // Loading thumbs for folders
                if (!eentry.path.includes("/" + AppConfig.metaFolder)) {
                  // skipping meta folder
                  const folderTmbPath =
                    tsPaths.getThumbFileLocationForDirectory(
                      eentry.path,
                      dirSeparator
                    );
                  eentry.thumbPath = folderTmbPath;
                }
              }

              if (mode.includes("extractTextContent") && eentry.isFile) {
                const fileName = eentry.name.toLowerCase();
                if (
                  fileName.endsWith(".txt") ||
                  fileName.endsWith(".md") ||
                  fileName.endsWith(".html")
                ) {
                  const fileContent = await fs.readFile(eentry.path, "utf8");
                  eentry.textContent = extractTextContent(
                    fileName,
                    fileContent
                  );
                }
              }

              /*if (window.walkCanceled) {
                  resolve(enhancedEntries);
                  return;
                }*/
            } catch (e) {
              console.warn(
                "Can not load properties for: " + entryPath + " " + e
              );
            }
            enhancedEntries.push(eentry);
          }

          if (metaContent.length > 0) {
            metaFolderPath = tsPaths.getMetaDirectoryPath(path, dirSeparator);
            for (const metaEntry of metaContent) {
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
                    metaFolderPath + dirSeparator + metaEntry.path;
                  const metaFileObj = await fs.readJson(metaFilePath);
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
                      dirSeparator +
                      encodeURIComponent(metaEntry.path);
                  }
                  return true;
                });
              }

              /*if (window.walkCanceled) {
                    resolve(enhancedEntries);
                  }*/
            }
          }
          resolve(enhancedEntries);
          /*});
          } else {
            resolve(enhancedEntries);
          }*/
        }
      });
    });
  }

  /**
   * @param param: { path: }
   * @param isPreview: boolean
   * @returns {Promise<string>}
   */
  function loadTextFilePromise(param, isPreview = false) {
    let filePath = getPath(param);
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

  /**
   * @param param
   * @param type = text | arraybuffer (for text use loadTextFilePromise) text return type is not supported for node
   * @returns {Promise<ArrayBuffer>}
   */
  function getFileContentPromise(param, type = "arraybuffer") {
    let filePath = getPath(param);
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

    /*if (fileName.endsWith(".html")) {
      // Use only the content in the body
      const pattern = /<body[^>]*>((.|[\n\r])*)<\/body>/im;
      const matches = pattern.exec(fileContent);
      if (matches && matches.length > 0) {
        fileContent = matches[1];
      }

      const span = document.createElement("span");
      span.innerHTML = fileContent;
      fileContent = span.textContent || span.innerText;
    }*/

    // Todo remove very long word e.g. dataUrls or other binary data which could be in the text

    // replace unnecessary chars. leave only chars, numbers and space
    // fileContent = fileContent.replace(/[^\w\d ]/g, ''); // leaves only latin chars
    // fileContent = fileContent.replace(/[^a-zA-Za-åa-ö-w-я0-9\d ]/g, '');
    fileContent = contentArray.join(" ").trim();
    fileContent = fileContent.replace(
      /[~!@#$%^&*()_+=\-[\]{};:"\\\/<>?.,]/g,
      ""
    );
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
      }
      isDirectory(sourceFilePath)
        .then((isDir) => {
          if (isDir) {
            reject(
              "Trying to copy a file: " + sourceFilePath + ". Copying failed"
            );
          } else {
            fs.copy(sourceFilePath, targetFilePath, (error) => {
              // TODO https://github.com/jprichardson/node-fs-extra/blob/master/lib/copy/copy.js
              if (error) {
                reject("Copying: " + sourceFilePath + " failed.");
                return;
              }
              resolve([sourceFilePath, targetFilePath]);
            });
          }
        })
        .catch((e) => {
          reject(
            'Source file does not exist. Copying file "' +
              sourceFilePath +
              '" failed'
          );
        });
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
      isDirectory(filePath)
        .then((isDir) => {
          if (isDir) {
            reject(
              'Trying to rename a directory. Renaming of "' +
                filePath +
                '" failed'
            );
          } else {
            exist(newFilePath).then((exist) => {
              if (exist) {
                reject(
                  'Target filename "' +
                    newFilePath +
                    '" exists. Renaming of "' +
                    filePath +
                    '" failed'
                );
              } else {
                fs.move(filePath, newFilePath, { clobber: true }, (error) => {
                  // TODO webdav impl
                  if (error) {
                    reject("Renaming: " + filePath + " failed with: " + error);
                    return;
                  }
                  resolve([filePath, newFilePath]);
                });
              }
            });
          }
        })
        .catch((e) => {
          reject(
            'Source file does not exist. Renaming of "' + filePath + '" failed'
          );
        });
    });
  }

  function renameDirectoryPromise(dirPath, newDirName) {
    // dirPath = pathLib.resolve(dirPath); TODO move for node only
    const newDirPath =
      tsPaths.extractParentDirectoryPath(dirPath, AppConfig.dirSeparator) +
      AppConfig.dirSeparator +
      newDirName;
    console.log("Renaming dir: " + dirPath + " to " + newDirPath);
    // stopWatchingDirectories();
    return new Promise(async (resolve, reject) => {
      if (dirPath === newDirPath) {
        reject("Trying to move in the same directory. Moving failed");
        return;
      }
      if (await exist(newDirPath)) {
        reject(
          'Directory "' +
            newDirPath +
            '" exists. Renaming of "' +
            dirPath +
            '" failed'
        );
        return;
      }
      const dirProp = await getPropertiesPromise(dirPath);
      if (!dirProp.isFile) {
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
  }

  // Experimental functionality
  function watchDirectory(dirPath, listener) {
    // stopWatchingDirectories();
    fsWatcher = fs.watch(
      dirPath,
      { persistent: true, recursive: false },
      listener
    );
  }

  function resolveFilePath(filePath) {
    pathLib.resolve(filePath);
  }

  return {
    isDirectory,
    listMetaDirectoryPromise,
    listDirectoryPromise,
    saveTextFilePromise,
    saveFilePromise,
    saveBinaryFilePromise,
    getPropertiesPromise,
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
}

module.exports = {
  createFsClient,
};
