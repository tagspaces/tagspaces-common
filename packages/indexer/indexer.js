const {
  normalizePath,
  extractContainingDirectoryPath,
  extractFileName,
  extractFileExtension,
  joinPaths,
  cleanRootPath,
  cleanTrailingDirSeparator,
} = require("@tagspaces/tagspaces-common/paths");
const {
  loadJSONString,
  walkDirectory,
  getUuid,
} = require("@tagspaces/tagspaces-common/utils-io");
const AppConfig = require("@tagspaces/tagspaces-common/AppConfig");

// Pre-compile regex patterns
const NEWLINE_REGEX = /[\r\n]+/g;
// Matches data:...base64,... or data:...;charset=... URLs (embedded images, fonts, etc.)
const DATA_URL_REGEX = /data:[^\s"')]+/g;
// Matches markdown image syntax with long src (base64 or very long URLs)
const MD_IMAGE_REGEX = /!\[[^\]]*\]\([^)]{500,}\)/g;
// Matches HTML img tags with long src attributes
const HTML_IMG_LONG_SRC_REGEX = /<img[^>]*src="[^"]{500,}"[^>]*\/?>/gi;
// Max description length to store in the index (characters)
const MAX_DESCRIPTION_LENGTH = 4000;

/**
 * Helper function to extract directory path from param object
 * Handles both string and object param types
 */
function extractDirectoryPath(param) {
  return typeof param === "object" && param !== null ? param.path : param;
}

/**
 * Clean description for index storage: strip data URLs, large embedded
 * content (base64 images, long inline SVGs), and cap total length.
 * The full description remains in the sidecar .json file — this is
 * only the searchable excerpt stored in tsi.json.
 */
