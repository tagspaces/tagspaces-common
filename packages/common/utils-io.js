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

// Pre-compile marked parser for text extraction (lazy loaded)
let marked = null;
function getMarked() {
  if (!marked) {
    marked = require("marked");
  }
  return marked;
}

// Pre-compile regex patterns for text cleaning
const PUNCTUATION_REGEX = /[~!@#$%^&*()_+=\-[\]{};:"\\\/<>?.,]/g;
const NEWLINE_REGEX = /\n/g;
const SCRIPT_STYLE_REGEX =
  /<(?:script|style)[^>]*>[\s\S]*?<\/(?:script|style)>/gi;

// File extension sets for faster lookup
const MARKDOWN_EXTS = new Set([".md", ".marp"]);
const HTML_EXTS = new Set([
  ".mhtml",
  ".html",
  ".htm",
  ".xhtml",
  ".shtml",
  ".eml",
]);

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
  limit = 0,
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
        isWalking,
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
  isWalking,
) {
  const isMatch = ignorePatterns.length > 0 ? picomatch(ignorePatterns) : null;
  return entries.map((entry) => async () => {
    if (!isWalking()) return false;
    if (isMatch && (isMatch(entry.path) || isMatch(entry.name))) {
      return false;
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
        1,
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
  dirSeparator = AppConfig.dirSeparator,
) {
  let fileNameTags = [];
  if (entry.isFile) {
    fileNameTags = paths.extractTagsAsObjects(
      entry.name,
      tagDelimiter,
      dirSeparator,
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
  // Type validation - must be a string
  if (typeof jsonContent !== "string") {
    return undefined;
  }

  // Input size validation to prevent DoS attacks
  if (jsonContent.length === 0) {
    return undefined;
  }

  const MAX_JSON_SIZE = 50 * 1024 * 1024; // 50MB limit
  if (jsonContent.length > MAX_JSON_SIZE) {
    console.error(
      `Error parsing JSON: input exceeds maximum allowed size of ${MAX_JSON_SIZE} bytes`,
    );
    return undefined;
  }

  // Handle UTF-8 BOM
  const UTF8_BOM = "\ufeff";
  let json = jsonContent;
  if (jsonContent.charCodeAt(0) === 0xfeff) {
    json = jsonContent.slice(1);
  }

  try {
    const parsed = JSON.parse(json);

    // Prototype Pollution Detection - check for dangerous property keys
    // if (hasPrototypePollutionRisk(parsed)) {
    //   console.error("Error parsing JSON: potential prototype pollution detected");
    //   return undefined;
    // }

    return parsed;
  } catch (err) {
    console.error("Error parsing JSON: " + (err.message || err));
    return undefined;
  }
}

/**
 * Detect potential prototype pollution risks in parsed objects
 * @param {*} obj - The object to validate
 * @returns {boolean} - True if prototype pollution risk is detected
 * @private
 */
function hasPrototypePollutionRisk(obj) {
  const dangerousKeys = ["__proto__", "constructor", "prototype"];

  if (obj !== null && typeof obj === "object") {
    // Check current object's own properties
    for (const key of dangerousKeys) {
      if (key in obj) {
        return true;
      }
    }

    // Recursively check nested objects and arrays
    for (const value of Object.values(obj)) {
      if (value !== null && typeof value === "object") {
        if (hasPrototypePollutionRisk(value)) {
          return true;
        }
      }
    }
  }

  return false;
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
    return fileTypes ? fileTypes.includes(fileExtension) : false;
  }
  // Check all file types if no specific type provided
  for (const type in AppConfig.ThumbGenSupportedFileTypes) {
    const fileTypes = AppConfig.ThumbGenSupportedFileTypes[type];
    if (fileTypes && fileTypes.includes(fileExtension)) {
      return true;
    }
  }
  return false;
}

/**
 * Extract and index text content from various file formats
 * Supports: Markdown, HTML, MHTML, plain text
 * @param {string} fileName - The file name with extension
 * @param {string} textContent - The file content to process
 * @returns {string} Deduplicated, indexed text tokens
 */
function extractTextContent(fileName, textContent) {
  // Input validation for security
  if (
    !fileName ||
    !textContent ||
    typeof fileName !== "string" ||
    typeof textContent !== "string"
  ) {
    return "";
  }

  const fileExtension = fileName
    .toLowerCase()
    .substring(fileName.lastIndexOf("."));

  // Don't lowercase the full content here — createTextIndex() already
  // lowercases the final tokens. Calling .toLowerCase() on multi-MB
  // strings upfront is expensive and the lexers preserve case anyway.
  let joinedTokens;

  if (MARKDOWN_EXTS.has(fileExtension)) {
    joinedTokens = extractMarkdownText(textContent);
  } else if (HTML_EXTS.has(fileExtension)) {
    joinedTokens = extractHTMLText(textContent);
  } else {
    joinedTokens = textContent;
  }

  return createTextIndex(joinedTokens);
}

/**
 * Extract text tokens from Markdown content
 * @private
 */
// Cap input size for the marked lexer — some adversarial inputs can blow
// the call stack via catastrophic backtracking in emStrong
const MAX_LEXER_INPUT = 2 * 1024 * 1024; // 2 MB

function extractMarkdownText(fileContent) {
  try {
    const input =
      fileContent.length > MAX_LEXER_INPUT
        ? fileContent.substring(0, MAX_LEXER_INPUT)
        : fileContent;
    const MarkedLib = getMarked();
    const lexer = new MarkedLib.Lexer({});
    const tokens = lexer.inlineTokens(input);
    const contentArray = tokens.map((token) => {
      if (token.type === "text" && token.text) {
        return token.text
          .replace(PUNCTUATION_REGEX, "")
          .replace(NEWLINE_REGEX, "")
          .trim();
      }
      return "";
    });
    return contentArray.join(" ");
  } catch (error) {
    console.warn("Error extracting markdown text:", error && error.message);
    // Fallback: strip common markdown syntax so we still get readable text
    return fileContent
      .replace(/```[\s\S]*?```/g, " ") // fenced code blocks
      .replace(/`[^`]*`/g, " ") // inline code
      .replace(/!\[[^\]]*\]\([^)]*\)/g, " ") // images
      .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1") // links — keep text
      .replace(/[*_~#>-]+/g, " ") // markdown syntax chars
      .replace(/\s+/g, " ")
      .trim();
  }
}

// Pre-compile for HTML entity decoding
const HTML_ENTITY_REGEX = /&(amp|lt|gt|quot|apos|nbsp|#(\d+)|#x([0-9a-fA-F]+));/g;
const HTML_ENTITY_MAP = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

function decodeHtmlEntities(str) {
  if (!str || str.indexOf("&") === -1) return str;
  return str.replace(HTML_ENTITY_REGEX, (match, name, dec, hex) => {
    if (HTML_ENTITY_MAP[name] !== undefined) return HTML_ENTITY_MAP[name];
    if (dec) {
      const code = parseInt(dec, 10);
      return Number.isFinite(code) ? String.fromCharCode(code) : match;
    }
    if (hex) {
      const code = parseInt(hex, 16);
      return Number.isFinite(code) ? String.fromCharCode(code) : match;
    }
    return match;
  });
}

/**
 * Extract text tokens from HTML/MHTML content using direct tag stripping.
 *
 * We used to run this through marked's inline lexer, but that could blow
 * the call stack on pathological inputs (emStrong's backtracking regex).
 * For fulltext extraction, tag stripping + entity decoding is sufficient
 * and much more reliable — no recursion, no catastrophic regex.
 *
 * @private
 */
function extractHTMLText(fileContent) {
  try {
    // Strip <script> and <style> blocks in one pass (they hold no searchable text)
    let text = fileContent.replace(SCRIPT_STYLE_REGEX, " ");
    // Strip HTML comments — can contain embedded base64 or weird content
    text = text.replace(/<!--[\s\S]*?-->/g, " ");
    // Replace every remaining tag with a single space so adjacent text nodes
    // don't collide: "<b>foo</b>bar" → " foo  bar"
    text = text.replace(/<[^>]+>/g, " ");
    // Decode common entities
    text = decodeHtmlEntities(text);
    // Collapse whitespace
    return text.replace(/\s+/g, " ").trim();
  } catch (error) {
    console.warn("Error extracting HTML text:", error && error.message);
    return "";
  }
}

// CJK Unified Ideographs and common CJK ranges
const CJK_REGEX =
  /[\u2E80-\u2FFF\u3040-\u309F\u30A0-\u30FF\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF\uFF66-\uFF9F]/;

/**
 * Tokenize a CJK text run into overlapping bigrams.
 * "我喜欢标签" → ["我喜", "喜欢", "欢标", "标签"]
 * This is the standard approach for CJK full-text search without
 * a segmentation dictionary (used by Elasticsearch, SQLite FTS, etc.)
 */
function cjkBigrams(text) {
  const bigrams = [];
  for (let i = 0; i < text.length - 1; i++) {
    bigrams.push(text.substring(i, i + 2));
  }
  // Also include individual characters for single-char search
  for (let i = 0; i < text.length; i++) {
    bigrams.push(text[i]);
  }
  return bigrams;
}

function createTextIndex(textContent) {
  if (!textContent) {
    return "";
  }
  const normalized = textContent.toLowerCase().replace(/\s+/g, " ").trim();
  const tokens = new Set();

  // Split into space-separated segments
  const segments = normalized.split(" ");
  for (const segment of segments) {
    if (!segment) continue;

    if (CJK_REGEX.test(segment)) {
      // Segment contains CJK characters — extract bigrams from CJK runs
      // and regular tokens from non-CJK parts
      let cjkRun = "";
      let latinRun = "";
      for (const ch of segment) {
        if (CJK_REGEX.test(ch)) {
          // Flush any Latin run
          if (latinRun.length > 1 && latinRun.length <= 50) {
            tokens.add(latinRun);
          }
          latinRun = "";
          cjkRun += ch;
        } else {
          // Flush any CJK run
          if (cjkRun) {
            for (const bigram of cjkBigrams(cjkRun)) {
              tokens.add(bigram);
            }
            cjkRun = "";
          }
          latinRun += ch;
        }
      }
      // Flush remaining runs
      if (cjkRun) {
        for (const bigram of cjkBigrams(cjkRun)) {
          tokens.add(bigram);
        }
      }
      if (latinRun.length > 1 && latinRun.length <= 50) {
        tokens.add(latinRun);
      }
    } else {
      // Pure non-CJK segment — standard token filtering
      if (segment.length > 1 && segment.length <= 50) {
        tokens.add(segment);
      }
    }
  }

  return [...tokens].join(" ");
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
