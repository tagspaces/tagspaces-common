const pathLib = require("path");
const fs = require("fs-extra");
const tsPaths = require("@tagspaces/tagspaces-common/paths");
const AppConfig = require("@tagspaces/tagspaces-common/AppConfig");

function isDirectory(entryPath) {
  return fs.lstatSync(entryPath).isDirectory();
}

/**
 * @param param (path - deprecated or Object)
 * @returns {Promise<unknown>}
 */
function getPropertiesPromise(param) {
  let path;
  if (typeof param === "object" && param !== null) {
    path = param.path;
  } else {
    path = param;
  }
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
      } else {
        resolve(false);
      }
    });
  });
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

    getPropertiesPromise(param)
      .then((entry) => {
        if (!entry) {
          saveFile({ path: filePath, isNewFile: false, tags: [] }, content);
        } else if (entry.isFile && overwrite) {
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
          name: tsPaths.extractFileName(filePath, pathLib.sep),
          isFile: true,
          path: filePath,
          extension: tsPaths.extractFileExtension(filePath, pathLib.sep),
          size: 0,
          lmdt: new Date().getTime(),
          isNewFile: true,
          tags: [],
        };
        saveFile(fsEntry, content);
      });
  });
}

/**
 *
 * @param param
 * @param mode = ['extractTextContent', 'extractThumbPath']
 * @returns {Promise<unknown>}
 */
function listDirectoryPromise(param, mode = ["extractThumbPath"]) {
  let path;
  if (typeof param === "object" && param !== null) {
    path = param.path;
  } else {
    path = param;
  }
  return new Promise((resolve) => {
    const enhancedEntries = [];
    let entryPath;
    let metaFolderPath;
    let stats;
    let eentry;
    let containsMetaFolder = false;
    // const metaMetaFolder = metaFolder + pathLib.sep + metaFolder;
    if (path.startsWith("./")) {
      // relative tsPaths
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

            if (!eentry.isFile && eentry.name.endsWith(AppConfig.metaFolder)) {
              containsMetaFolder = true;
            }

            // Read tsm.json from sub folders
            if (!eentry.isFile && mode.includes("extractThumbPath")) {
              const folderMetaPath =
                eentry.path +
                pathLib.sep +
                (!eentry.path.includes("/" + AppConfig.metaFolder)
                  ? AppConfig.metaFolder + pathLib.sep
                  : "") +
                AppConfig.metaFolderFile;
              try {
                const folderMeta = fs.readJsonSync(folderMetaPath);
                eentry.meta = folderMeta;
                // console.log('Success reading meta folder file ' + folderMetaPath);
              } catch (err) {
                // console.log('Failed reading meta folder file ' + folderMetaPath);
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
                const tmbStats = fs.statSync(folderTmbPath);
                if (tmbStats.isFile()) {
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
                const fileContent = fs.readFileSync(eentry.path, "utf8");
                eentry.textContent = extractTextContent(fileName, fileContent);
              }
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
        if (containsMetaFolder && mode.includes("extractThumbPath")) {
          metaFolderPath = tsPaths.getMetaDirectoryPath(path, pathLib.sep);
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
                if (metaEntryName.endsWith(AppConfig.metaFileExt)) {
                  const fileNameWithoutMetaExt = metaEntryName.substr(
                    0,
                    metaEntryName.lastIndexOf(AppConfig.metaFileExt)
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
                if (metaEntryName.endsWith(AppConfig.thumbFileExt)) {
                  const fileNameWithoutMetaExt = metaEntryName.substr(
                    0,
                    metaEntryName.lastIndexOf(AppConfig.thumbFileExt)
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
}

function loadTextFilePromise(param, isPreview = false) {
  let filePath;
  if (typeof param === "object" && param !== null) {
    filePath = param.path;
  } else {
    filePath = param;
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

function getFileContentPromise(param) {
  let fileURL;
  if (typeof param === "object" && param !== null) {
    fileURL = param.path;
  } else {
    fileURL = param;
  }
  return new Promise((resolve, reject) => {
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
  fileContent = fileContent.replace(/[~!@#$%^&*()_+=\-[\]{};:"\\\/<>?.,]/g, "");
  fileContent = fileContent.replace(/\n/g, "");
  return fileContent;
}

module.exports = {
  listDirectoryPromise,
  saveTextFilePromise,
  getPropertiesPromise,
  isDirectory,
  loadTextFilePromise,
  getFileContentPromise,
  extractTextContent,
};
