/**
 * The MIT License (MIT)
 * Copyright (c) 2026-present TagSpaces Authors
 *
 * Prepares a raw directory index for search by normalizing tags,
 * extracting geo-coordinates and time periods from tag titles,
 * and building tag description strings.
 */

const { getAllTags, extractTimePeriod, parseGeoLocation } = require("./utils");

// Fast pre-filters: tags that could contain date or geo info have specific
// shapes. Skipping the full regex test suite for obvious non-matches saves
// ~12 regex checks per tag, and prepareIndex runs these on every tag of
// every entry.
//
//   Date tags begin with a digit (e.g., "20230315", "2023-01")
//   Geo tags contain a '+' (Plus Code) or alphanumeric digits letters (MGRS)
//
// These pre-filters are deliberately conservative — any string that COULD
// match goes through to the full parser. False positives (extra parse work)
// are fine; false negatives (missed matches) would silently lose features.
const DATE_LIKELY_REGEX = /^\d/;
const GEO_LIKELY_REGEX = /\+|[23456789CFGHJMPQRVWX]{8,}|\d{1,2}[C-HJ-NP-X][A-HJ-NP-Z][A-HJ-NP-V]\d/i;

/**
 * Enhances a raw index array for search.
 * Call once after loading/creating the index, cache the result.
 *
 * @param {Array} index - Raw FileSystemEntry array from tsi.json
 * @param {string} tagDelimiter - Tag delimiter (default " ")
 * @param {boolean} showUnixHiddenEntries - Include dot-prefixed entries
 * @returns {Array} Enhanced SearchIndex entries
 */
function prepareIndex(index, tagDelimiter, showUnixHiddenEntries) {
  console.time("PreparingIndex");
  let filteredIndex;
  if (showUnixHiddenEntries) {
    filteredIndex = index;
  } else {
    filteredIndex = index.filter((entry) => !entry.name.startsWith("."));
  }
  const enhancedIndex = filteredIndex.map((entry) => {
    const tags = getAllTags(entry, tagDelimiter);
    let lat = null;
    let lon = null;
    let fromTime = null;
    let toTime = null;
    let tagsDescription = "";
    let enhancedTags = [];

    if (tags && tags.length) {
      enhancedTags = tags.map((tag) => {
        const enhancedTag = { ...tag };
        try {
          const title = tag.title;
          // Fast pre-filter — skip the expensive geo/date parsers when
          // the tag title can't possibly match. Most tags in practice are
          // category labels ("photo", "work") that would never parse as
          // either, so this avoids ~12 regex tests per tag.
          if (GEO_LIKELY_REGEX.test(title)) {
            const location = parseGeoLocation(title);
            if (location !== undefined) {
              lat = location.lat;
              lon = location.lng || location.lon;
            }
          }
          if (DATE_LIKELY_REGEX.test(title)) {
            const { fromDateTime, toDateTime } = extractTimePeriod(title);
            if (fromDateTime && toDateTime) {
              fromTime = fromDateTime.getTime();
              toTime = toDateTime.getTime();
            }
          }
          if (tag.description) {
            tagsDescription += " " + String(tag.description);
          }
          if (title.toLowerCase() !== title) {
            enhancedTag.originTitle = title;
            enhancedTag.title = title.toLowerCase();
          }
        } catch (e) {
          console.log(
            "Error parsing tag " + JSON.stringify(tag) + " from " + entry.path,
          );
        }
        return enhancedTag;
      });
    }

    if (entry.meta && entry.meta.tags) {
      for (const tag of entry.meta.tags) {
        if (tag.description) {
          tagsDescription += " " + String(tag.description);
        }
      }
    }

    const enhancedEntry = {
      ...entry,
      tags: enhancedTags,
      tagsDescription: tagsDescription.trim(),
    };
    if (lat) enhancedEntry.lat = lat;
    if (lon) enhancedEntry.lon = lon;
    if (fromTime) enhancedEntry.fromTime = fromTime;
    if (toTime) enhancedEntry.toTime = toTime;
    return enhancedEntry;
  });
  console.timeEnd("PreparingIndex");
  return enhancedIndex;
}

module.exports = { prepareIndex };