function cleanDescription(description) {
  if (!description) return undefined;
  // Cap input before regex to prevent scanning multi-MB descriptions.
  // Use 10x the output limit to give regex room to strip embedded content
  // while still finding the useful text within.
  const input =
    description.length > MAX_DESCRIPTION_LENGTH * 10
      ? description.substring(0, MAX_DESCRIPTION_LENGTH * 10)
      : description;
  let cleaned = input
    .replace(DATA_URL_REGEX, "")
    .replace(MD_IMAGE_REGEX, "")
    .replace(HTML_IMG_LONG_SRC_REGEX, "")
    .replace(NEWLINE_REGEX, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
  if (cleaned.length > MAX_DESCRIPTION_LENGTH) {
    cleaned = cleaned.substring(0, MAX_DESCRIPTION_LENGTH);
  }
  return cleaned || undefined;
}

/**
 * Helper function to safely parse JSON with error handling
 */
function safeJSONParse(jsonString, filePath) {
  if (!jsonString) return [];
  try {
    return JSON.parse(jsonString.trim()) || [];
  } catch (ex) {
    console.warn("Error parsing JSON metadata file");
    return [];
  }
}

/**
 * Helper function to check if path is in meta folder
 */
function isMetaFolderPath(path) {
  return path.indexOf(AppConfig.metaFolder + "/") !== -1;
}

/**
 * @param param param.listDirectoryPromise function is required, add getFileContentPromise function to get meta in index
 * @param mode  ['extractTextContent', 'extractLinks', 'extractThumbURL', 'extractThumbPath']
 * @param ignorePatterns: Array<string>
 * @param isWalking
 * @returns {Promise<*>}
 */
function createIndex(
  param,
  mode = ["loadMeta"], //"extractThumbPath"],
  ignorePatterns = [],
  isWalking = () => true,
) {
  const {
    listDirectoryPromise,
    getFileContentPromise,
    extractPDFcontent,
    onProgress,
    ...restParam
  } = param;
  if (!listDirectoryPromise) {
    return Promise.reject(
      new Error("Error creating index: no listDirectoryPromise in params!"),
    );
  }
  const path = restParam.path;
  const directoryIndex = [];
  let counter = 0;

  return walkDirectory(
    restParam,
    listDirectoryPromise,
    {
      recursive: true,
      skipMetaFolder: true,
      skipDotHiddenFolder: true,
      mode,
      ...(extractPDFcontent && { extractText: extractPDFcontent }),
    },
    async (fileEntry) => {
      counter += 1;
      directoryIndex.push(getIndexedEntry(fileEntry, path));
      if (onProgress) {
        onProgress({ count: counter, entry: fileEntry });
      }
    },
    async (directoryEntry) => {
      if (directoryEntry.name !== AppConfig.metaFolder) {
        counter += 1;
        directoryIndex.push(getIndexedEntry(directoryEntry, path));
        if (onProgress) {
          onProgress({ count: counter, entry: directoryEntry });
        }
      }
    },
    ignorePatterns,
    isWalking,
  )
    .then(() => {
      return directoryIndex;
    })
    .catch((err) => {
      // window.walkCanceled = false;
      // console.timeEnd("createDirectoryIndex");
      console.warn("Error creating index: " + err);
      return directoryIndex;
    });
}

/**
 * Incremental indexing: compares existing index with current directory state,
 * only processes added/modified entries. Much faster than full re-index when
 * most files are unchanged.
 *
 * @param param - Same as createIndex (must include listDirectoryPromise, etc.)
 * @param mode - Index modes (loadMeta, extractTextContent, extractLinks)
 * @param ignorePatterns - Glob patterns to skip
 * @param isWalking - Cancellation callback
 * @param existingIndex - Previously loaded index entries (from tsi.json)
 * @param existingFullText - Optional fulltext map from tsft.json
 * @returns Promise<{ index, fullText, stats }>
 */
function createIncrementalIndex(
  param,
  mode = ["loadMeta"],
  ignorePatterns = [],
  isWalking = () => true,
  existingIndex = [],
  existingFullText = null,
) {
  const {
    listDirectoryPromise,
    getFileContentPromise,
    extractPDFcontent,
    ...restParam
  } = param;
  if (!listDirectoryPromise) {
    return Promise.reject(
      new Error(
        "Error creating incremental index: no listDirectoryPromise in params!",
      ),
    );
  }
  const rootPath = restParam.path;

  // Step 1: Build lookup Map from existing index
  const existingMap = new Map();
  for (const entry of existingIndex) {
    existingMap.set(entry.path, entry);
  }

  const added = [];
  const modified = [];
  const unchanged = [];

  // Step 2: Fast shallow walk (stat only, no meta/text extraction)
  return walkDirectory(
    restParam,
    listDirectoryPromise,
    {
      recursive: true,
      skipMetaFolder: true,
      skipDotHiddenFolder: true,
      mode: [], // Empty mode = stat only, fast
    },
    async (fileEntry) => {
      const relativePath = cleanRootPath(fileEntry.path, rootPath);
      const existing = existingMap.get(relativePath);
      if (!existing) {
        added.push(fileEntry);
      } else if (
        existing.lmdt !== fileEntry.lmdt ||
        existing.size !== fileEntry.size
      ) {
        modified.push(fileEntry);
      } else {
        unchanged.push(existing);
      }
      existingMap.delete(relativePath);
    },
    async (directoryEntry) => {
      if (directoryEntry.name !== AppConfig.metaFolder) {
        const relativePath = cleanRootPath(directoryEntry.path, rootPath);
        const existing = existingMap.get(relativePath);
        if (!existing) {
          added.push(directoryEntry);
        } else {
          unchanged.push(existing);
        }
        existingMap.delete(relativePath);
      }
    },
    ignorePatterns,
    isWalking,
  )
    .then(async () => {
      // Step 3: Remaining entries in existingMap are deleted
      const deletedCount = existingMap.size;

      // If fulltext extraction was requested but we have no existing
      // fulltext data, unchanged entries need to go through text extraction
      // too — otherwise enabling fulltext on a location that already has a
      // non-fulltext tsi.json would short-circuit below and silently skip
      // text extraction forever (until tsi.json is deleted manually).
      const needsFullTextRebuild =
        mode.includes("extractTextContent") &&
        unchanged.length > 0 &&
        (!existingFullText ||
          Object.keys(existingFullText).length === 0);
      if (needsFullTextRebuild) {
        console.log(
          `Incremental index: promoting ${unchanged.length} unchanged ` +
            `entries to modified for fulltext extraction (no existing tsft)`,
        );
        for (const entry of unchanged) {
          modified.push(entry);
        }
        unchanged.length = 0;
      }

      const stats = {
        added: added.length,
        modified: modified.length,
        deleted: deletedCount,
        unchanged: unchanged.length,
      };

      console.log(
        `Incremental index: ${stats.added} added, ${stats.modified} modified, ` +
          `${stats.deleted} deleted, ${stats.unchanged} unchanged`,
      );

      // Step 4: If nothing changed, return existing index as-is
      if (
        added.length === 0 &&
        modified.length === 0 &&
        deletedCount === 0
      ) {
        return {
          index: existingIndex,
          fullText: existingFullText,
          stats,
        };
      }

      // Step 5: Process added + modified entries with full mode
      const changedEntries = [...added, ...modified];
      const processedEntries = [];

      if (changedEntries.length > 0 && mode.length > 0) {
        // Re-walk only changed entries' directories, or process individually
        // For simplicity, do a targeted walk with full mode for each changed entry
        for (const entry of changedEntries) {
          if (!isWalking()) break;
          processedEntries.push(getIndexedEntry(entry, rootPath));
        }

        // If we need metadata, do a second targeted walk for changed entries
        if (
          mode.includes("loadMeta") ||
          mode.includes("extractTextContent")
        ) {
          // Re-walk with full mode to get metadata for changed entries
          const changedDirs = new Set();
          for (const entry of changedEntries) {
            changedDirs.add(
              extractContainingDirectoryPath(entry.path, "/"),
            );
          }

          const changedPaths = new Set(
            changedEntries.map((e) => cleanRootPath(e.path, rootPath)),
          );
          const fullEntries = [];

          // Walk with full mode but only keep entries that are in our changed set
          await walkDirectory(
            restParam,
            listDirectoryPromise,
            {
              recursive: true,
              skipMetaFolder: true,
              skipDotHiddenFolder: true,
              mode,
              ...(extractPDFcontent && { extractText: extractPDFcontent }),
            },
            async (fileEntry) => {
              const relPath = cleanRootPath(fileEntry.path, rootPath);
              if (changedPaths.has(relPath)) {
                fullEntries.push(getIndexedEntry(fileEntry, rootPath));
                changedPaths.delete(relPath);
              }
            },
            async (directoryEntry) => {
              if (directoryEntry.name !== AppConfig.metaFolder) {
                const relPath = cleanRootPath(
                  directoryEntry.path,
                  rootPath,
                );
                if (changedPaths.has(relPath)) {
                  fullEntries.push(
                    getIndexedEntry(directoryEntry, rootPath),
                  );
                  changedPaths.delete(relPath);
                }
              }
            },
            ignorePatterns,
            isWalking,
          );

          // Build a map of fully processed entries
          const fullEntryMap = new Map();
          for (const entry of fullEntries) {
            fullEntryMap.set(entry.path, entry);
          }

          // Replace shallow entries with fully processed ones
          processedEntries.length = 0;
          for (const entry of changedEntries) {
            const relPath = cleanRootPath(entry.path, rootPath);
            const fullEntry = fullEntryMap.get(relPath);
            processedEntries.push(
              fullEntry || getIndexedEntry(entry, rootPath),
            );
          }
        }
      } else {
        // No mode flags, just index basic info
        for (const entry of changedEntries) {
          processedEntries.push(getIndexedEntry(entry, rootPath));
        }
      }

      // Step 6: Merge unchanged + processed entries
      const newIndex = [...unchanged, ...processedEntries];

      // Step 7: Update fulltext map
      let newFullText = existingFullText
        ? { ...existingFullText }
        : null;
      if (newFullText) {
        // Remove deleted entries
        for (const [path] of existingMap) {
          delete newFullText[path];
        }
        // Add/update changed entries
        for (const entry of processedEntries) {
          if (entry.textContent) {
            newFullText[entry.path] = entry.textContent;
          }
        }
      } else if (processedEntries.some((e) => e.textContent)) {
        newFullText = {};
        // Collect from unchanged
        for (const entry of unchanged) {
          if (entry.textContent) {
            newFullText[entry.path] = entry.textContent;
          }
        }
        // Add from processed
        for (const entry of processedEntries) {
          if (entry.textContent) {
            newFullText[entry.path] = entry.textContent;
          }
        }
      }

      return {
        index: newIndex,
        fullText: newFullText,
        stats,
      };
    })
    .catch((err) => {
      console.warn("Error creating incremental index: " + err);
      return {
        index: existingIndex,
        fullText: existingFullText,
        stats: { added: 0, modified: 0, deleted: 0, unchanged: 0 },
      };
    });
}

function getIndexedEntry(entry, dirPath) {
  if (!entry) return null;
  const { tags, bucketName, ...cleanEntry } = entry;
  const cleanedDescription = cleanDescription(entry.meta?.description);
  const meta = {};
  
  // Build meta object only with non-empty values
  if (entry.meta?.tags) {
    meta.tags = entry.meta.tags;
  }
  if (entry.meta?.color) {
    meta.color = entry.meta.color;
  }
  if (cleanedDescription) {
    meta.description = cleanedDescription;
  }
  
  const indexedEntry = {
    ...cleanEntry,
    uuid: entry.meta?.id || getUuid(),
    path: cleanRootPath(entry.path, dirPath),
  };
  
  // Only add extension for files
  if (entry.isFile) {
    indexedEntry.extension = extractFileExtension(entry.name, AppConfig.dirSeparator);
  }
  
  // Only add meta if it has content
  if (Object.keys(meta).length > 0) {
    indexedEntry.meta = meta;
  }
  
  return indexedEntry;
}
/**
 * use it for native platform only (saveTextFilePromise cannot switch -location can be S3).
 * look at utils-io -> persistIndex with PlatformIO.saveTextFilePromise instead
 * @param param
 * @param directoryIndex
 */
async function persistIndex(param, directoryIndex) {
  if (!param.saveTextFilePromise) {
    console.error("persistIndex param.saveTextFilePromise is not set!");
    return false;
  }
  const directoryPath = extractDirectoryPath(param);

  // Don't persist index for directories that no longer exist.
  // Otherwise the downstream fs-extra / create-directory calls would
  // silently recreate the deleted directory via the .ts subpath.
  // Prefer an explicit checkDirExist callback; fall back to listDirectoryPromise
  // which will throw if the directory doesn't exist.
  const dirExistCheck = param.checkDirExist || param.listDirectoryPromise;
  if (typeof dirExistCheck === "function") {
    try {
      if (param.checkDirExist) {
        const exists = await param.checkDirExist(directoryPath);
        if (!exists) {
          console.log("Skipping index persist — directory does not exist");
          return false;
        }
      } else {
        // listDirectoryPromise throws/rejects if the path doesn't exist
        await param.listDirectoryPromise({ path: directoryPath }, []);
      }
    } catch (e) {
      console.log("Skipping index persist — directory not accessible");
      return false;
    }
  }

  const folderIndexPath = getMetaIndexFilePath(directoryPath);
  const folderFullTextPath = getMetaFullTextFilePath(directoryPath);

  // Persisted tsi.json / tsft.jsonl must store paths relative to the
  // directory being indexed. createIndex / createIncrementalIndex already
  // produce relative entries, but addToIndex / removeFromIndex (and other
  // external callers) may feed absolute paths. cleanRootPath is a no-op
  // when the root isn't a prefix, so running it unconditionally is safe.
  // Split: strip textContent from main index, collect into fulltext map
  const fullTextMap = {};
  let hasFullText = false;
  const strippedIndex = directoryIndex.map((entry) => {
    if (!entry) return entry;
    const relPath = cleanRootPath(entry.path, directoryPath);
    if (entry.textContent) {
      fullTextMap[relPath] = entry.textContent;
      hasFullText = true;
      const { textContent, ...rest } = entry;
      return { ...rest, path: relPath };
    }
    return entry.path === relPath ? entry : { ...entry, path: relPath };
  });

  const indexJson = JSON.stringify(strippedIndex);

  const saveIndex = param
    .saveTextFilePromise(
      { ...param, path: folderIndexPath },
      indexJson,
      true,
    )
    .catch((err) => {
      console.error("Error saving the index:", err.message || err);
    });

  // Persist fulltext separately as JSONL if there is any
  if (hasFullText) {
    const fullTextJsonl = serializeFullTextJsonl(fullTextMap);
    const saveFullText = param
      .saveTextFilePromise(
        { ...param, path: folderFullTextPath },
        fullTextJsonl,
        true,
      )
      .catch((err) => {
        console.error(
          "Error saving fulltext index:",
          err.message || err,
        );
      });
    return Promise.all([saveIndex, saveFullText]).then(
      ([indexResult]) => indexResult,
    );
  }

  return saveIndex;
}

/**
 * @param param
 * @param getPropertiesPromise function
 * @returns {Promise<boolean>}
 */
function hasIndex(param, getPropertiesPromise) {
  const directoryPath = extractDirectoryPath(param);
  const folderIndexPath = getMetaIndexFilePath(directoryPath);
  
  return getPropertiesPromise({ ...param, path: folderIndexPath })
    .then((lstat) => !!(lstat && lstat.isFile))
    .catch((err) => {
      console.log("Error hasIndex", err);
      return false;
    });
}

/**
 * @param param = {directoryPath:string, locationID:string}
 * @param dirSeparator: string
 * @param getFileContentPromise function
 * @returns {Promise<Array<Object>>}
 */
function loadIndex(
  param,
  dirSeparator = AppConfig.dirSeparator,
  getFileContentPromise,
) {
  const directoryPath = extractDirectoryPath(param);
  const locationID = typeof param === "object" ? param.locationID : undefined;
  const folderIndexPath = getMetaIndexFilePath(directoryPath);
  
  return loadJSONFile(
    { ...param, path: folderIndexPath },
    getFileContentPromise,
  )
    .then((directoryIndex) => enhanceDirectoryIndex(
      param,
      directoryIndex,
      locationID,
      dirSeparator,
    ))
    .catch((err) => {
      console.log("Error loadIndex", err);
      return [];
    });
}

function enhanceDirectoryIndex(
  param,
  directoryIndex,
  locationID,
  dirSeparator = AppConfig.dirSeparator,
) {
  if (!directoryIndex) {
    return undefined;
  }
  let directoryPath = extractDirectoryPath(param);
  
  // Optimize path normalization for Cordova platform
  if (AppConfig.isCordova) {
    if (!directoryPath.startsWith(dirSeparator)) {
      directoryPath = dirSeparator + directoryPath;
    }
    directoryPath = cleanTrailingDirSeparator(directoryPath);
  }
  
  // Cache the platform path conversion function result.
  // Defensive: legacy tsi.json files may contain absolute paths (written
  // before persist normalization was added). cleanRootPath is a no-op
  // when its second argument isn't a prefix, so running it here is safe
  // for clean relative inputs and avoids a double-join for legacy ones.
  const convertPath = (entryPath) => {
    const relPath = cleanRootPath(entryPath, directoryPath, dirSeparator);
    return joinPaths(dirSeparator, directoryPath, toPlatformPath(relPath));
  };

  return directoryIndex.map((entry) => ({
    ...entry,
    locationID,
    path: convertPath(entry.path),
  }));
}

function toPlatformPath(path, dirSeparator = AppConfig.dirSeparator) {
  // index is created with Unix dir separator /
  // only convert on Windows platform
  return AppConfig.isWin ? path.replaceAll("/", dirSeparator) : path;
}

function addToIndex(param, size, lastModified) {
  if (!param.getFileContentPromise) {
    console.error("addToIndex param.getFileContentPromise is not set!");
    return Promise.resolve(false);
  }
  if (!param.saveTextFilePromise) {
    console.error("addToIndex param.saveTextFilePromise is not set!");
    return Promise.resolve(false);
  }
  
  if (isMetaFolderPath(param.path)) {
    console.info(`addToIndex skip meta folder ${param.path}`);
    return Promise.resolve(true);
  }
  
  const dirPath = extractContainingDirectoryPath(param.path, "/");
  const metaFilePath = getMetaIndexFilePath(dirPath);
  
  console.info(
    `addToIndex path:${param.path} size:${size} LastModified:${lastModified} bucketName:${param.bucketName}`,
  );
  
  const newEntry = {
    ...param,
    name: extractFileName(param.path),
    tags: [],
    isFile: true,
    size,
    lmdt: Date.parse(lastModified),
  };
  
  const persistIndexParam = {
    ...param,
    path: dirPath,
    saveTextFilePromise: param.saveTextFilePromise,
  };
  
  return param
    .getFileContentPromise(
      { path: metaFilePath, bucketName: param.bucketName },
      "text",
    )
    .then((metaFileContent) => {
      console.info(`addToIndex metaFileContent:${metaFileContent}`);
      const tsi = safeJSONParse(metaFileContent, metaFilePath);
      tsi.push(newEntry);
      return persistIndex(persistIndexParam, tsi);
    })
    .catch((err) => {
      console.info("addToIndex:", err);
      const tsi = [newEntry];
      return persistIndex(persistIndexParam, tsi);
    });
}

function removeFromIndex(param) {
  if (!param.getFileContentPromise) {
    console.error("removeFromIndex param.getFileContentPromise is not set!");
    return Promise.resolve(false);
  }
  if (!param.saveTextFilePromise) {
    console.error("removeFromIndex param.saveTextFilePromise is not set!");
    return Promise.resolve(false);
  }
  
  console.info(`removeFromIndex path:${param.path} bucket:${param.bucketName}`);
  
  if (isMetaFolderPath(param.path)) {
    console.info(`removeFromIndex skip meta folder ${param.path}`);
    return Promise.resolve(true);
  }
  
  const dirPath = extractContainingDirectoryPath(param.path, "/");
  const metaFilePath = getMetaIndexFilePath(dirPath);
  
  const persistIndexParam = {
    ...param,
    path: dirPath,
    saveTextFilePromise: param.saveTextFilePromise,
  };
  
  return param
    .getFileContentPromise(
      { ...param, path: metaFilePath },
      "text",
    )
    .then((metaFileContent) => {
      const tsi = safeJSONParse(metaFileContent, metaFilePath);
      const newTsi = tsi.filter((item) => item.path !== param.path);
      
      // Only persist if entries were actually removed
      if (tsi.length !== newTsi.length) {
        return persistIndex(persistIndexParam, newTsi);
      }
      return undefined;
    })
    .catch((err) => {
      console.error("removeFromIndex:", err);
      return false;
    });
}

function getMetaFullTextFilePath(
  directoryPath,
  dirSeparator = AppConfig.dirSeparator,
) {
  const basePath =
    directoryPath &&
    directoryPath.length > 0 &&
    directoryPath !== dirSeparator
      ? `${directoryPath}${dirSeparator}`
      : "";

  return normalizePath(
    `${basePath}${AppConfig.metaFolder}${dirSeparator}${AppConfig.folderFullTextFile}`,
  );
}

/**
 * Parse JSONL fulltext content. Each line: {"p":"relative/path","t":"token1 token2"}
 * Resilient — skips corrupted lines.
 * @param {string} content - Raw JSONL string
 * @returns {Object} { relativePath: textContent } map
 */
function parseFullTextJsonl(content) {
  const map = {};
  if (!content) return map;
  const lines = content.split("\n");
  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      const { p, t } = JSON.parse(line);
      if (p && t) map[p] = t;
    } catch (e) {
      console.warn("Skipping malformed JSONL line");
    }
  }
  return map;
}

