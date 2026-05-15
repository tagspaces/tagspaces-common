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
const { extractPDFcontent } = require("@tagspaces/tagspaces-pdf-extraction");
const {
  collectBody,
  safeJsonParse,
  validatePath,
  sendError,
} = require("../security");

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

function handleIndexer(req, res, signal) {
  if (req.method === "POST") {
    collectBody(req, res)
      .then(async (body) => {
        try {
          const {
            directoryPath,
            extractText,
            extractLinks,
            ignorePatterns,
            forceFullReindex,
            extendedExtraction,
          } = safeJsonParse(body);

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
          const isWalking = () => !signal.aborted;
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
            directoryIndex = await createIndex(
              param,
              mode,
              patterns,
              isWalking,
            );
          }

          const success = await persistIndex(
            {
              path: safePath,
              saveTextFilePromise,
              checkDirExist,
            },
            directoryIndex,
          );
          res.statusCode = 200;
          res.setHeader("Content-Type", "application/json");
          res.setHeader("Cache-Control", "no-store, must-revalidate");
          res.end(JSON.stringify({ success }));
        } catch (e) {
          sendError(res, 400, "Indexing failed", e);
        }
      })
      .catch(() => {
        // collectBody already sent 413 response
      });
  }
}

module.exports = {
  handleIndexer,
};
