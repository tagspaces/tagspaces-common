/**
 * The MIT License (MIT)
 * Copyright (c) 2021-present TagSpaces Authors
 *
 * Core search engine for TagSpaces. Operates on a prepared (enhanced) index.
 * Pure JS — works on all platforms (Electron, browser, Cordova, Capacitor, Node CLI).
 */

const Fuse = require("fuse.js");
const { isPathStartsWith } = require("@tagspaces/tagspaces-common/paths");
const { filterByTags, filterIndex } = require("./filters");
const { prepareIndex } = require("./prepare-index");

/**
 * Split a text query into individual terms, respecting double-quoted phrases.
 *
 *   hello world         → ["hello", "world"]
 *   "hello world"       → ["hello world"]
 *   foo "bar baz" qux   → ["foo", "bar baz", "qux"]
 *   '' or whitespace    → []
 *
 * Used by the strict and semistrict search paths to AND-combine terms.
 * Fuzzy mode keeps using Fuse.js's own extended-search parser (which already
 * supports space-as-AND and richer operators like `|`, `!`, `^`, `$`).
 */
function splitSearchTerms(query) {
  if (!query || typeof query !== "string") return [];
  const terms = [];
  const re = /"([^"]*)"|(\S+)/g;
  let m;
  while ((m = re.exec(query)) !== null) {
    const term = (m[1] !== undefined ? m[1] : m[2]).trim();
    if (term) terms.push(term);
  }
  return terms;
}

const fuseOptions = {
  shouldSort: true,
  // Tightened from 0.3 — 0.3 matched entries 1-2 edit-distance from the
  // query, producing noise for short terms ("run" matched "rum", "rug",
  // "won"). 0.2 still forgives typos but rejects spurious matches.
  threshold: 0.2,
  ignoreLocation: true,
  // (distance is only consulted when ignoreLocation is false — omitted)
  //
  // 1 is needed for single-character CJK queries to match bigram-indexed
  // content. Latin 1-char queries are rejected at an outer length gate
  // before Fuse ever runs, so this doesn't hurt Latin search.
  minMatchCharLength: 1,
  useExtendedSearch: true,
  // Weights rank where a match counts most. Filenames win — that's what
  // users type toward in almost every search. id and tagsDescription
  // are demoted because they rarely represent user intent.
  keys: [
    {
      name: "name",
      getFn: (entry) => entry.name,
      weight: 0.4,
    },
    {
      name: "description",
      getFn: (entry) => (entry.meta ? entry.meta.description : undefined),
      weight: 0.2,
    },
    {
      name: "textContent",
      getFn: (entry) => entry.textContent,
      weight: 0.2,
    },
    {
      name: "path",
      getFn: (entry) => entry.path,
      weight: 0.1,
    },
    {
      name: "tagsDescription",
      getFn: (entry) => entry.tagsDescription,
      weight: 0.05,
    },
    {
      name: "id",
      getFn: (entry) => (entry.meta ? entry.meta.id : undefined),
      weight: 0.05,
    },
  ],
};

// Return a copy of each entry with tag titles restored to their original case.
// Non-mutating — the prepared index may be cached and reused across searches,
// so we must not mutate its tag objects.
function setOriginTitle(results) {
  return results.map((entry) => {
    if (!entry.tags || !entry.tags.length) return entry;
    const hasOrigin = entry.tags.some((t) => t.originTitle);
    if (!hasOrigin) return entry;
    return {
      ...entry,
      tags: entry.tags.map((tag) =>
        tag.originTitle ? { ...tag, title: tag.originTitle } : tag,
      ),
    };
  });
}

/**
 * Check if a search query has any active filters.
 */
function haveSearchFilters(searchQuery) {
  const AppConfig = require("@tagspaces/tagspaces-common/AppConfig");
  return (
    searchQuery &&
    (searchQuery.textQuery ||
      (searchQuery.tagsAND !== undefined && searchQuery.tagsAND.length > 0) ||
      (searchQuery.tagsNOT !== undefined && searchQuery.tagsNOT.length > 0) ||
      (searchQuery.tagsOR !== undefined && searchQuery.tagsOR.length > 0) ||
      (searchQuery.fileTypes !== undefined &&
        searchQuery.fileTypes !== AppConfig.SearchTypeGroups.any) ||
      searchQuery.lastModified ||
      searchQuery.dateCreated ||
      searchQuery.tagTimePeriodFrom ||
      searchQuery.tagTimePeriodTo ||
      searchQuery.tagPlaceLat ||
      searchQuery.tagPlaceLong ||
      searchQuery.fileSize)
  );
}

/**
 * Search a location index.
 *
 * @param {Array} locationContent - Raw or enhanced index entries
 * @param {Object} searchQuery - SearchQuery object with filters
 * @param {string} tagDelimiter - Tag delimiter (default " ")
 * @param {Object} [options] - Optional settings
 * @param {Object} [options.fuseInstance] - Pre-built Fuse.js instance (for caching)
 * @param {Array}  [options.preparedIndex] - Pre-prepared (enhanced) index (for caching)
 * @returns {Promise<Array>} Matching entries
 */
