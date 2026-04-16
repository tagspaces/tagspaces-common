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

describe("utils - getDaysInMonth", () => {
  test("returns 31 for January", () => {
    expect(getDaysInMonth(2024, 1)).toBe(31);
  });

  test("returns 28 for February in a non-leap year", () => {
    expect(getDaysInMonth(2023, 2)).toBe(28);
  });

  test("returns 29 for February in a leap year", () => {
    expect(getDaysInMonth(2024, 2)).toBe(29);
  });

  test("returns 30 for April", () => {
    expect(getDaysInMonth(2024, 4)).toBe(30);
  });

  test("returns 31 for December", () => {
    expect(getDaysInMonth(2024, 12)).toBe(31);
  });
});

describe("utils - isDateTimeTag", () => {
  test("recognizes year tags", () => {
    expect(isDateTimeTag("2024")).toBe(true);
    expect(isDateTimeTag("1999")).toBe(true);
    expect(isDateTimeTag("0001")).toBe(true);
  });

  test("recognizes year period tags", () => {
    expect(isDateTimeTag("2020-2024")).toBe(true);
  });

  test("recognizes year-month tags", () => {
    expect(isDateTimeTag("202401")).toBe(true);
    expect(isDateTimeTag("202412")).toBe(true);
  });

  test("recognizes year-month period tags", () => {
    expect(isDateTimeTag("202401-202406")).toBe(true);
  });

  test("recognizes year-month-day tags", () => {
    expect(isDateTimeTag("20240115")).toBe(true);
  });

  test("recognizes year-month-day period tags", () => {
    expect(isDateTimeTag("20240101-20240131")).toBe(true);
  });

  test("recognizes year-month-day-hour tags with ~ separator", () => {
    expect(isDateTimeTag("20240115~14")).toBe(true);
  });

  test("recognizes year-month-day-hour tags with T separator", () => {
    expect(isDateTimeTag("20240115T14")).toBe(true);
  });

  test("recognizes year-month-day-hour-min tags", () => {
    expect(isDateTimeTag("20240115~1430")).toBe(true);
  });

  test("recognizes year-month-day-hour-min-sec tags", () => {
    expect(isDateTimeTag("20240115~143059")).toBe(true);
  });

  test("rejects invalid dates", () => {
    expect(isDateTimeTag("")).toBe(false);
    expect(isDateTimeTag("abc")).toBe(false);
    expect(isDateTimeTag("99")).toBe(false);
  });

  test("rejects invalid month in year-month tag", () => {
    expect(isDateTimeTag("202413")).toBe(false);
    expect(isDateTimeTag("202400")).toBe(false);
  });

  test("rejects invalid day in year-month-day tag", () => {
    expect(isDateTimeTag("20240230")).toBe(false);
    expect(isDateTimeTag("20240132")).toBe(false);
  });
});

describe("utils - extractTimePeriod", () => {
  test("parses year tag", () => {
    const { fromDateTime, toDateTime } = extractTimePeriod("2024");
    expect(fromDateTime).not.toBeNull();
    expect(toDateTime).not.toBeNull();
    expect(fromDateTime.getFullYear()).toBe(2024);
    expect(fromDateTime.getMonth()).toBe(0); // January
    expect(fromDateTime.getDate()).toBe(1);
    expect(toDateTime.getFullYear()).toBe(2024);
    expect(toDateTime.getMonth()).toBe(11); // December
    expect(toDateTime.getDate()).toBe(31);
  });

  test("parses year period tag", () => {
    const { fromDateTime, toDateTime } = extractTimePeriod("2020-2024");
    expect(fromDateTime.getFullYear()).toBe(2020);
    expect(toDateTime.getFullYear()).toBe(2024);
    expect(toDateTime.getMonth()).toBe(11);
  });

  test("parses year-month tag", () => {
    const { fromDateTime, toDateTime } = extractTimePeriod("202402");
    expect(fromDateTime.getFullYear()).toBe(2024);
    expect(fromDateTime.getMonth()).toBe(1); // February
    expect(fromDateTime.getDate()).toBe(1);
    expect(toDateTime.getDate()).toBe(29); // 2024 is leap year
  });

  test("parses year-month-day tag", () => {
    const { fromDateTime, toDateTime } = extractTimePeriod("20240315");
    expect(fromDateTime.getFullYear()).toBe(2024);
    expect(fromDateTime.getMonth()).toBe(2); // March
    expect(fromDateTime.getDate()).toBe(15);
    expect(toDateTime.getDate()).toBe(15);
  });

  test("parses year-month-day period tag", () => {
    const { fromDateTime, toDateTime } = extractTimePeriod("20240101-20240131");
    expect(fromDateTime.getMonth()).toBe(0);
    expect(fromDateTime.getDate()).toBe(1);
    expect(toDateTime.getDate()).toBe(31);
  });

  test("parses year-month-day-hour tag", () => {
    const { fromDateTime, toDateTime } = extractTimePeriod("20240315~14");
    expect(fromDateTime.getHours()).toBe(14);
    expect(fromDateTime.getMinutes()).toBe(0);
    expect(toDateTime.getHours()).toBe(14);
    expect(toDateTime.getMinutes()).toBe(59);
  });

  test("parses year-month-day-hour-min tag", () => {
    const { fromDateTime, toDateTime } = extractTimePeriod("20240315~1430");
    expect(fromDateTime.getHours()).toBe(14);
    expect(fromDateTime.getMinutes()).toBe(30);
    expect(toDateTime.getMinutes()).toBe(30);
    expect(toDateTime.getSeconds()).toBe(59);
  });

  test("parses year-month-day-hour-min-sec tag", () => {
    const { fromDateTime, toDateTime } = extractTimePeriod("20240315~143025");
    expect(fromDateTime.getSeconds()).toBe(25);
    expect(toDateTime.getSeconds()).toBe(25);
  });

  test("returns nulls for non-date string", () => {
    const { fromDateTime, toDateTime } = extractTimePeriod("hello");
    expect(fromDateTime).toBeNull();
    expect(toDateTime).toBeNull();
  });

  test("returns nulls for empty string", () => {
    const { fromDateTime, toDateTime } = extractTimePeriod("");
    expect(fromDateTime).toBeNull();
    expect(toDateTime).toBeNull();
  });
});

