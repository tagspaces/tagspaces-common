/**
 * The MIT License (MIT)
 * Copyright (c) 2026-present TagSpaces Authors
 *
 * Utility functions for search: tag extraction, date/time period parsing,
 * and geo-location parsing. Pure JS — works on all platforms (Electron,
 * browser, Cordova, Capacitor, Node CLI).
 */

const AppConfig = require("@tagspaces/tagspaces-common/AppConfig");
const { extractTagsAsObjects } = require("@tagspaces/tagspaces-common/paths");

let mgrs;
try {
  mgrs = require("mgrs");
} catch (e) {
  // mgrs may fail to load in some mobile WebView environments
  console.warn("mgrs library not available — MGRS geo-tag parsing disabled");
}

let OpenLocationCode;
try {
  OpenLocationCode = require("open-location-code-typescript");
  // Handle both default and named exports
  if (OpenLocationCode.default) {
    OpenLocationCode = OpenLocationCode.default;
  }
} catch (e) {
  console.warn(
    "open-location-code-typescript not available — Plus Code parsing disabled",
  );
}

// --- Tag extraction ---

/**
 * Collects tags from both sidecar metadata and filename.
 * Deduplicates by title.
 */
function getAllTags(entry, tagDelimiter) {
  const tags = [];
  if (entry.meta && entry.meta.tags && entry.meta.tags.length > 0) {
    tags.push(...entry.meta.tags);
  }
  let fileNameTags;
  if (entry.tags && entry.tags.length > 0) {
    fileNameTags = entry.tags;
  } else if (
    entry.path.indexOf(AppConfig.beginTagContainer) !== -1 &&
    entry.path.indexOf(AppConfig.endTagContainer) !== -1
  ) {
    fileNameTags = extractTagsAsObjects(entry.name, tagDelimiter);
  }
  if (fileNameTags) {
    if (tags.length > 0) {
      const filteredTags = fileNameTags.filter(
        (tag) => !tags.some((t) => t.title === tag.title),
      );
      tags.push(...filteredTags);
    } else {
      tags.push(...fileNameTags);
    }
  }
  return tags;
}

// --- Date/time validation helpers ---

function isYear(tagDate) {
  return /(^|\s)([0123]\d{3})(\s|$)/.test(tagDate);
}

function isYearPeriod(tagDate) {
  return /(^|\s)([0123]\d{3}-[0123]\d{3})(\s|$)/.test(tagDate);
}

function isValidDatePart(yyyymmdd) {
  const year = parseInt(yyyymmdd.slice(0, 4), 10);
  const month = parseInt(yyyymmdd.slice(4, 6), 10);
  const day = parseInt(yyyymmdd.slice(6, 8), 10);
  if (month < 1 || month > 12 || day < 1) return false;
  return day <= getDaysInMonth(year, month);
}

function isYearMonth(tagDate) {
  if (!/(^|\s)([0123]\d{3}[01]\d)(\s|$)/.test(tagDate)) {
    return false;
  }
  const match = tagDate.trim();
  const month = parseInt(match.slice(4, 6), 10);
  return month >= 1 && month <= 12;
}

function isYearMonthPeriod(tagDate) {
  if (!/(^|\s)([0123]\d{3}[01]\d-[0123]\d{3}[01]\d)(\s|$)/.test(tagDate)) {
    return false;
  }
  const t = tagDate.trim();
  const m1 = parseInt(t.slice(4, 6), 10);
  const m2 = parseInt(t.slice(11, 13), 10);
  return m1 >= 1 && m1 <= 12 && m2 >= 1 && m2 <= 12;
}

function isYearMonthDay(tagDate) {
  if (!/(^|\s)([0123]\d{3}[01]\d[0123]\d)(\s|$)/.test(tagDate)) {
    return false;
  }
  return isValidDatePart(tagDate.trim().slice(0, 8));
}

function isYearMonthDayPeriod(tagDate) {
  if (
    !/(^|\s)([0123]\d{3}[01]\d[0123]\d-[0123]\d{3}[01]\d[0123]\d)(\s|$)/.test(
      tagDate,
    )
  ) {
    return false;
  }
  const t = tagDate.trim();
  return isValidDatePart(t.slice(0, 8)) && isValidDatePart(t.slice(9, 17));
}

