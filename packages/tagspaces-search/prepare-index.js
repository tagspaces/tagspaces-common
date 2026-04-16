/**
 * The MIT License (MIT)
 * Copyright (c) 2026-present TagSpaces Authors
 *
 * Prepares a raw directory index for search by normalizing tags,
 * extracting geo-coordinates and time periods from tag titles,
 * and building tag description strings.
 */

const { getAllTags, extractTimePeriod, parseGeoLocation } = require("./utils");

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
          const location = parseGeoLocation(tag.title);
          if (location !== undefined) {
            lat = location.lat;
            lon = location.lng || location.lon;
          }
          const { fromDateTime, toDateTime } = extractTimePeriod(tag.title);
          if (fromDateTime && toDateTime) {
            fromTime = fromDateTime.getTime();
            toTime = toDateTime.getTime();
          }
          if (tag.description) {
            tagsDescription += " " + String(tag.description);
          }
          if (tag.title.toLowerCase() !== tag.title) {
            enhancedTag.originTitle = tag.title;
            enhancedTag.title = tag.title.toLowerCase();
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
