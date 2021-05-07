const pathLib = require("path");
const fs = require("fs-extra");
const { getMetaDirectoryPath } = require("./paths");

const metaFolder = ".ts";
const bTagContainer = "[";
const eTagContainer = "]";
const tagDelimiter = " ";
const metaFileExt = ".json";
const thumbFileExt = ".jpg";
const folderThumbFile = "tst.jpg";
const folderIndexFile = "tsi.json";
const metaFolderFile = "tsm.json";

const getPropertiesPromise = (path) => {
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
        resolve({
          name: path.substring(path.lastIndexOf(pathLib.sep) + 1, path.length),
          isFile: stats.isFile(),
          size: stats.size,
          lmdt: stats.mtime.getTime(),
          path,
        });
      }
    });
  });
};

const saveFilePromise = (filePath, content, overwrite = true) =>
  new Promise((resolve, reject) => {
    function saveFile(entry, tContent) {
      fs.writeFile(entry.path, tContent, "utf8", (error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(entry);
      });
    }

    getPropertiesPromise(filePath)
      .then((entry) => {
        if (entry && entry.isFile && overwrite) {
          saveFile({ ...entry, isNewFile: false, tags: [] }, content);
        } else {
          saveFile({ ...entry, isNewFile: true, tags: [] }, content);
        }
        return true;
      })
      .catch((error) => {
        // Trying to save as new file
        console.log(
          "Getting properties for " + filePath + " failed with: " + error
        );
        const fsEntry = {
          name: extractFileName(filePath, pathLib.sep),
          isFile: true,
          path: filePath,
          extension: extractFileExtension(filePath, pathLib.sep),
          size: 0,
          lmdt: new Date().getTime(),
          isNewFile: true,
          tags: [],
        };
        saveFile(fsEntry, content);
      });
  });

module.exports.walkDirectory = function (
  path,

  options = {},
  fileCallback,
  dirCallback
) {
  const mergedOptions = {
    recursive: false,
    skipMetaFolder: true,
    skipDotHiddenFolder: false,
    loadMetaDate: true,
    extractText: false,
    ...options,
  };
  return (
    listDirectoryPromise(path, false, mergedOptions.extractText)
      // @ts-ignore
      .then((entries) =>
        // if (window.walkCanceled) {
        //     return false;
        // }
        Promise.all(
          entries.map((entry) => {
            // if (window.walkCanceled) {
            //     return false;
            // }

            if (entry.isFile) {
              if (fileCallback) {
                fileCallback(entry);
              }
              return entry;
            }

            if (dirCallback) {
              dirCallback(entry);
            }

            if (mergedOptions.recursive) {
              if (
                mergedOptions.skipDotHiddenFolder &&
                entry.name.startsWith(".") &&
                entry.name !== metaFolder
              ) {
                return entry;
              }
              if (mergedOptions.skipMetaFolder && entry.name === metaFolder) {
                return entry;
              }
              return walkDirectory(
                entry.path,

                mergedOptions,
                fileCallback,
                dirCallback
              );
            }
            return entry;
          })
        )
      )
      .catch((err) => {
        console.warn("Error walking directory " + err);
        return err;
      })
  );
};

module.exports.enhanceEntry = function (entry) {
  let fileNameTags = [];
  if (entry.isFile) {
    fileNameTags = extractTagsAsObjects(entry.name);
  }
  let sidecarDescription = "";
  let sidecarColor = "";
  let sidecarTags = [];
  if (entry.meta) {
    sidecarDescription = entry.meta.description || "";
    sidecarColor = entry.meta.color || "";
    sidecarTags = entry.meta.tags || [];
    sidecarTags.map((tag) => {
      tag.type = "sidecar";
      return true;
    });
  }
  const enhancedEntry = {
    name: entry.name,
    isFile: entry.isFile,
    extension: entry.isFile ? extractFileExtension(entry.name) : "",
    tags: [...sidecarTags, ...fileNameTags],
    size: entry.size,
    lmdt: entry.lmdt,
    path: entry.path,
  };
  if (sidecarDescription) {
    enhancedEntry.description = sidecarDescription;
  }
  // enhancedEntry.description = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Etiam vitae magna rhoncus, rutrum dolor id, vestibulum arcu. Maecenas scelerisque nisl quis sollicitudin dapibus. Ut pulvinar est sed nunc finibus cursus. Nam semper felis eu ex auctor, nec semper lectus sagittis. Donec dictum volutpat lorem, in mollis turpis scelerisque in. Morbi pulvinar egestas turpis, euismod suscipit leo egestas eget. Nullam ac mollis sem. \n Quisque luctus dapibus elit, sed molestie ipsum tempor quis. Sed urna turpis, mattis quis orci ac, placerat lacinia est. Pellentesque quis arcu malesuada, consequat magna ut, tincidunt eros. Aenean sodales nisl finibus pharetra blandit. Pellentesque egestas magna et lectus tempor ultricies. Phasellus sed ornare leo. Vivamus sed massa erat. \n Mauris eu dignissim justo, eget luctus nisi. Ut nec arcu quis ligula tempor porttitor. Pellentesque in pharetra quam. Nulla nec ornare magna. Phasellus interdum dictum mauris eget laoreet. In vulputate massa sem, a mattis elit turpis duis.';
  if (entry && entry.thumbPath) {
    enhancedEntry.thumbPath = entry.thumbPath;
  }
  if (entry && entry.textContent) {
    enhancedEntry.textContent = entry.textContent;
  }
  if (sidecarColor) {
    enhancedEntry.color = sidecarColor;
  }
  // console.log('Enhancing ' + entry.path); console.log(enhancedEntry);
  return enhancedEntry;
};

