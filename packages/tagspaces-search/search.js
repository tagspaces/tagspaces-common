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

const fuseOptions = {
  shouldSort: true,
  threshold: 0.3,
  ignoreLocation: true,
  distance: 1000,
  minMatchCharLength: 1,
  useExtendedSearch: true,
  keys: [
    {
      name: "name",
      getFn: (entry) => entry.name,
      weight: 0.2,
    },
    {
      name: "id",
      getFn: (entry) => (entry.meta ? entry.meta.id : undefined),
      weight: 0.1,
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
      name: "tagsDescription",
      getFn: (entry) => entry.tagsDescription,
      weight: 0.2,
    },
    {
      name: "path",
      getFn: (entry) => entry.path,
      weight: 0.1,
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

    // Full-text search
    if (
      searchQuery &&
      searchQuery.textQuery &&
      searchQuery.textQuery.length > 1
    ) {
      const textResultCount = results.length;
      console.log("fuse query: " + searchQuery.textQuery);
      console.time("fuse");
      if (
        searchQuery.searchType &&
        searchQuery.searchType.includes("strict")
      ) {
        results = results.filter((entry) => {
          const ignoreCase = searchQuery.searchType === "semistrict";
          const textQuery = ignoreCase
            ? searchQuery.textQuery.toLowerCase()
            : searchQuery.textQuery;
          let description = entry.meta ? entry.meta.description : undefined;
          if (ignoreCase && description) {
            description = description.toLowerCase();
          }
          let metaId = entry.meta ? entry.meta.id : undefined;
          if (ignoreCase && metaId) {
            metaId = metaId.toLowerCase();
          }
          let textContent = entry.textContent;
          if (ignoreCase && textContent) {
            textContent = textContent.toLowerCase();
          }
          let path = entry.path;
          if (ignoreCase && path) {
            path = path.toLowerCase();
          }
          const foundInDescr = description && description.includes(textQuery);
          const foundInMetaId = metaId && metaId.includes(textQuery);
          const foundInContent = textContent && textContent.includes(textQuery);
          const foundInPath = path && path.includes(textQuery);
          return foundInPath || foundInDescr || foundInContent || foundInMetaId;
        });
      } else {
        // Fuzzy search with Fuse.js
        const fuse =
          opts.fuseInstance || new Fuse(results, fuseOptions);
        results = fuse.search(searchQuery.textQuery);
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
