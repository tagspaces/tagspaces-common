//const pathLib = require("path");
const tsPaths = require("./paths");
const { createTextIndex, extractTextContent } = require("./utils-io");
const {
  arrayBufferToBuffer,
  streamToBuffer,
  setEntryLinks,
  extractTxtContentAndLinks,
} = require("./misc");
const AppConfig = require("./AppConfig");
const picomatch = require("picomatch/posix");

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

  function mkdirpSync(dir) {
    fs.ensureDirSync(dir);
    //fs.mkdirSync(dir, { recursive: true });
  }

  function getLmdt(param) {
    if (typeof param === "object" && param !== null) {
      return param.lmdt;
    }
    return undefined;
  }

  function stat(param) {
    const path = getPath(param);
    return new Promise((resolve, reject) => {
      fs.lstat(path, (err, stat) => {
        if (err !== null) {
          resolve(false);
        } else {
          resolve(stat);
        }
      });
    });
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
  /*function createDirectoryTree(dirPath) {
    return new Promise(async (resolve) => {
      const tree = {};
      /!*fs.lstat(dirPath, (err, dstats) => {
            if (err !== null) {
              console.error("Generating tree for " + dirPath + " failed " + ex);
            }*!/
      tree.name = pathLib.basename(dirPath);
      tree.isFile = false;
      // tree.lmdt = dstats.mtime;
      tree.path = dirPath;
      tree.children = await getTreeChildren(dirPath);
      //})
      resolve(tree);
    });
  }*/

  /*function getTreeChildren(dirPath) {
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
  }*/

  /**
   * Create a promise that rejects in <ms> milliseconds
   * @param ms: number
   */
  /*function timeout(ms) {
    return new Promise((resolve, reject) => {
      const id = setTimeout(() => {
        clearTimeout(id);
        reject(new Error("Timed out in " + ms + "ms."));
      }, ms);
    });
  }*/

  /**
   * @param param (path - deprecated or Object)
   * return on success: resolve Promise<TS.FileSystemEntry>
   *        on error:   resolve Promise<false> (file not exist) TODO rethink this to reject error too
   *        on timeout: reject error
   */
  function getPropertiesPromise(param) {
    const path = getPath(param);
    return new Promise((resolve) => {
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
          const lmdt =
            typeof stats.mtimeMs === "number"
              ? stats.mtimeMs
              : stats.mtime && typeof stats.mtime.getTime === "function"
              ? stats.mtime.getTime()
              : stats.mtime;
          // created time: prefer birthtimeMs -> ctimeMs -> fall back to Date objects -> finally lmdt
          const cdt =
            typeof stats.birthtimeMs === "number"
              ? stats.birthtimeMs
              : typeof stats.ctimeMs === "number"
              ? stats.ctimeMs
              : stats.birthtime && typeof stats.birthtime.getTime === "function"
              ? stats.birthtime.getTime()
              : stats.ctime && typeof stats.ctime.getTime === "function"
              ? stats.ctime.getTime()
              : undefined;
          const fsEntry = {
            name: stats.isFile()
              ? tsPaths.extractFileName(path)
              : tsPaths.extractDirectoryName(path),
            isFile: stats.isFile(),
            size: stats.size,
            lmdt,
            cdt,
            path,
          };
          if (param.extractLinks) {
            extractTextContentLinks(fsEntry, true, true).then(() =>
              resolve(fsEntry)
            );
          } else {
            resolve(fsEntry);
          }
        } else {
          resolve(false);
        }
      });
    });

    // Returns a race between our timeout and the passed in promise
    // return Promise.race([promise, timeout(2000)]);
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

  /**
   * @param param {path, lmdt} - last modified date; if provided will not saveFile if lmdt != file.lmdt
   * @param content
   * @param overwrite
   * @param
   * @returns {Promise<unknown>}
   */
  function saveFilePromise(param, content, overwrite = true) {
    const filePath = getPath(param);
    const lmdt = getLmdt(param);
    return new Promise((resolve, reject) => {
      function saveFile(entry, tContent) {
        fs.outputFile(entry.path, tContent, (error) => {
          if (error) {
            reject(error);
            return;
          }
          /*if (entry.lmdt) {
            resolve(entry);
          } else {*/
          getPropertiesPromise(param).then((entryProps) => {
            resolve({ ...entry, ...entryProps });
          });
          //}
        });
      }
      function getDefaultFile() {
        return {
          name: tsPaths.extractFileName(filePath, dirSeparator),
          isFile: true,
          path: filePath,
          extension: tsPaths.extractFileExtension(filePath, dirSeparator),
          size: content.length,
          // lmdt: new Date().getTime(),
          isNewFile: true,
          tags: [],
        };
      }

      getPropertiesPromise(param)
        .then((entry) => {
          if (lmdt && lmdt !== entry.lmdt) {
            reject(new Error("File was modified externally"));
            return false;
          }
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
   * @param param: {path}
   * @param content: any
   * @param overwrite: boolean
   */
  async function saveBinaryFilePromise(param, content, overwrite) {
    function isStream(stream) {
      return (
        stream !== null &&
        typeof stream === "object" &&
        typeof stream.pipe === "function"
      );
    }

    /**
     * check if is node readable stream
     * @param stream
     * @returns {*|boolean}
     */
    function isReadableStream(stream) {
      return (
        isStream(stream) &&
        stream.readable !== false &&
        typeof stream._read === "function" &&
        typeof stream._readableState === "object"
      );
    }

    async function readWebStreamToBuffer(webStream) {
      const reader = webStream.getReader();
      const chunks = [];

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }
          chunks.push(value);
        }

        // Concatenate the chunks into a single buffer
        return Buffer.concat(chunks);
      } finally {
        reader.releaseLock();
      }
    }

    // console.log("Saving binary file: " + filePath);
    let buff;
    if (isReadableStream(content)) {
      //content.readable) {
      buff = await streamToBuffer(content);
    } else if (content instanceof ReadableStream) {
      // it is ReadableStream from web streams API
      buff = await readWebStreamToBuffer(content);
    } else {
      buff = arrayBufferToBuffer(content);
    }
    return saveFilePromise(param, buff, overwrite);
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

  async function extractAndSavePdf(entry, extractPDFcontent) {
    let textContent;
    const pdfContentPath = tsPaths.getMetaContentFileLocation(entry.path);
    const pdfStats = await stat({ path: pdfContentPath });

    if (
      pdfStats &&
      pdfStats.mtime.getTime &&
      pdfStats.mtime.getTime() > entry.lmdt
    ) {
      textContent = await getFileContentPromise(
        { path: pdfContentPath },
        "text"
      );
    } else if (extractPDFcontent) {
      try {
        const buffer = await getFileContentPromise(
          { path: entry.path },
          "arraybuffer"
        );
        textContent = await extractPDFcontent(buffer);
        await saveTextFilePromise({ path: pdfContentPath }, textContent, true);
      } catch (e) {
        console.error("Failed to extractPDFcontent in:" + entry.path, e);
      }
    }
    return textContent;
  }

  async function processDirectoryMeta(eentry) {
    const dirMetaContent = await listMetaDirectoryPromise({
      path: eentry.path,
    });
    const metaFolderPath = tsPaths.getMetaDirectoryPath(
      eentry.path,
      dirSeparator
    );

    // Load folder metadata
    const folderMetaPath = tsPaths.getMetaFileLocationForDir(
      eentry.path,
      dirSeparator
    );
    if (
      dirMetaContent.some(
        (meta) => metaFolderPath + dirSeparator + meta.path === folderMetaPath
      )
    ) {
      try {
        eentry.meta = await fs.readJson(folderMetaPath);
      } catch (err) {
        console.error("Failed reading meta folder file " + folderMetaPath, err);
      }
    }

    // Loading thumbs for folders tst.jpg
    const folderThumbPath = tsPaths.getThumbFileLocationForDirectory(
      eentry.path,
      dirSeparator
    );
    if (
      dirMetaContent.some(
        (meta) => metaFolderPath + dirSeparator + meta.path === folderThumbPath
      ) &&
      // skipping meta folder
      !eentry.path.includes("/" + AppConfig.metaFolder)
    ) {
      eentry.meta = { ...eentry.meta, thumbPath: folderThumbPath };
    }
  }

  async function processMetaContent(path, enhancedEntries, metaContent, mode) {
    const metaFolderPath = tsPaths.getMetaDirectoryPath(path, dirSeparator);

    for (const metaEntry of metaContent) {
      // Process metadata JSON files
      if (metaEntry.path.endsWith(AppConfig.metaFileExt)) {
        const baseName = metaEntry.path.slice(0, -AppConfig.metaFileExt.length);
        const enhancedEntry = enhancedEntries.find(
          (entry) => entry.name === baseName && entry.isFile
        );

        if (enhancedEntry) {
          try {
            const metaFilePath = metaFolderPath + dirSeparator + metaEntry.path;
            const metaFileObj = await fs.readJson(metaFilePath);
            enhancedEntry.meta = { ...enhancedEntry.meta, ...metaFileObj };

            if (mode.includes("extractLinks") && metaFileObj?.description) {
              setEntryLinks(enhancedEntry, metaFileObj.description);
            }
          } catch (err) {
            console.warn(`Error reading metadata file: ${metaEntry.path}`, err);
          }
        }
      }

      // Process thumbnails
      if (metaEntry.path.endsWith(AppConfig.thumbFileExt)) {
        const baseName = metaEntry.path.slice(
          0,
          -AppConfig.thumbFileExt.length
        );
        const thumbPath =
          metaFolderPath + dirSeparator + encodeURIComponent(metaEntry.path);
        const enhancedEntry = enhancedEntries.find(
          (entry) => entry.name === baseName
        );

        if (enhancedEntry) {
          enhancedEntry.meta = { ...enhancedEntry.meta, thumbPath };
        }
      }
    }
  }

  /**
   * @param param      param.extractPDFcontent need to exist
   * @param mode = ['extractTextContent','extractLinks','loadMeta','extractThumbPath']
   * @param ignorePatterns
   * @returns {Promise<FileSystemEntry[]>}
   */
  function listDirectoryPromise(
    param,
    mode = ["extractThumbPath"],
    ignorePatterns = []
  ) {
    const path = getPath(param);
    const loadMeta =
      mode.includes("loadMeta") || mode.includes("extractThumbPath");

    return new Promise(async (resolve, reject) => {
      try {
        const metaContent = loadMeta
          ? await listMetaDirectoryPromise(param)
          : [];

        const enhancedEntries = [];
        const isMatch =
          ignorePatterns.length > 0 ? picomatch(ignorePatterns) : null;
        let entryPath;

        fs.readdir(path, async (error, entries) => {
          if (error) {
            console.warn("Error listing directory " + path);
            resolve(enhancedEntries); // returning results even if any promise fails
            return;
          }

          if (entries) {
            for (const entry of entries) {
              entryPath =
                path +
                (path.endsWith(dirSeparator) ? "" : dirSeparator) +
                entry;

              // Skip ignored patterns
              if (isMatch && (isMatch(entryPath) || isMatch(entry))) {
                continue;
              }

              const eentry = {
                name: entry,
                path: entryPath,
                tags: [],
                meta: {},
              };

              try {
                const stats = await stat({ path: entryPath });
                if (stats) {
                  eentry.isFile = stats.isFile();
                  eentry.size = stats.size;

                  // last modified time (mtime)
                  eentry.lmdt =
                    typeof stats.mtimeMs === "number"
                      ? stats.mtimeMs
                      : stats.mtime && typeof stats.mtime.getTime === "function"
                      ? stats.mtime.getTime()
                      : stats.mtime;

                  // created time: prefer birthtimeMs -> ctimeMs -> fall back to Date objects -> finally lmdt
                  eentry.cdt =
                    typeof stats.birthtimeMs === "number"
                      ? stats.birthtimeMs
                      : typeof stats.ctimeMs === "number"
                      ? stats.ctimeMs
                      : stats.birthtime &&
                        typeof stats.birthtime.getTime === "function"
                      ? stats.birthtime.getTime()
                      : stats.ctime && typeof stats.ctime.getTime === "function"
                      ? stats.ctime.getTime()
                      : eentry.lmdt;
                }

                // Handle directory meta
                if (!eentry.isFile && loadMeta) {
                  await processDirectoryMeta(eentry);
                }
                // Optionally extract text content and links
                if (mode.includes("extractTextContent")) {
                  await extractTextContentLinks(
                    eentry,
                    param.extractPDFcontent,
                    mode.includes("extractLinks")
                  );
                }
              } catch (e) {
                console.error("Can not load properties for: " + entryPath, e);
              }
              enhancedEntries.push(eentry);
            }

            // Process meta content
            if (metaContent.length > 0) {
              await processMetaContent(
                path,
                enhancedEntries,
                metaContent,
                mode
              );
            }
            resolve(enhancedEntries);
          }
        });
      } catch (e) {
        console.warn("Error listing directory " + path, e);
        reject(new Error("Error listing directory " + path)); // returning results even if any promise fails
      }
    });
  }

  async function extractTextContentLinks(
    eentry,
    extractPDFcontent = false,
    extractLinks = false
  ) {
    try {
      const fileName = eentry.name.toLowerCase();
      // Ignoring files starting with ._ e.g. on macOS
      if (fileName.startsWith("._")) {
        return;
      }

      if (fileName.endsWith(".pdf")) {
        const textContent = await extractAndSavePdf(eentry, extractPDFcontent);
        eentry.textContent = createTextIndex(textContent);
        if (textContent && extractLinks) {
          setEntryLinks(eentry, textContent);
        }
      } else {
        const textContent = await getFileContentPromise(
          { path: eentry.path },
          "text"
        );
        extractTxtContentAndLinks(eentry, textContent, extractLinks);
      }
    } catch (error) {
      console.error(`Error reading file at ${eentry.path}:`, error);
    }
  }

  /**
   * @param param: { path: }
   * @param isPreview: boolean
   * @returns {Promise<string>}
   */
  function loadTextFilePromise(param, isPreview = false) {
    const filePath = getPath(param);
    /*if (filePath.startsWith("./") || filePath.startsWith("../")) {
      // relative paths
      filePath = pathLib.resolve(filePath);
    }*/
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
   * @param type = text | arraybuffer (for text you can use loadTextFilePromise with preview option too)
   * @returns {Promise<ArrayBuffer>}
   */
  function getFileContentPromise(param, type = "arraybuffer") {
    let filePath = getPath(param);
    /*if (filePath.startsWith("./") || filePath.startsWith("../")) {
      // relative paths
      filePath = pathLib.resolve(filePath);
    }*/
    return new Promise((resolve, reject) => {
      if (type === "text") {
        fs.readFile(filePath, "utf8", (error, content) => {
          if (error) {
            reject(error);
          } else {
            resolve(content);
          }
        });
      } else {
        fs.readFile(filePath, (error, content) => {
          if (error) {
            reject(error);
          } else {
            resolve(content);
          }
        });
      }
    });
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
                reject(error); //"Copying: " + sourceFilePath + " failed.",
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

  function renameFilePromise(
    filePath,
    newFilePath,
    onProgress = undefined,
    force = false
  ) {
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
      stat({ path: filePath }).then((sourceStat) => {
        if (!sourceStat) {
          reject(
            'Source file does not exist. Renaming of "' + filePath + '" failed'
          );
        } else if (sourceStat.isDirectory()) {
          moveDirectoryPromise(
            { path: filePath },
            newFilePath,
            onProgress
          ).then(() => resolve([filePath, newFilePath]));
          /*console.debug(
                    "move a directory:" + filePath + " to:" + newFilePath
                );*/
        } else {
          stat({ path: newFilePath }).then(async (destStat) => {
            if (destStat) {
              if (force) {
                await deleteFilePromise(newFilePath);
              } else {
                reject(
                  'Target filename "' +
                    newFilePath +
                    '" exists. Renaming of "' +
                    filePath +
                    '" failed'
                );
                return;
              }
            }
            const destDirPath = tsPaths.extractParentDirectoryPath(
              newFilePath,
              AppConfig.dirSeparator
            );
            fs.mkdirp(destDirPath, (error) => {
              stat({ path: destDirPath }).then((destDirStat) => {
                if (!destDirStat) {
                  reject(
                    'Destination dir "' +
                      destDirPath +
                      '" not exists. Renaming of "' +
                      filePath +
                      '" failed'
                  );
                } else if (sourceStat.dev === destDirStat.dev) {
                  fs.move(filePath, newFilePath, { clobber: true }, (error) => {
                    // TODO webdav impl
                    if (error) {
                      reject(error); //"Renaming: " + filePath + " failed with: " + error
                      return;
                    }
                    resolve([filePath, newFilePath]);
                  });
                } else {
                  fs.copy(filePath, newFilePath, (error) => {
                    if (error) {
                      reject(error); //"Copying: " + filePath + " failed.");
                      return;
                    }
                    fs.unlink(filePath, (error) => {
                      if (error) {
                        console.log(
                          "renameFilePromise delete " + filePath + " file:",
                          error
                        );
                      }
                      resolve([filePath, newFilePath]);
                    });
                  });
                }
              });
            });
          });
        }
      });
    });
  }

  function renameDirectoryPromise(dirPath, newDirName) {
    const newDirPath =
      tsPaths.extractParentDirectoryPath(dirPath, AppConfig.dirSeparator) +
      AppConfig.dirSeparator +
      newDirName.trim();
    return getPropertiesPromise(dirPath).then((dirProp) => {
      return new Promise(async (resolve, reject) => {
        if (await exist(newDirPath)) {
          reject(
            'Directory "' +
              newDirPath +
              '" exists. Renaming of "' +
              dirPath +
              '" failed'
          );
        } else {
          if (!dirProp.isFile) {
            fs.move(
              dirPath,
              newDirPath,
              {
                clobber: true,
              },
              (error) => {
                if (error) {
                  reject('Renaming "' + dirPath + '" failed with: ' + error);
                  return;
                }
                resolve(newDirPath);
              }
            );
          } else {
            reject(
              "Path is not a directory. Renaming of " + dirPath + " failed."
            );
          }
        }
      });
    });

    /* return moveDirectoryPromise(
      { path: dirPath, rename: true },
      newDirPath,
      onProgress,
      onAbort
    );*/
  }

  /**
   * https://github.com/jprichardson/node-fs-extra/issues/594
   * @param param
   * @param newDirPath
   * @param onProgress
   * @returns {Promise<string>} newDirPath
   */
  function moveDirectoryPromise(param, newDirPath, onProgress = undefined) {
    let dirPath = getPath(param);
    console.log("Move dir: " + dirPath + " to " + newDirPath);
    // stopWatchingDirectories();
    return new Promise((resolve, reject) => {
      if (dirPath === newDirPath) {
        reject("Trying to move in the same directory. Moving failed");
        return;
      }
      mkdirpSync(newDirPath);
      copyDirectoryPromise(param, newDirPath, onProgress)
        .then(() => deleteDirectoryPromise(dirPath))
        .then(() => {
          resolve(newDirPath);
        })
        .catch((error) => {
          console.debug("copyDirectoryPromise", error);
          resolve(newDirPath);
        });
      // newDirPath not exist -> Rename directory
      /*const dirProp = await getPropertiesPromise(dirPath);
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
      }*/
    });
  }

  /**
   * https://github.com/jprichardson/node-fs-extra/issues/594
   * @param param
   * @param newDirPath
   * @param onProgress
   * @returns {Promise<string>} newDirPath
   */
  function copyDirectoryPromise(param, newDirPath, onProgress = undefined) {
    let dirPath = getPath(param);
    console.log("Copy dir: " + dirPath + " to " + newDirPath);
    // stopWatchingDirectories();
    return new Promise(async (resolve, reject) => {
      if (dirPath === newDirPath) {
        reject("Trying to copy in the same directory. Copy failed");
        return;
      }
      fs.ensureDir(newDirPath, (err) => {
        // if (await exist(newDirPath)) {
        let part = 0;
        let running = true;
        // let processedSize = 0;
        fs.copy(
          dirPath,
          newDirPath,
          {
            clobber: true, // todo clobber is deprecated in copy replace with overwrite
            filter: async (src, dest) => {
              if (onProgress && running) {
                /*const processedFile = await getPropertiesPromise({
                  path: src,
                });
                if (processedFile && processedFile.isFile) {
                processedSize += processedFile.size; */
                part += 1;
                const progress = {
                  loaded: part, //processedSize,
                  total: param.total,
                  // part: part,
                  key: newDirPath, //src,
                };
                onProgress(
                  progress,
                  () => {
                    running = false;
                  },
                  src
                );
              }
              /*const progress = (processedSize / totalSize) * 100;
                console.log(`Progress: ${progress.toFixed(2)}%`);*/

              return running;
            },
          },
          (error) => {
            if (error) {
              reject("Copy: " + dirPath + " failed:" + error);
              return;
            }
            if (running) {
              resolve(newDirPath);
            } else {
              reject(new Error("Aborted"));
            }
          }
        );
      });
    });
  }

  // Experimental functionality
  /*function watchDirectory(dirPath, listener) {
    // stopWatchingDirectories();
    fsWatcher = fs.watch(
      dirPath,
      { persistent: true, recursive: false },
      listener
    );
  }*/

  /*function resolveFilePath(filePath) {
    pathLib.resolve(filePath);
  }*/

  return {
    isDirectory,
    listMetaDirectoryPromise,
    listDirectoryPromise,
    saveTextFilePromise,
    saveFilePromise,
    saveBinaryFilePromise,
    getPropertiesPromise,
    loadTextFilePromise,
    extractAndSavePdf,
    getFileContentPromise,
    createDirectoryPromise,
    copyFilePromise,
    renameFilePromise,
    renameDirectoryPromise,
    moveDirectoryPromise,
    copyDirectoryPromise,
    deleteFilePromise,
    deleteDirectoryPromise,
    mkdirpSync,
  };
}

module.exports = {
  createFsClient,
};
