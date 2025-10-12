/**
The MIT License (MIT)
Copyright (c) 2021-present TagSpaces Authors

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

const picomatch = require("picomatch/posix");
const { v1: uuidv1, v4: uuidv4 } = require("uuid");
const paths = require("./paths");
const AppConfig = require("./AppConfig");

/**
 * @param param (path - string or Object)
 * @param listDirectoryPromise
 * @param options: {}
 * @param fileCallback: () => {}
 * @param dirCallback: () => {}
 * @param ignorePatterns: Array<string>
 * @param isWalking
 * @param limit limitConcurrency
 * @returns {*}
 */
function walkDirectory(
  param,
  listDirectoryPromise,
  options = {},
  fileCallback,
  dirCallback,
  ignorePatterns = [],
  isWalking = () => true,
  limit = 0
) {
  const path = param.path;
  if (ignorePatterns.length > 0) {
    const isMatch = picomatch(ignorePatterns);
    if (isMatch(path)) {
      return [];
    }
  }
  const mergedOptions = {
    recursive: false,
    skipMetaFolder: true,
    skipDotHiddenFolder: false,
    skipDotHiddenFiles: false,
    loadMetaData: true,
    extractText: false,
    mode: options.extractText ? ["extractTextContent"] : [],
    ...options,
  };
  const listParams = {
    ...param,
    ...(mergedOptions.extractText && {
      extractPDFcontent: mergedOptions.extractText,
    }),
  };
  return listDirectoryPromise(listParams, mergedOptions.mode, ignorePatterns)
    .then((entries) => {
      if (!isWalking() || entries === undefined) {
        return [];
      }
      const entriesPromises = processEntries(
        entries,
        listDirectoryPromise,
        listParams,
        mergedOptions,
        fileCallback,
        dirCallback,
        ignorePatterns,
        isWalking
      );
      if (limit > 0) {
        return limitConcurrency(limit, entriesPromises);
      } else {
        return Promise.all(entriesPromises.map((fn) => fn()));
      }
    })
    .catch((err) => {
      console.warn("Error walking directory ", err);
      return err;
    });
}

/**
 * limitConcurrency<T>
 * @param limit: number
 * @param tasks: (() => Promise<T>)[]
 * @returns {Promise<T[]>}
 */
function limitConcurrency(limit, tasks) {
  return new Promise((resolve, reject) => {
    let i = 0;
    let active = 0;
    const results = [];
    let rejected = false;

    const next = () => {
      if (rejected) return;
      if (i === tasks.length && active === 0) {
        return resolve(results);
      }

      while (active < limit && i < tasks.length) {
        const index = i++;
        active++;
        tasks[index]()
          .then((result) => {
            results[index] = result;
            active--;
            next();
          })
          .catch((err) => {
            rejected = true;
            reject(err);
          });
      }
    };

    next();
  });
}

/**
 * @param entries
 * @param listDirectoryPromise
 * @param listParams
 * @param mergedOptions
 * @param fileCallback
 * @param dirCallback
 * @param ignorePatterns
 * @param isWalking
 * @returns functions []
 */
function processEntries(
  entries,
  listDirectoryPromise,
  listParams,
  mergedOptions,
  fileCallback,
  dirCallback,
  ignorePatterns,
  isWalking
) {
  return entries.map((entry) => async () => {
    if (!isWalking()) return false;
    if (ignorePatterns.length > 0) {
      const isMatch = picomatch(ignorePatterns);
      if (isMatch(entry.path) || isMatch(entry.name)) {
        return false;
      }
    }

    if (entry.isFile) {
      if (
        fileCallback &&
        (!mergedOptions.skipDotHiddenFiles || !entry.name.startsWith("."))
      ) {
        await fileCallback(entry);
      }
      return entry;
    }

    if (
      dirCallback &&
      (!mergedOptions.skipDotHiddenFolder || !entry.name.startsWith(".")) &&
      (!mergedOptions.skipMetaFolder || entry.name !== AppConfig.metaFolder)
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
      if (mergedOptions.skipMetaFolder && entry.name === AppConfig.metaFolder) {
        return entry;
      }
      const subPath =
        typeof path === "object" && path !== null
          ? { ...path, path: entry.path }
          : entry.path;
      return walkDirectory(
        { ...listParams, path: subPath },
        listDirectoryPromise,
        mergedOptions,
        fileCallback,
        dirCallback,
        ignorePatterns,
        isWalking,
        1
      );
    }
    return entry;
  });
}