describe("utils - getAllTags", () => {
  test("returns tags from meta.tags", () => {
    const entry = {
      name: "file.txt",
      path: "/dir/file.txt",
      meta: { tags: [{ title: "important" }, { title: "work" }] },
    };
    const tags = getAllTags(entry, " ");
    expect(tags).toHaveLength(2);
    expect(tags[0].title).toBe("important");
  });

  test("returns tags from filename when path has tag container", () => {
    const entry = {
      name: "file[vacation summer].jpg",
      path: "/photos/file[vacation summer].jpg",
    };
    const tags = getAllTags(entry, " ");
    expect(tags).toHaveLength(2);
    expect(tags.map((t) => t.title)).toContain("vacation");
    expect(tags.map((t) => t.title)).toContain("summer");
  });

  test("deduplicates tags from meta and filename", () => {
    const entry = {
      name: "file[vacation].jpg",
      path: "/photos/file[vacation].jpg",
      meta: { tags: [{ title: "vacation" }] },
    };
    const tags = getAllTags(entry, " ");
    expect(tags).toHaveLength(1);
    expect(tags[0].title).toBe("vacation");
  });

  test("merges unique tags from meta and filename", () => {
    const entry = {
      name: "file[summer].jpg",
      path: "/photos/file[summer].jpg",
      meta: { tags: [{ title: "vacation" }] },
    };
    const tags = getAllTags(entry, " ");
    expect(tags).toHaveLength(2);
    expect(tags.map((t) => t.title)).toContain("vacation");
    expect(tags.map((t) => t.title)).toContain("summer");
  });

  test("uses pre-parsed entry.tags when available", () => {
    const entry = {
      name: "file.jpg",
      path: "/photos/file.jpg",
      tags: [{ title: "cached" }],
    };
    const tags = getAllTags(entry, " ");
    expect(tags).toHaveLength(1);
    expect(tags[0].title).toBe("cached");
  });

  test("returns empty array when no tags", () => {
    const entry = { name: "file.txt", path: "/dir/file.txt" };
    const tags = getAllTags(entry, " ");
    expect(tags).toHaveLength(0);
  });
});

describe("utils - isPlusCode", () => {
  test("recognizes valid Plus Codes", () => {
    expect(isPlusCode("8FVC9G8F+6W")).toBe(true);
    expect(isPlusCode("8FVCG8QQ+QQ")).toBe(true);
  });

  test("rejects invalid Plus Codes", () => {
    expect(isPlusCode("")).toBe(false);
    expect(isPlusCode(null)).toBe(false);
    expect(isPlusCode("hello")).toBe(false);
    expect(isPlusCode("12345")).toBe(false);
  });
});

describe("utils - isMgrsString", () => {
  test("recognizes valid MGRS strings", () => {
    expect(isMgrsString("33UUP0500011700")).toBe(true);
    expect(isMgrsString("4QFJ12345678")).toBe(true);
  });

  test("rejects invalid MGRS strings", () => {
    expect(isMgrsString("")).toBe(false);
    expect(isMgrsString(null)).toBe(false);
    expect(isMgrsString("hello")).toBe(false);
  });
});

describe("utils - isGeoTag", () => {
  test("returns true for Plus Codes", () => {
    expect(isGeoTag("8FVC9G8F+6W")).toBe(true);
  });

  test("returns true for MGRS strings", () => {
    expect(isGeoTag("33UUP0500011700")).toBe(true);
  });

  test("returns false for non-geo strings", () => {
    expect(isGeoTag("vacation")).toBe(false);
    expect(isGeoTag("2024")).toBe(false);
  });
});

describe("utils - parseGeoLocation", () => {
  test("parses a Plus Code to lat/lng", () => {
    const result = parseGeoLocation("8FVC9G8F+6W");
    expect(result).toBeDefined();
    expect(typeof result.lat).toBe("number");
    expect(typeof result.lng).toBe("number");
    expect(result.lat).toBeGreaterThan(40);
    expect(result.lat).toBeLessThan(55);
  });

  test("returns undefined for null input", () => {
    expect(parseGeoLocation(null)).toBeUndefined();
    expect(parseGeoLocation("")).toBeUndefined();
  });

  test("returns undefined for non-geo string", () => {
    expect(parseGeoLocation("vacation")).toBeUndefined();
  });
});
