const pathLib = require("path");
const tsPaths = require("@tagspaces/tagspaces-common/paths");
// const { arrayBufferToBuffer } = require("@tagspaces/tagspaces-common/misc");
const AppConfig = require("@tagspaces/tagspaces-common/AppConfig");

/**
 * this is common module with io-node TODO find better place for this
 * @param fs
 * @returns {{listDirectoryPromise: (function(*=, *=): Promise<unknown>), getPropertiesPromise: (function(*=): Promise<unknown>), loadTextFilePromise: (function(*=, *=): Promise<unknown>), extractTextContent: (function(*, *): string), isDirectory: (function(*=): Promise<unknown>)}}
 */
function createFsClient(fs) {
  function isDirectory(param) {
    let path;
    if (typeof param === "object" && param !== null) {
      path = param.path;
    } else {
      path = param;
    }
    return new Promise((resolve, reject) => {
      fs.stat(path, (err, fsStat) => {
        if (err !== null) {
          reject("isDirectory error:" + path);
        } else {
          resolve(fsStat.isDirectory());
        }
      });
    });
  }

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

        if (entries) {
          entries.forEach(async (entry) => {
            entryPath = path + pathLib.sep + entry;
            eentry = {};
            eentry.name = entry;
            eentry.path = entryPath;
            eentry.tags = [];
            eentry.thumbPath = "";
            eentry.meta = {};

            try {
              stats = await getPropertiesPromise(entryPath);
              eentry.isFile = stats.isFile;
              eentry.size = stats.size;
              eentry.lmdt = stats.lmdt;

              if (
                !eentry.isFile &&
                eentry.name.endsWith(AppConfig.metaFolder)
              ) {
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
                  eentry.textContent = extractTextContent(
                    fileName,
                    fileContent
                  );
                }
              }
            } catch (e) {
              console.warn(
                "Can not load properties for: " + entryPath + " " + e
              );
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

              if (metaEntries) {
                metaEntries.forEach(async (metaEntryName) => {
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
                      const metaFileString = await loadTextFilePromise(
                        metaFilePath
                      );
                      if (metaFileString) {
                        const metaFileObj = JSON.parse(metaFileString);
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
                          metaFolderPath +
                          pathLib.sep +
                          encodeURIComponent(metaEntryName);
                        enhancedEntry.thumbPath = thumbFilePath;
                      }
                      return true;
                    });
                  }
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
    let path;
    if (typeof param === "object" && param !== null) {
      path = param.path;
    } else {
      path = param;
    }
    const promise = new Promise((resolve) => {
      /* stats for file:
       * "dev":41, "mode":33204, "nlink":1, "uid":1000, "gid":1000,  "rdev":0,
       * "blksize":4096, "ino":2634172, "size":230, "blocks":24,  "atime":"2015-11-24T09:56:41.932Z",
       * "mtime":"2015-11-23T14:29:29.689Z", "ctime":"2015-11-23T14:29:29.689Z",  "birthtime":"2015-11-23T14:29:29.689Z",
       * "isFile":true, "path":"/home/somefile.txt" */
      fs.stat(path, (err, stats) => {
        if (err) {
          resolve(false);
          return;
        }

        if (stats) {
          resolve({
            name: path.substring(
              path.lastIndexOf(pathLib.sep) + 1,
              path.length
            ),
            isFile: stats.isFile(),
            size: stats.size,
            lmdt: stats.mtime,
            path,
          });
        } else {
          resolve(false);
        }
      });
    });

    return promise;
    // Returns a race between our timeout and the passed in promise
    // return Promise.race([promise, timeout(2000)]);
  }

  /**
   * @param param: { path: }
   * @param isPreview: boolean
   * @returns {Promise<string>}
   */
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

  return {
    isDirectory,
    listDirectoryPromise,
    extractTextContent,
    getPropertiesPromise,
    loadTextFilePromise,
  };
}

module.exports = {
  createFsClient,
};
