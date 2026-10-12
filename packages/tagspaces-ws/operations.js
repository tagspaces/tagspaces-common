"use strict";

/**
 * The worker's actual work, independent of how a request reached us.
 *
 * Both transports call into here: the Electron app over the utilityProcess
 * message port (ipc.js) and the standalone HTTP server (ws.js + endpoints/).
 * Keeping the logic here means the two transports cannot drift apart, and in
 * particular cannot end up with different path validation.
 */

const {
  listDirectoryPromise,
  getFileContentPromise,
  saveTextFilePromise,
  loadTextFilePromise,
  checkDirExist,
} = require("@tagspaces/tagspaces-common-node/io-node");
const {
  persistIndex,
  createIndex,
  createIncrementalIndex,
  getMetaIndexFilePath,
  getMetaFullTextFilePath,
  parseFullTextJsonl,
} = require("@tagspaces/tagspaces-indexer");
const { loadJSONString } = require("@tagspaces/tagspaces-common/utils-io");
const {
  processAllThumbnails,
} = require("@tagspaces/tagspaces-workers/tsnodethumbgen");
const { extractPDFcontent } = require("@tagspaces/tagspaces-pdf-extraction");
const { validatePath, validatePaths } = require("./security");

async function loadExistingIndex(directoryPath) {
  try {
    const indexPath = getMetaIndexFilePath(directoryPath);
    const content = await loadTextFilePromise(indexPath);
    return loadJSONString(content);
  } catch (e) {
    return null;
  }
}

async function loadExistingFullText(directoryPath) {
  try {
    const ftPath = getMetaFullTextFilePath(directoryPath);
    const content = await loadTextFilePromise(ftPath);
    if (!content) return null;
    // Handle both JSONL (new) and JSON (old) formats
    const trimmed = content.trim();
    if (trimmed.startsWith("{") && !trimmed.startsWith('{"p"')) {
      try {
        return JSON.parse(trimmed);
      } catch (e) {
        // Fall through to JSONL
      }
    }
    return parseFullTextJsonl(content);
  } catch (e) {
    return null;
  }
}

/**
 * Build (or incrementally update) the search index for a directory and write it
 * to <dir>/.ts/.
 *
 * @param {object} params {directoryPath, extractText, extractLinks,
 *   ignorePatterns, forceFullReindex, extendedExtraction}
 * @param {AbortSignal} signal aborts the directory walk between entries
 * @returns {Promise<{success: boolean}>}
 */
async function runIndexer(params, signal) {
  const {
    directoryPath,
    extractText,
    extractLinks,
    ignorePatterns,
    forceFullReindex,
    extendedExtraction,
  } = params || {};

  const safePath = validatePath(directoryPath);

  const mode = ["loadMeta"];
  if (extractText) {
    mode.push("extractTextContent");
    if (extractLinks) {
      mode.push("extractLinks");
    }
  }

  const param = {
    path: safePath,
    listDirectoryPromise,
    getFileContentPromise,
    extendedExtraction:
      extractText && extendedExtraction ? extractPDFcontent : false,
  };
  const isWalking = () => !(signal && signal.aborted);
  const patterns = ignorePatterns || [];

  let directoryIndex;

  if (!forceFullReindex) {
    const existingIndex = await loadExistingIndex(safePath);
    if (existingIndex && existingIndex.length > 0) {
      const existingFullText = extractText
        ? await loadExistingFullText(safePath)
        : null;
      const result = await createIncrementalIndex(
        param,
        mode,
        patterns,
        isWalking,
        existingIndex,
        existingFullText,
      );
      directoryIndex = result.index;
      console.log(
        `Incremental: +${result.stats.added} ~${result.stats.modified} -${result.stats.deleted} =${result.stats.unchanged}`,
      );
    }
  }

  if (!directoryIndex) {
    directoryIndex = await createIndex(param, mode, patterns, isWalking);
  }

  const success = await persistIndex(
    {
      path: safePath,
      saveTextFilePromise,
      checkDirExist,
    },
    directoryIndex,
  );
  return { success };
}

/**
 * Generate thumbnails for a list of files or directories.
 *
 * @param {object} params {paths: string[], pdf?, pdfContent?}
 * @returns {Promise<{thumbs: object[], allSucceeded: boolean}>}
 */
async function runThumbGen(params) {
  const { paths, pdf, pdfContent } = params || {};
  const safePaths = validatePaths(paths);

  let extractPDFfunction;
  if (pdfContent && safePaths.some((p) => p.toLowerCase().endsWith(".pdf"))) {
    extractPDFfunction = extractPDFcontent;
  }

  const thumbs = [];
  let allSucceeded = true;
  for (const filePath of safePaths) {
    // Sequential on purpose: thumbnailing is CPU/wasm bound, so running these
    // in parallel inside one process buys nothing and spikes memory.
    // eslint-disable-next-line no-await-in-loop
    const success = await processAllThumbnails(
      filePath,
      pdf,
      extractPDFfunction,
    );
    if (success) {
      if (typeof success === "object") {
        thumbs.push(success);
      }
    } else {
      console.warn("Thumbnails not generated");
      allSucceeded = false;
    }
  }

  return { thumbs, allSucceeded };
}

module.exports = {
  runIndexer,
  runThumbGen,
};