/**
 * Serialize fulltext map to JSONL format.
 * @param {Object} fullTextMap - { relativePath: textContent }
 * @returns {string} JSONL string
 */
function serializeFullTextJsonl(fullTextMap) {
  const lines = [];
  for (const [p, t] of Object.entries(fullTextMap)) {
    lines.push(JSON.stringify({ p, t }));
  }
  return lines.join("\n") + "\n";
}

/**
 * Load the separate fulltext index file (tsft.jsonl).
 * Returns { relativePath: textContent } map or undefined if not found.
 * Handles both JSONL (new) and JSON (old) formats for backward compatibility.
 */
function loadFullTextIndex(param, getFileContentPromise) {
  if (!getFileContentPromise) {
    return Promise.resolve(undefined);
  }
  const directoryPath = extractDirectoryPath(param);
  const fullTextPath = getMetaFullTextFilePath(directoryPath);
  return getFileContentPromise({ ...param, path: fullTextPath }, "text")
    .then((content) => {
      if (!content) return undefined;
      const trimmed = content.trim();
      // Detect format: JSONL starts with { on first line, JSON object also starts with {
      // but JSONL has multiple lines each starting with {
      // Safest: try JSONL first (line-by-line), which also handles a single-line JSON object
      if (trimmed.startsWith("{") && !trimmed.startsWith("{\"p\"")) {
        // Old JSON object format: {"relative/path": "text content", ...}
        try {
          return JSON.parse(trimmed);
        } catch (e) {
          // Fall through to JSONL parsing
        }
      }
      return parseFullTextJsonl(content);
    })
    .catch((e) => {
      // fulltext index not found or unreadable
      return undefined;
    });
}

