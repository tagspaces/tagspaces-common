/**
 * The MIT License (MIT)
 * Copyright (c) 2026-present TagSpaces Authors
 *
 * Filter functions for search: tag-based filtering (replaces JMESPath),
 * file-type filtering, date/size filtering.
 * Pure JS — no external dependencies beyond AppConfig.
 */

const AppConfig = require("@tagspaces/tagspaces-common/AppConfig");

/**
 * Filter entries by tag AND/OR/NOT criteria using Set-based O(1) lookups.
 * Replaces the previous JMESPath-based implementation.
 */
function filterByTags(entries, searchQuery) {
  let results = entries;

  // OR: entry must have at least one of the OR tags
  if (searchQuery.tagsOR && searchQuery.tagsOR.length > 0) {
    const orSet = new Set(
      searchQuery.tagsOR.map((t) => t.title.trim().toLowerCase()),
    );
    results = results.filter(
      (e) => e.tags && e.tags.some((tag) => orSet.has(tag.title)),
    );
  }

  // AND: entry must have ALL of the AND tags
  if (searchQuery.tagsAND && searchQuery.tagsAND.length > 0) {
    const andTitles = searchQuery.tagsAND.map((t) =>
      t.title.trim().toLowerCase(),
    );
    results = results.filter((e) => {
      if (!e.tags || e.tags.length === 0) return false;
      const entryTagSet = new Set(e.tags.map((t) => t.title));
      return andTitles.every((title) => entryTagSet.has(title));
    });
  }

  // NOT: entry must have NONE of the NOT tags
  if (searchQuery.tagsNOT && searchQuery.tagsNOT.length > 0) {
    const notSet = new Set(
      searchQuery.tagsNOT.map((t) => t.title.trim().toLowerCase()),
    );
    results = results.filter(
      (e) => !e.tags || !e.tags.some((tag) => notSet.has(tag.title)),
    );
  }

  // File type filtering
  results = filterByFileType(results, searchQuery);

  return results;
}

/**
 * Filter entries by file type / extension groups.
 */
function filterByFileType(entries, searchQuery) {
  if (
    !searchQuery.fileTypes ||
    searchQuery.fileTypes.length === 0 ||
    (searchQuery.fileTypes.length === 1 &&
      searchQuery.fileTypes[0] === AppConfig.SearchTypeGroups.any[0])
  ) {
    return entries;
  }

  const fileTypes = searchQuery.fileTypes;

  if (fileTypes[0] === AppConfig.SearchTypeGroups.folders[0]) {
    return entries.filter((e) => !e.isFile);
  }
  if (fileTypes[0] === AppConfig.SearchTypeGroups.files[0]) {
    return entries.filter((e) => e.isFile);
  }
  if (fileTypes[0] === AppConfig.SearchTypeGroups.untagged[0]) {
    return entries.filter((e) => !e.tags || e.tags.length === 0);
  }

  // Extension-based filter
  const extSet = new Set(fileTypes.map((ext) => ext.toLowerCase()));
  return entries.filter(
    (e) => e.extension && extSet.has(e.extension.toLowerCase()),
  );
}

/**
 * Filter entries by date period (last modified or date created).
 */
