const {
  filterByTags,
  filterByFileType,
  filterByDatePeriod,
  filterIndex,
} = require("./filters");
const AppConfig = require("@tagspaces/tagspaces-common/AppConfig");

// --- Test data helpers ---

function makeEntry(overrides) {
  return {
    name: "file.txt",
    path: "/dir/file.txt",
    isFile: true,
    extension: "txt",
    size: 1024,
    lmdt: Date.now(),
    tags: [],
    ...overrides,
  };
}

function tagged(names) {
  return names.map((t) => ({ title: t.toLowerCase() }));
}

// --- filterByTags ---

describe("filterByTags", () => {
  const entries = [
    makeEntry({ name: "a.jpg", tags: tagged(["vacation", "summer"]) }),
    makeEntry({ name: "b.jpg", tags: tagged(["work", "meeting"]) }),
    makeEntry({ name: "c.jpg", tags: tagged(["vacation", "work"]) }),
    makeEntry({ name: "d.jpg", tags: [] }),
  ];

  test("returns all entries when no tag filters", () => {
    const result = filterByTags(entries, {});
    expect(result).toHaveLength(4);
  });

  test("filters by OR tags - at least one must match", () => {
    const result = filterByTags(entries, {
      tagsOR: [{ title: "vacation" }],
    });
    expect(result).toHaveLength(2);
    expect(result.map((e) => e.name)).toEqual(["a.jpg", "c.jpg"]);
  });

  test("filters by OR tags - multiple OR tags", () => {
    const result = filterByTags(entries, {
      tagsOR: [{ title: "summer" }, { title: "meeting" }],
    });
    expect(result).toHaveLength(2);
    expect(result.map((e) => e.name)).toEqual(["a.jpg", "b.jpg"]);
  });

  test("filters by AND tags - all must match", () => {
    const result = filterByTags(entries, {
      tagsAND: [{ title: "vacation" }, { title: "work" }],
    });
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("c.jpg");
  });

  test("filters by AND tag - single tag", () => {
    const result = filterByTags(entries, {
      tagsAND: [{ title: "work" }],
    });
    expect(result).toHaveLength(2);
    expect(result.map((e) => e.name)).toEqual(["b.jpg", "c.jpg"]);
  });

  test("filters by NOT tags - none must match", () => {
    const result = filterByTags(entries, {
      tagsNOT: [{ title: "vacation" }],
    });
    expect(result).toHaveLength(2);
    expect(result.map((e) => e.name)).toEqual(["b.jpg", "d.jpg"]);
  });

  test("combines AND and NOT", () => {
    const result = filterByTags(entries, {
      tagsAND: [{ title: "work" }],
      tagsNOT: [{ title: "vacation" }],
    });
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("b.jpg");
  });

  test("combines OR and NOT", () => {
    const result = filterByTags(entries, {
      tagsOR: [{ title: "vacation" }, { title: "work" }],
      tagsNOT: [{ title: "summer" }],
    });
    // OR matches a(vacation), b(work), c(vacation+work); NOT excludes a(summer)
    expect(result).toHaveLength(2);
    expect(result.map((e) => e.name).sort()).toEqual(["b.jpg", "c.jpg"]);
  });

  test("is case-insensitive for tag matching", () => {
    const result = filterByTags(entries, {
      tagsAND: [{ title: "Vacation" }],
    });
    expect(result).toHaveLength(2);
  });

  test("returns empty when AND tag not found", () => {
    const result = filterByTags(entries, {
      tagsAND: [{ title: "nonexistent" }],
    });
    expect(result).toHaveLength(0);
  });

  test("entries without tags are excluded by OR filter", () => {
    const result = filterByTags(entries, {
      tagsOR: [{ title: "vacation" }],
    });
    expect(result.find((e) => e.name === "d.jpg")).toBeUndefined();
  });

  test("entries without tags pass through NOT filter", () => {
    const result = filterByTags(entries, {
      tagsNOT: [{ title: "vacation" }],
    });
    expect(result.find((e) => e.name === "d.jpg")).toBeDefined();
  });
});

// --- filterByFileType ---