/**
 * Merge fulltext content into index entries in-place.
 * @param {Array} indexEntries - The directory index entries
 * @param {Object} fullTextMap - { path: textContent }
 */
function mergeFullTextIntoIndex(indexEntries, fullTextMap) {
  if (!fullTextMap || !indexEntries) return;
  for (const entry of indexEntries) {
    if (entry.path && fullTextMap[entry.path]) {
      entry.textContent = fullTextMap[entry.path];
    }
  }
}

function getMetaIndexFilePath(
  directoryPath,
  dirSeparator = AppConfig.dirSeparator,
) {
  // Build path more efficiently with conditional logic
  const basePath = directoryPath && directoryPath.length > 0 && directoryPath !== dirSeparator
    ? `${directoryPath}${dirSeparator}`
    : "";
  
  return normalizePath(
    `${basePath}${AppConfig.metaFolder}${dirSeparator}${AppConfig.folderIndexFile}`,
  );
}

/**
 * @returns {Promise<*>}
 * @param param
 * @param getFileContentPromise
 */
function loadJSONFile(param, getFileContentPromise) {
  if (!getFileContentPromise) {
    console.error("loadJSONFile getFileContentPromise is not set!");
    return Promise.resolve(false);
  }
  return getFileContentPromise(param, "text")
    .then((jsonContent) => loadJSONString(jsonContent))
    .catch((e) => {
      // file does not exist or is not readable
      return undefined;
    });
}

module.exports = {
  createIndex,
  createIncrementalIndex,
  persistIndex,
  hasIndex,
  loadIndex,
  enhanceDirectoryIndex,
  getMetaIndexFilePath,
  getMetaFullTextFilePath,
  parseFullTextJsonl,
  serializeFullTextJsonl,
  loadFullTextIndex,
  mergeFullTextIntoIndex,
  loadJSONFile,
  addToIndex,
  removeFromIndex,
};