function searchLocationIndex(
  locationContent,
  searchQuery,
  tagDelimiter,
  options,
) {
  return new Promise((resolve, reject) => {
    console.time("searchtime");
    if (!locationContent || locationContent.length === 0) {
      reject(new Error("No Index"));
      return;
    }

    const opts = options || {};

    // Use pre-prepared index or prepare now
    let results = opts.preparedIndex
      ? opts.preparedIndex
      : prepareIndex(
          locationContent,
          tagDelimiter,
          searchQuery.showUnixHiddenEntries,
        );

    let searched = false;

    // Scope to current folder (with sub-folders)
    if (searchQuery.searchBoxing === "folder") {
      results = results.filter((entry) =>
        isPathStartsWith(entry.path, searchQuery.currentDirectory),
      );
    }

    // Tag-based filtering (replaces JMESPath)
    const hasTagFilters =
      (searchQuery.tagsOR && searchQuery.tagsOR.length > 0) ||
      (searchQuery.tagsAND && searchQuery.tagsAND.length > 0) ||
      (searchQuery.tagsNOT && searchQuery.tagsNOT.length > 0) ||
      (searchQuery.fileTypes &&
        searchQuery.fileTypes.length > 0 &&
        searchQuery.fileTypes[0] !== "");

    if (hasTagFilters) {
      const resultCount = results.length;
      console.time("filterByTags");
      results = filterByTags(results, searchQuery);
      console.timeEnd("filterByTags");
      console.log("filterByTags results: " + results.length);
      searched = searched || results.length <= resultCount;
    }

    // Date, size, geo, time-period filters
    const resultCount = results.length;
    results = filterIndex(results, searchQuery);
    searched = searched || results.length <= resultCount;

    // Full-text search — require a non-trivial query (at least one non-empty
    // term of length > 1). Whitespace-only queries are a no-op.
    const rawQuery =
      searchQuery && searchQuery.textQuery ? searchQuery.textQuery : "";
    const hasMeaningfulQuery =
      rawQuery.trim().length > 1 ||
      (rawQuery.trim().length === 1 && /[\u2E80-\u9FFF]/.test(rawQuery));
    if (searchQuery && rawQuery && hasMeaningfulQuery) {
      const textResultCount = results.length;
      console.log("fuse query: " + rawQuery);
      console.time("fuse");
      if (
        searchQuery.searchType &&
        searchQuery.searchType.includes("strict")
      ) {
        const ignoreCase = searchQuery.searchType === "semistrict";
        // Split on whitespace (respecting quoted phrases) and AND-combine —
        // every non-empty term must match at least one of the searchable
        // fields. This matches fuzzy-mode's AND semantics; before this
        // change, strict mode treated the whole query as one literal
        // substring, so "hello world" required the exact phrase.
        const rawTerms = splitSearchTerms(rawQuery);
        const terms = ignoreCase
          ? rawTerms.map((t) => t.toLowerCase())
          : rawTerms;
        if (terms.length > 0) {
          results = results.filter((entry) => {
            let description = entry.meta ? entry.meta.description : undefined;
            let metaId = entry.meta ? entry.meta.id : undefined;
            let textContent = entry.textContent;
            let path = entry.path;
            if (ignoreCase) {
              if (description) description = description.toLowerCase();
              if (metaId) metaId = metaId.toLowerCase();
              if (textContent) textContent = textContent.toLowerCase();
              if (path) path = path.toLowerCase();
            }
            // Every term must match at least ONE field
            for (const term of terms) {
              const foundInPath = path && path.includes(term);
              const foundInDescr =
                description && description.includes(term);
              const foundInContent =
                textContent && textContent.includes(term);
              const foundInMetaId = metaId && metaId.includes(term);
              if (
                !(foundInPath || foundInDescr || foundInContent || foundInMetaId)
              ) {
                return false;
              }
            }
            return true;
          });
        }
      } else {
        // Fuzzy search with Fuse.js — extended search handles space=AND,
        // `|`=OR, and richer operators (see docs in the UI help).
        const fuse = opts.fuseInstance || new Fuse(results, fuseOptions);
        results = fuse.search(rawQuery);
      }
      console.timeEnd("fuse");
      searched = searched || results.length <= textResultCount;
    }

    if (searched) {
      console.log("Results found: " + results.length);
      if (
        searchQuery &&
        searchQuery.maxSearchResults &&
        results.length >= searchQuery.maxSearchResults
      ) {
        results = results.slice(0, searchQuery.maxSearchResults);
      }
      // Unwrap Fuse.js result shape and strip textContent for the response.
      // Non-mutating — the prepared index may be cached, so we must not
      // delete textContent from its entries.
      results = results.map((result) => {
        const item = result.item !== undefined ? result.item : result;
        if (item.textContent) {
          const { textContent, ...rest } = item;
          return rest;
        }
        return item;
      });
      console.log("Results sent: " + results.length);
      console.timeEnd("searchtime");
      resolve(setOriginTitle(results));
      return;
    }
    results = [];
    console.timeEnd("searchtime");
    resolve(results);
  });
}

/**
 * Generate a default search title from a query object.
 */
function defaultTitle(searchQuery) {
  let title = "";
  if (searchQuery) {
    if (searchQuery.textQuery) {
      title += searchQuery.textQuery;
    }
    if (searchQuery.tagsAND && searchQuery.tagsAND.length > 0) {
      title += searchQuery.tagsAND.map((tag) => " +" + tag.title);
    }
    if (searchQuery.tagsNOT && searchQuery.tagsNOT.length > 0) {
      title += searchQuery.tagsNOT.map((tag) => " -" + tag.title);
    }
    if (searchQuery.tagsOR && searchQuery.tagsOR.length > 0) {
      title += searchQuery.tagsOR.map((tag) => " |" + tag.title);
    }
  }
  return title.trim();
}

module.exports = {
  searchLocationIndex,
  haveSearchFilters,
  defaultTitle,
  fuseOptions,
};