function isYearMonthDayHour(tagDate) {
  if (!/(^|\s)([0123]\d{3}[01]\d[0123]\d[~T][0-5]\d)(\s|$)/.test(tagDate)) {
    return false;
  }
  return isValidDatePart(tagDate.trim().slice(0, 8));
}

function isYearMonthDayHourPeriod(tagDate) {
  if (
    !/(^|\s)([0123]\d{3}[01]\d[0123]\d[~T][0-5]\d-[0123]\d{3}[01]\d[0123]\d[~T][0-5]\d)(\s|$)/.test(
      tagDate,
    )
  ) {
    return false;
  }
  const t = tagDate.trim();
  return isValidDatePart(t.slice(0, 8)) && isValidDatePart(t.slice(12, 20));
}

function isYearMonthDayHourMin(tagDate) {
  if (
    !/(^|\s)([0123]\d{3}[01]\d[0123]\d[~T][0-5]\d[0-5]\d)(\s|$)/.test(tagDate)
  ) {
    return false;
  }
  return isValidDatePart(tagDate.trim().slice(0, 8));
}

function isYearMonthDayHourMinPeriod(tagDate) {
  if (
    !/(^|\s)([0123]\d{3}[01]\d[0123]\d[~T][0-5]\d[0-5]\d-[0123]\d{3}[01]\d[0123]\d[~T][0-5]\d[0-5]\d)(\s|$)/.test(
      tagDate,
    )
  ) {
    return false;
  }
  const t = tagDate.trim();
  return isValidDatePart(t.slice(0, 8)) && isValidDatePart(t.slice(14, 22));
}

function isYearMonthDayHourMinSec(tagDate) {
  if (
    !/(^|\s)([0123]\d{3}[01]\d[0123]\d[~T][0-5]\d[0-5]\d[0-5]\d)(\s|$)/.test(
      tagDate,
    )
  ) {
    return false;
  }
  return isValidDatePart(tagDate.trim().slice(0, 8));
}

function isYearMonthDayHourMinSecPeriod(tagDate) {
  if (
    !/(^|\s)([0123]\d{3}[01]\d[0123]\d[~T][0-5]\d[0-5]\d[0-5]\d-[0123]\d{3}[01]\d[0123]\d[~T][0-5]\d[0-5]\d[0-5]\d)(\s|$)/.test(
      tagDate,
    )
  ) {
    return false;
  }
  const t = tagDate.trim();
  return isValidDatePart(t.slice(0, 8)) && isValidDatePart(t.slice(16, 24));
}

function getDaysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

function isDateTimeTag(tagDate) {
  return (
    isYear(tagDate) ||
    isYearPeriod(tagDate) ||
    isYearMonth(tagDate) ||
    isYearMonthPeriod(tagDate) ||
    isYearMonthDay(tagDate) ||
    isYearMonthDayPeriod(tagDate) ||
    isYearMonthDayHour(tagDate) ||
    isYearMonthDayHourPeriod(tagDate) ||
    isYearMonthDayHourMin(tagDate) ||
    isYearMonthDayHourMinPeriod(tagDate) ||
    isYearMonthDayHourMinSec(tagDate) ||
    isYearMonthDayHourMinSecPeriod(tagDate)
  );
}

/**
 * Extract the time period from a date tag string.
 * e.g. "201901" -> fromDate: 2019-01-01 00:00:00, toDate: 2019-01-31 23:59:59
 */