function filterByDatePeriod(items, periodKey, getTimeValue) {
  if (!periodKey) return items;

  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime();
  const msInDay = 1000 * 60 * 60 * 24;

  let fromTs = null;
  let toTs = null;

  if (periodKey === AppConfig.SearchTimePeriods.today.key) {
    fromTs = startOfToday;
    toTs = Number.MAX_VALUE;
  } else if (periodKey === AppConfig.SearchTimePeriods.yesterday.key) {
    fromTs = startOfToday - msInDay;
    toTs = startOfToday;
  } else if (periodKey === AppConfig.SearchTimePeriods.past7Days.key) {
    fromTs = startOfToday - msInDay * 7;
    toTs = startOfToday;
  } else if (periodKey === AppConfig.SearchTimePeriods.past30Days.key) {
    fromTs = startOfToday - msInDay * 30;
    toTs = startOfToday;
  } else if (periodKey === AppConfig.SearchTimePeriods.past6Months.key) {
    fromTs = startOfToday - msInDay * 30 * 6;
    toTs = startOfToday;
  } else if (periodKey === AppConfig.SearchTimePeriods.pastYear.key) {
    fromTs = startOfToday - msInDay * 365;
    toTs = startOfToday;
  } else if (periodKey === AppConfig.SearchTimePeriods.moreThanYear.key) {
    fromTs = 0;
    toTs = startOfToday - msInDay * 365;
  }

  if (fromTs === null || toTs === null) return items;

  return items.filter((entry) => {
    const t = getTimeValue(entry) || 0;
    return t >= fromTs && t <= toTs;
  });
}

/**
 * Apply date, size, tag-time-period, and tag-place filters.
 */
function filterIndex(data, searchQuery) {
  let results = data;

  results = filterByDatePeriod(
    results,
    searchQuery.lastModified,
    (entry) => entry.lmdt,
  );
  results = filterByDatePeriod(
    results,
    searchQuery.dateCreated,
    (entry) => entry.cdt,
  );

  // File size filtering
  const fileSizeMap = {
    [AppConfig.SearchSizes.empty.key]: (entry) =>
      entry.size === AppConfig.SearchSizes.empty.thresholdBytes && entry.isFile,
    [AppConfig.SearchSizes.tiny.key]: (entry) =>
      entry.size > AppConfig.SearchSizes.empty.thresholdBytes &&
      entry.size <= AppConfig.SearchSizes.tiny.thresholdBytes &&
      entry.isFile,
    [AppConfig.SearchSizes.verySmall.key]: (entry) =>
      entry.size > AppConfig.SearchSizes.tiny.thresholdBytes &&
      entry.size <= AppConfig.SearchSizes.verySmall.thresholdBytes &&
      entry.isFile,
    [AppConfig.SearchSizes.small.key]: (entry) =>
      entry.size > AppConfig.SearchSizes.verySmall.thresholdBytes &&
      entry.size <= AppConfig.SearchSizes.small.thresholdBytes &&
      entry.isFile,
    [AppConfig.SearchSizes.medium.key]: (entry) =>
      entry.size > AppConfig.SearchSizes.small.thresholdBytes &&
      entry.size <= AppConfig.SearchSizes.medium.thresholdBytes &&
      entry.isFile,
    [AppConfig.SearchSizes.large.key]: (entry) =>
      entry.size > AppConfig.SearchSizes.medium.thresholdBytes &&
      entry.size <= AppConfig.SearchSizes.large.thresholdBytes &&
      entry.isFile,
    [AppConfig.SearchSizes.huge.key]: (entry) =>
      entry.size > AppConfig.SearchSizes.huge.thresholdBytes && entry.isFile,
  };

  if (searchQuery.fileSize && fileSizeMap[searchQuery.fileSize]) {
    results = results.filter(fileSizeMap[searchQuery.fileSize]);
  }

  // Tag time period filtering
  if (searchQuery.tagTimePeriodFrom && searchQuery.tagTimePeriodTo) {
    results = results.filter(
      (entry) =>
        searchQuery.tagTimePeriodFrom <= entry.fromTime &&
        entry.toTime <= searchQuery.tagTimePeriodTo,
    );
  }

  // Tag geo-location filtering
  if (searchQuery.tagPlaceLat && searchQuery.tagPlaceLong) {
    results = results.filter(
      (entry) =>
        searchQuery.tagPlaceLat === entry.lat &&
        searchQuery.tagPlaceLong === entry.lon,
    );
  }

  return results;
}

module.exports = {
  filterByTags,
  filterByFileType,
  filterByDatePeriod,
  filterIndex,
};