function getUuid(version = 4) {
  const uuid = version === 4 ? uuidv4() : uuidv1();
  return uuid.replaceAll("-", "");
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
  let sidecarTags = [];
  if (entry.meta && Object.keys(entry.meta).length > 0) {
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
    entry.uuid = entry.meta.id;
  }
  return {
    ...entry,
    uuid: entry.uuid || getUuid(),
    ...(!entry.extension && {
      extension: entry.isFile
        ? paths.extractFileExtension(entry.name, dirSeparator)
        : "",
    }),
    tags: [...sidecarTags, ...fileNameTags],
  };
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

async function runPromisesSynchronously(resolvables) {
  const results = [];
  for (const resolvable of resolvables) {
    results.push(await resolvable);
  }
  return results;
}

function isThumbGenSupportedFileType(fileExtension, fileType) {
  if (fileType) {
    const fileTypes = AppConfig.ThumbGenSupportedFileTypes[fileType];
    if (fileTypes) {
      return fileTypes.includes(fileExtension);
    }
  } else {
    const fileTypes = Object.keys(AppConfig.ThumbGenSupportedFileTypes);
    for (let type in fileTypes) {
      const fileTypes = AppConfig.ThumbGenSupportedFileTypes[fileType];
      if (fileTypes) {
        if (fileTypes.includes(fileExtension)) {
          return true;
        }
      }
    }
  }
  return false;
}

function extractTextContent(fileName, textContent) {
  let fileContent = textContent.toLowerCase();
  let joinedTokens;
  if (fileName.endsWith(".md")) {
    const marked = require("marked");
    const lexer = new marked.Lexer({});
    const tokens = lexer.inlineTokens(fileContent);
    const contentArray = tokens.map((token) => {
      // console.log(JSON.stringify(token));
      if (token.type === "text" && token.text) {
        let cleanedText = token.text.replace(
          /[~!@#$%^&*()_+=\-[\]{};:"\\\/<>?.,]/g,
          ""
        );
        cleanedText = cleanedText.replace(/\n/g, "");
        return cleanedText.trim();
      }
      return "";
    });
    joinedTokens = contentArray.join(" ");
  } else if (
    fileName.endsWith(".mhtml") ||
    fileName.endsWith(".html") ||
    fileName.endsWith(".htm")
  ) {
    const marked = require("marked");
    const preprocessHTML = (html) => {
      return html
        ?.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
        .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "");
    };

    const cleanedHTML = preprocessHTML(fileContent);

    /*const tokens = marked.lexer(cleanedHTML);
    const contentArray = tokens
        .filter(token => token.type === "text" && token.text)
        .map(token => token.text);*/

    const lexer = new marked.Lexer({});
    const tokens = lexer.inlineTokens(cleanedHTML);
    joinedTokens = tokens
      .filter((token) => token.type === "text" && token.text)
      .map((token) => token.text)
      .join(" ");
  } else {
    joinedTokens = fileContent;
  }

  return createTextIndex(joinedTokens);

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
}

function createTextIndex(textContent) {
  if (textContent) {
    // Removing BOM
    // if (textContent.charCodeAt(0) === 0xFEFF) {
    //   textContent = textContent.substr(1);
    // }
    // clear duplicate string, remove spaces and empty string
    const trimmedTokens = textContent.replace(/\s+/g, " ");
    const noDuplicatesArray = [...new Set(trimmedTokens.split(" "))];
    return noDuplicatesArray.join(" ").replace(/\n/g, "").trim();
  }
  return "";
}

module.exports = {
  getUuid,
  walkDirectory,
  enhanceEntry,
  loadJSONString,
  runPromisesSynchronously,
  isThumbGenSupportedFileType,
  extractTextContent,
  createTextIndex,
};