function extractTimePeriod(value) {
  let fromDateTime = null;
  let toDateTime = null;
  if (value.length && !/(^|\s)([0123456789])(\s|$)/.test(value.substr(0, 1))) {
    return { fromDateTime, toDateTime };
  }
  try {
    if (isYear(value)) {
      fromDateTime = new Date(value + "-01-01");
      toDateTime = new Date(value + "-12-31 23:59:59.999");
    } else if (isYearPeriod(value)) {
      const fromYear = value.substring(0, 4);
      const toYear = value.substring(5, 9);
      fromDateTime = new Date(fromYear + "-01-01");
      toDateTime = new Date(toYear + "-12-31 23:59:59.999");
    } else if (isYearMonth(value)) {
      const year = value.substring(0, 4);
      const month = value.substring(4, 6);
      fromDateTime = new Date(year + "-" + month + "-01");
      toDateTime = new Date(
        year +
          "-" +
          month +
          "-" +
          getDaysInMonth(parseInt(year, 10), parseInt(month, 10)) +
          " 23:59:59.999",
      );
    } else if (isYearMonthPeriod(value)) {
      const fromYear = value.substring(0, 4);
      const fromMonth = value.substring(4, 6);
      const toYear = value.substring(7, 11);
      const toMonth = value.substring(11, 13);
      fromDateTime = new Date(fromYear + "-" + fromMonth + "-01");
      toDateTime = new Date(
        toYear +
          "-" +
          toMonth +
          "-" +
          getDaysInMonth(parseInt(toYear, 10), parseInt(toMonth, 10)) +
          " 23:59:59.999",
      );
    } else if (isYearMonthDayPeriod(value)) {
      const fromYear = value.substring(0, 4);
      const fromMonth = value.substring(4, 6);
      const fromDay = value.substring(6, 8);
      const toYear = value.substring(9, 13);
      const toMonth = value.substring(13, 15);
      const toDay = value.substring(15, 17);
      fromDateTime = new Date(fromYear + "-" + fromMonth + "-" + fromDay);
      toDateTime = new Date(
        toYear + "-" + toMonth + "-" + toDay + " 23:59:59.999",
      );
    } else if (isYearMonthDay(value)) {
      const year = value.substring(0, 4);
      const month = value.substring(4, 6);
      const day = value.substring(6, 8);
      fromDateTime = new Date(year + "-" + month + "-" + day);
      toDateTime = new Date(year + "-" + month + "-" + day + " 23:59:59.999");
    } else if (isYearMonthDayHour(value)) {
      const year = value.substring(0, 4);
      const month = value.substring(4, 6);
      const day = value.substring(6, 8);
      const hour = value.substring(9, 11);
      fromDateTime = new Date(
        year + "-" + month + "-" + day + " " + hour + ":00:00",
      );
      toDateTime = new Date(
        year + "-" + month + "-" + day + " " + hour + ":59:59.999",
      );
    } else if (isYearMonthDayHourPeriod(value)) {
      const fromYear = value.substring(0, 4);
      const fromMonth = value.substring(4, 6);
      const fromDay = value.substring(6, 8);
      const fromHour = value.substring(9, 11);
      const toYear = value.substring(12, 16);
      const toMonth = value.substring(16, 18);
      const toDay = value.substring(18, 20);
      const toHour = value.substring(21, 23);
      fromDateTime = new Date(
        fromYear + "-" + fromMonth + "-" + fromDay + " " + fromHour + ":00:00",
      );
      toDateTime = new Date(
        toYear + "-" + toMonth + "-" + toDay + " " + toHour + ":59:59.999",
      );
    } else if (isYearMonthDayHourMin(value)) {
      const year = value.substring(0, 4);
      const month = value.substring(4, 6);
      const day = value.substring(6, 8);
      const hour = value.substring(9, 11);
      const min = value.substring(11, 13);
      fromDateTime = new Date(
        year + "-" + month + "-" + day + " " + hour + ":" + min + ":00",
      );
      toDateTime = new Date(
        year + "-" + month + "-" + day + " " + hour + ":" + min + ":59.999",
      );
    } else if (isYearMonthDayHourMinPeriod(value)) {
      const fromYear = value.substring(0, 4);
      const fromMonth = value.substring(4, 6);
      const fromDay = value.substring(6, 8);
      const fromHour = value.substring(9, 11);
      const fromMin = value.substring(11, 13);
      const toYear = value.substring(14, 18);
      const toMonth = value.substring(18, 20);
      const toDay = value.substring(20, 22);
      const toHour = value.substring(23, 25);
      const toMin = value.substring(25, 27);
      fromDateTime = new Date(
        fromYear +
          "-" +
          fromMonth +
          "-" +
          fromDay +
          " " +
          fromHour +
          ":" +
          fromMin +
          ":00",
      );
      toDateTime = new Date(
        toYear +
          "-" +
          toMonth +
          "-" +
          toDay +
          " " +
          toHour +
          ":" +
          toMin +
          ":59.999",
      );
    } else if (isYearMonthDayHourMinSec(value)) {
      const year = value.substring(0, 4);
      const month = value.substring(4, 6);
      const day = value.substring(6, 8);
      const hour = value.substring(9, 11);
      const min = value.substring(11, 13);
      const sec = value.substring(13, 15);
      fromDateTime = new Date(
        year + "-" + month + "-" + day + " " + hour + ":" + min + ":" + sec,
      );
      toDateTime = new Date(
        year +
          "-" +
          month +
          "-" +
          day +
          " " +
          hour +
          ":" +
          min +
          ":" +
          sec +
          ".999",
      );
    } else if (isYearMonthDayHourMinSecPeriod(value)) {
      const fromYear = value.substring(0, 4);
      const fromMonth = value.substring(4, 6);
      const fromDay = value.substring(6, 8);
      const fromHour = value.substring(9, 11);
      const fromMin = value.substring(11, 13);
      const fromSec = value.substring(13, 15);
      const toYear = value.substring(16, 20);
      const toMonth = value.substring(20, 22);
      const toDay = value.substring(22, 24);
      const toHour = value.substring(25, 27);
      const toMin = value.substring(27, 29);
      const toSec = value.substring(29, 31);
      fromDateTime = new Date(
        fromYear +
          "-" +
          fromMonth +
          "-" +
          fromDay +
          " " +
          fromHour +
          ":" +
          fromMin +
          ":" +
          fromSec,
      );
      toDateTime = new Date(
        toYear +
          "-" +
          toMonth +
          "-" +
          toDay +
          " " +
          toHour +
          ":" +
          toMin +
          ":" +
          toSec +
          ".999",
      );
    }
  } catch (err) {
    console.log("Error extracting date " + err);
  }
  return { fromDateTime, toDateTime };
}

