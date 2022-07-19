const micromatch = require("micromatch");
const { v1: uuidv1 } = require("uuid");
const paths = require("./paths");
const AppConfig = require("./AppConfig");

/**
 * @param param (path - string or Object)
 * @param listDirectoryPromise
 * @param options: {}
 * @param fileCallback: () => {}
 * @param dirCallback: () => {}
 * @param ignorePatterns: Array<string>
 * @returns {*}
 */
function walkDirectory(
  param,
  listDirectoryPromise,
  options = {},
  fileCallback,
  dirCallback,
  ignorePatterns = []
) {
  let path;
  if (typeof param === "object" && param !== null) {
    path = param.path;
  } else {
    path = param;
  }
  if (ignorePatterns.length > 0 && micromatch.isMatch(path, ignorePatterns)) {
    return;
  }
  const mergedOptions = {
    recursive: false,
    skipMetaFolder: true,
    skipDotHiddenFolder: false,
    skipDotHiddenFiles: false,
    loadMetaData: true,
    extractText: false,
    mode: [],
    ...options,
  };
  return (
    listDirectoryPromise(param, mergedOptions.mode, mergedOptions.extractText)
      // @ts-ignore
      .then((entries) => {
        if (/* window.walkCanceled || */ entries === undefined) {
          return false;
        }

        return Promise.all(
          entries.map(async (entry) => {
            // if (window.walkCanceled) {
            //     return false;
            // }
            if (
              ignorePatterns.length > 0 &&
              micromatch.isMatch(entry.path, ignorePatterns)
            ) {
              return false;
            }

            if (entry.isFile) {
              if (
                fileCallback &&
                (!mergedOptions.skipDotHiddenFiles ||
                  !entry.name.startsWith("."))
              ) {
                await fileCallback(entry);
              }
              return entry;
            }

            if (
              dirCallback &&
              (!mergedOptions.skipDotHiddenFolder ||
                !entry.name.startsWith(".")) &&
              (!mergedOptions.skipMetaFolder ||
                entry.name !== AppConfig.metaFolder)
            ) {
              await dirCallback(entry);
            }

            if (mergedOptions.recursive) {
              if (
                mergedOptions.skipDotHiddenFolder &&
                entry.name.startsWith(".") &&
                entry.name !== AppConfig.metaFolder
              ) {
                return entry;
              }
              if (
                mergedOptions.skipMetaFolder &&
                entry.name === AppConfig.metaFolder
              ) {
                return entry;
              }
              const subPath =
                typeof path === "object" && path !== null
                  ? { ...path, path: entry.path }
                  : entry.path;
              return walkDirectory(
                { ...param, path: subPath },
                listDirectoryPromise,
                mergedOptions,
                fileCallback,
                dirCallback,
                ignorePatterns
              );
            }
            return entry;
          })
        );
      })
      .catch((err) => {
        console.warn("Error walking directory " + err);
        return err;
      })
  );
}

/**
 * @param entry
 * @param tagDelimiter: string
 * @param dirSeparator: string
 * @returns TS.FileSystemEntry {{path: *, extension: string|*, lmdt: *, isFile: *, size: *, name: *, uuid: *, isIgnored: *, tags}}
 */
function enhanceEntry(
  entry,
  tagDelimiter = AppConfig.tagDelimiter,
  dirSeparator = AppConfig.dirSeparator
) {
  let fileNameTags = [];
  if (entry.isFile) {
    fileNameTags = paths.extractTagsAsObjects(
      entry.name,
      tagDelimiter,
      dirSeparator
    );
  }
  let sidecarDescription = "";
  let sidecarColor = "";
  let sidecarPerspective;
  let sidecarTags = [];
  if (entry.meta) {
    sidecarDescription = entry.meta.description || "";
    sidecarColor = entry.meta.color || "";
    sidecarPerspective = entry.meta.perspective;
    if (entry.meta.tags && entry.meta.tags.length > 0) {
      entry.meta.tags.forEach((tag) => {
        const cleanedTag = {
          title: tag.title,
        };
        if (tag.color) {
          cleanedTag.color = tag.color;
        }
        if (tag.textcolor) {
          cleanedTag.textcolor = tag.textcolor;
        }
        sidecarTags.push(cleanedTag);
      });
    }
  }
  const enhancedEntry = {
    uuid: uuidv1(),
    name: entry.name,
    isFile: entry.isFile,
    extension: entry.isFile
      ? paths.extractFileExtension(entry.name, dirSeparator)
      : "",
    tags: [...sidecarTags, ...fileNameTags],
    size: entry.size,
    lmdt: entry.lmdt,
    path: entry.path,
    isIgnored: entry.isIgnored,
  };
  if (sidecarDescription) {
    enhancedEntry.description = sidecarDescription;
  }
  if (entry && entry.thumbPath) {
    enhancedEntry.thumbPath = entry.thumbPath;
  }
  if (entry && entry.textContent) {
    enhancedEntry.textContent = entry.textContent;
  }
  if (sidecarColor) {
    enhancedEntry.color = sidecarColor;
  }
  if (sidecarPerspective) {
    enhancedEntry.perspective = sidecarPerspective;
  }
  // console.log('Enhancing ' + entry.path + ':' + JSON.stringify(enhancedEntry));
  return enhancedEntry;
}

/**
 * @param jsonContent: string
 * @returns {*}
 */
function loadJSONString(jsonContent) {
  if (!jsonContent) {
    return undefined;
  }
  let jsonObject;
  let json;
  const UTF8_BOM = "\ufeff";
  if (jsonContent.indexOf(UTF8_BOM) === 0) {
    json = jsonContent.substring(1, jsonContent.length);
  } else {
    json = jsonContent;
  }
  if (json) {
    try {
      jsonObject = JSON.parse(json);
    } catch (err) {
      console.error("Error parsing meta json file: " + json, err);
    }
  }
  return jsonObject;
}

module.exports = { walkDirectory, enhanceEntry, loadJSONString };