describe("filterByFileType", () => {
  const entries = [
    makeEntry({ name: "photo.jpg", extension: "jpg", isFile: true }),
    makeEntry({ name: "doc.pdf", extension: "pdf", isFile: true }),
    makeEntry({ name: "notes.md", extension: "md", isFile: true }),
    makeEntry({
      name: "mydir",
      extension: undefined,
      isFile: false,
      tags: tagged(["project"]),
    }),
    makeEntry({ name: "plain.txt", extension: "txt", isFile: true, tags: [] }),
  ];

  test("returns all entries when no fileTypes filter", () => {
    const result = filterByFileType(entries, {});
    expect(result).toHaveLength(5);
  });

  test("returns all entries for 'any' type", () => {
    const result = filterByFileType(entries, {
      fileTypes: AppConfig.SearchTypeGroups.any,
    });
    expect(result).toHaveLength(5);
  });

  test("filters by folders type", () => {
    const result = filterByFileType(entries, {
      fileTypes: AppConfig.SearchTypeGroups.folders,
    });
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("mydir");
  });

  test("filters by files type", () => {
    const result = filterByFileType(entries, {
      fileTypes: AppConfig.SearchTypeGroups.files,
    });
    expect(result).toHaveLength(4);
  });

  test("filters by untagged type", () => {
    const result = filterByFileType(entries, {
      fileTypes: AppConfig.SearchTypeGroups.untagged,
    });
    expect(result).toHaveLength(4);
  });

  test("filters by extension list", () => {
    const result = filterByFileType(entries, {
      fileTypes: ["jpg", "pdf"],
    });
    expect(result).toHaveLength(2);
    expect(result.map((e) => e.name).sort()).toEqual(["doc.pdf", "photo.jpg"]);
  });

  test("extension matching is case-insensitive", () => {
    const result = filterByFileType(entries, {
      fileTypes: ["JPG"],
    });
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("photo.jpg");
  });
});

// --- filterByDatePeriod ---

describe("filterByDatePeriod", () => {
  const now = Date.now();
  const msInDay = 1000 * 60 * 60 * 24;
  const entries = [
    makeEntry({ name: "today.txt", lmdt: now }),
    makeEntry({ name: "yesterday.txt", lmdt: now - msInDay + 1000 }),
    makeEntry({ name: "lastweek.txt", lmdt: now - msInDay * 5 }),
    makeEntry({ name: "lastmonth.txt", lmdt: now - msInDay * 20 }),
    makeEntry({ name: "oldfile.txt", lmdt: now - msInDay * 400 }),
  ];

  test("returns all entries when no period key", () => {
    const result = filterByDatePeriod(entries, null, (e) => e.lmdt);
    expect(result).toHaveLength(5);
  });

  test("filters by today", () => {
    const result = filterByDatePeriod(
      entries,
      AppConfig.SearchTimePeriods.today.key,
      (e) => e.lmdt,
    );
    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result.find((e) => e.name === "today.txt")).toBeDefined();
  });

  test("filters by past7Days", () => {
    const result = filterByDatePeriod(
      entries,
      AppConfig.SearchTimePeriods.past7Days.key,
      (e) => e.lmdt,
    );
    expect(result.find((e) => e.name === "lastweek.txt")).toBeDefined();
    expect(result.find((e) => e.name === "oldfile.txt")).toBeUndefined();
  });

  test("filters by moreThanYear", () => {
    const result = filterByDatePeriod(
      entries,
      AppConfig.SearchTimePeriods.moreThanYear.key,
      (e) => e.lmdt,
    );
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("oldfile.txt");
  });
});

// --- filterIndex ---

describe("filterIndex", () => {
  test("filters by file size - sizeTiny", () => {
    const entries = [
      makeEntry({ name: "small.txt", size: 500, isFile: true }),
      makeEntry({ name: "big.txt", size: 50000, isFile: true }),
    ];
    const result = filterIndex(entries, {
      fileSize: AppConfig.SearchSizes.tiny.key,
    });
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("small.txt");
  });

  test("filters by file size - sizeEmpty", () => {
    const entries = [
      makeEntry({ name: "empty.txt", size: 0, isFile: true }),
      makeEntry({ name: "notempty.txt", size: 100, isFile: true }),
    ];
    const result = filterIndex(entries, {
      fileSize: AppConfig.SearchSizes.empty.key,
    });
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("empty.txt");
  });

  test("filters by tag time period", () => {
    const from = new Date("2024-01-01").getTime();
    const to = new Date("2024-12-31").getTime();
    const entries = [
      makeEntry({
        name: "in-range.txt",
        fromTime: new Date("2024-03-01").getTime(),
        toTime: new Date("2024-03-31").getTime(),
      }),
      makeEntry({
        name: "out-range.txt",
        fromTime: new Date("2023-03-01").getTime(),
        toTime: new Date("2023-03-31").getTime(),
      }),
    ];
    const result = filterIndex(entries, {
      tagTimePeriodFrom: from,
      tagTimePeriodTo: to,
    });
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("in-range.txt");
  });

  test("filters by geo-location", () => {
    const entries = [
      makeEntry({ name: "here.txt", lat: 42.6977, lon: 23.3219 }),
      makeEntry({ name: "there.txt", lat: 48.8566, lon: 2.3522 }),
    ];
    const result = filterIndex(entries, {
      tagPlaceLat: 42.6977,
      tagPlaceLong: 23.3219,
    });
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("here.txt");
  });

  test("applies no filters when query is empty", () => {
    const entries = [makeEntry(), makeEntry({ name: "b.txt" })];
    const result = filterIndex(entries, {});
    expect(result).toHaveLength(2);
  });
});