// --- Geo-location parsing ---

const PLUS_CODE_REGEX =
  /(^|\s)([23456789C][23456789CFGHJMPQRV][23456789CFGHJMPQRVWX]{6}\+[23456789CFGHJMPQRVWX]{2,3})(\s|$)/;
const MGRS_REGEX =
  /^(\d{1,2})([C-HJ-NP-X])\s*([A-HJ-NP-Z])([A-HJ-NP-V])\s*(\d{1,5}\s*\d{1,5})$/i;

function isPlusCode(plusCode) {
  if (!plusCode || typeof plusCode !== "string") return false;
  return PLUS_CODE_REGEX.test(plusCode.toUpperCase());
}

function isMgrsString(code) {
  if (!code || typeof code !== "string") return false;
  return MGRS_REGEX.test(code.replace(/\s+/g, ""));
}

function isGeoTag(code) {
  return isPlusCode(code) || isMgrsString(code);
}

/**
 * Parses geographic location from Plus Code or MGRS format.
 * Gracefully returns undefined if the parsing libraries are not available
 * (e.g. on some mobile WebView environments).
 */
function parseGeoLocation(code) {
  if (!code) return undefined;

  if (isPlusCode(code) && OpenLocationCode) {
    try {
      const coord = OpenLocationCode.decode(code);
      const lat = Number(coord.latitudeLo.toFixed(7));
      const lng = Number(coord.longitudeLo.toFixed(7));
      return { lat, lng };
    } catch (error) {
      console.warn("Failed to parse Plus Code:", code, error);
      return undefined;
    }
  }

  if (isMgrsString(code) && mgrs) {
    try {
      const [lng, lat] = mgrs.toPoint(code);
      return { lat, lng };
    } catch (error) {
      console.warn("Failed to parse MGRS code:", code, error);
      return undefined;
    }
  }

  return undefined;
}

module.exports = {
  getAllTags,
  extractTimePeriod,
  isDateTimeTag,
  getDaysInMonth,
  parseGeoLocation,
  isPlusCode,
  isMgrsString,
  isGeoTag,
};