const listDirectoryPromise = (path, lite = true, extractTextContent = false) =>
  new Promise((resolve) => {
    const enhancedEntries = [];
    let entryPath;
    let metaFolderPath;
    let stats;
    let eentry;
    let containsMetaFolder = false;
    // const metaMetaFolder = metaFolder + pathLib.sep + metaFolder;
    if (path.startsWith("./")) {
      // relative paths
      path = pathLib.resolve(path);
    }
    fs.readdir(path, (error, entries) => {
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
            // if (isWin && winattr.getSync(entryPath).hidden) {
            //   return;
            // }
            eentry.isFile = stats.isFile();
            eentry.size = stats.size;
            eentry.lmdt = stats.mtime.getTime();

            if (!eentry.isFile && eentry.name.endsWith(metaFolder)) {
              containsMetaFolder = true;
            }

            // Read tsm.json from sub folders
            if (!eentry.isFile && !lite) {
              const folderMetaPath =
                eentry.path +
                pathLib.sep +
                (!eentry.path.includes("/" + metaFolder)
                  ? metaFolder + pathLib.sep
                  : "") +
                metaFolderFile;
              try {
                const folderMeta = fs.readJsonSync(folderMetaPath);
                eentry.meta = folderMeta;
                // console.log('Success reading meta folder file ' + folderMetaPath);
              } catch (err) {
                // console.log('Failed reading meta folder file ' + folderMetaPath);
              }

              // Loading thumbs for folders
              if (!eentry.path.includes("/" + metaFolder)) {
                // skipping meta folder
                const folderTmbPath =
                  eentry.path +
                  pathLib.sep +
                  metaFolder +
                  pathLib.sep +
                  folderThumbFile;
                const tmbStats = fs.statSync(folderTmbPath);
                if (tmbStats.isFile()) {
                  eentry.thumbPath = folderTmbPath;
                }
              }
            }

            const fileName = eentry.name.toLowerCase();
            if (
              extractTextContent &&
              eentry.isFile &&
              Pro &&
              Pro.Indexer &&
              Pro.Indexer.extractTextContent &&
              (fileName.endsWith(".txt") ||
                fileName.endsWith(".md") ||
                fileName.endsWith(".html"))
            ) {
              const fileContent = fs.readFileSync(eentry.path, "utf8");
              eentry.textContent = Pro.Indexer.extractTextContent(
                fileName,
                fileContent
              );
            }

            /*if (window.walkCanceled) {
              resolve(enhancedEntries);
              return;
            }*/
          } catch (e) {
            console.warn("Can not load properties for: " + entryPath + " " + e);
          }
          enhancedEntries.push(eentry);
        });

        // Read the .ts meta content
        if (!lite && containsMetaFolder) {
          metaFolderPath = getMetaDirectoryPath(path, pathLib.sep);
          fs.readdir(metaFolderPath, (err, metaEntries) => {
            if (err) {
              console.log(
                "Error listing meta directory " + metaFolderPath + " - " + err
              );
              resolve(enhancedEntries); // returning results even if any promise fails
              return;
            }

            /*if (window.walkCanceled) {
              resolve(enhancedEntries); // returning results even if walk canceled
              return;
            }*/

            if (metaEntries) {
              metaEntries.forEach((metaEntryName) => {
                /* if (metaEntryName === metaFolderFile) {
                            // Read meta folder path
                          } */

                // Reading meta json files with tags and description
                if (metaEntryName.endsWith(metaFileExt)) {
                  const fileNameWithoutMetaExt = metaEntryName.substr(
                    0,
                    metaEntryName.lastIndexOf(metaFileExt)
                  );
                  const origFile = enhancedEntries.find(
                    (result) => result.name === fileNameWithoutMetaExt
                  );
                  if (origFile) {
                    const metaFilePath =
                      metaFolderPath + pathLib.sep + metaEntryName;
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
                if (metaEntryName.endsWith(thumbFileExt)) {
                  const fileNameWithoutMetaExt = metaEntryName.substr(
                    0,
                    metaEntryName.lastIndexOf(thumbFileExt)
                  );
                  enhancedEntries.map((enhancedEntry) => {
                    if (enhancedEntry.name === fileNameWithoutMetaExt) {
                      const thumbFilePath =
                        metaFolderPath + pathLib.sep + metaEntryName;
                      enhancedEntry.thumbPath = thumbFilePath;
                    }
                    return true;
                  });
                }

                /*if (window.walkCanceled) {
                  resolve(enhancedEntries);
                }*/
              });
            }
            resolve(enhancedEntries);
          });
        } else {
          resolve(enhancedEntries);
        }
      }
    });
  });

module.exports.loadTextFilePromise = (filePath) =>
  getFileContentPromise(filePath);

const getFileContentPromise = (fullPath) =>
  new Promise((resolve, reject) => {
    let fileURL = fullPath;
    if (fileURL.indexOf("file://") === -1) {
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
