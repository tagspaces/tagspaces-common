/**
 * The MIT License (MIT)
 * Copyright (c) 2026-present TagSpaces Authors
 *
 * @tagspaces/tagspaces-search — search and index query module.
 * Pure JS, works on all platforms: Electron, browser, Cordova, Capacitor, Node CLI.
 */

const {
  searchLocationIndex,
  haveSearchFilters,
  defaultTitle,
  fuseOptions,
} = require("./search");
const { prepareIndex } = require("./prepare-index");
const {
  filterByTags,
  filterByFileType,
  filterByDatePeriod,
  filterIndex,
} = require("./filters");
const {
  getAllTags,
  extractTimePeriod,
  isDateTimeTag,
  getDaysInMonth,
  parseGeoLocation,
  isPlusCode,
  isMgrsString,
  isGeoTag,
} = require("./utils");

module.exports = {
  // Core search
  searchLocationIndex,
  haveSearchFilters,
  defaultTitle,
  fuseOptions,
  // Index preparation
  prepareIndex,
  // Filters
  filterByTags,
  filterByFileType,
  filterByDatePeriod,
  filterIndex,
  // Utilities
  getAllTags,
  extractTimePeriod,
  isDateTimeTag,
  getDaysInMonth,
  parseGeoLocation,
  isPlusCode,
  isMgrsString,
  isGeoTag,
};
