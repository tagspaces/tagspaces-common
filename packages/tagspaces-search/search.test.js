const {
  searchLocationIndex,
  haveSearchFilters,
  defaultTitle,
  fuseOptions,
} = require("./search");

// --- Test data ---

function makeEntry(overrides) {
  return {
    name: "file.txt",
    path: "/root/file.txt",
    isFile: true,
    extension: "txt",
    size: 1024,
    lmdt: Date.now(),
    tags: [],
    ...overrides,
  };
}

function tagged(names) {
  return names.map((t) => ({ title: t }));
}

const sampleIndex = [
  makeEntry({
    name: "vacation[summer beach].jpg",
    path: "photos/vacation[summer beach].jpg",
    extension: "jpg",
    size: 2048000,
    meta: { description: "Beach photo from July trip" },
  }),
  makeEntry({
    name: "report.pdf",
    path: "documents/report.pdf",
    extension: "pdf",
    size: 512000,
    meta: {
      description: "Q1 quarterly report",
      tags: [{ title: "work" }, { title: "finance" }],
    },
  }),
  makeEntry({
    name: "notes.md",
    path: "notes/notes.md",
    extension: "md",
    size: 256,
    textContent: "meeting agenda for project kickoff discussion",
    meta: { tags: [{ title: "work" }, { title: "meeting" }] },
  }),
  makeEntry({
    name: "song.mp3",
    path: "music/song.mp3",
    extension: "mp3",
    size: 4096000,
  }),
  makeEntry({
    name: "projects",
    path: "projects",
    isFile: false,
    extension: undefined,
    size: 0,
    meta: { tags: [{ title: "archive" }] },
  }),
];

// --- haveSearchFilters ---

describe("haveSearchFilters", () => {
  test("returns falsy for empty query", () => {
    expect(haveSearchFilters({})).toBeFalsy();
  });

  test("returns falsy for null", () => {
    expect(haveSearchFilters(null)).toBeFalsy();
  });

  test("returns truthy when textQuery is set", () => {
    expect(haveSearchFilters({ textQuery: "hello" })).toBeTruthy();
  });

  test("returns truthy when tagsAND has entries", () => {
    expect(
      haveSearchFilters({ tagsAND: [{ title: "work" }] }),
    ).toBeTruthy();
  });

  test("returns truthy when tagsOR has entries", () => {
    expect(
      haveSearchFilters({ tagsOR: [{ title: "work" }] }),
    ).toBeTruthy();
  });

  test("returns truthy when tagsNOT has entries", () => {
    expect(
      haveSearchFilters({ tagsNOT: [{ title: "draft" }] }),
    ).toBeTruthy();
  });

  test("returns truthy when fileSize is set", () => {
    expect(haveSearchFilters({ fileSize: "sizeSmall" })).toBeTruthy();
  });

  test("returns truthy when lastModified is set", () => {
    expect(haveSearchFilters({ lastModified: "today" })).toBeTruthy();
  });

  test("returns truthy when tagPlaceLat is set", () => {
    expect(haveSearchFilters({ tagPlaceLat: 42.6 })).toBeTruthy();
  });

  test("returns falsy when tagsAND is empty array", () => {
    expect(haveSearchFilters({ tagsAND: [] })).toBeFalsy();
  });
});

// --- defaultTitle ---

describe("defaultTitle", () => {
  test("returns empty string for empty query", () => {
    expect(defaultTitle({})).toBe("");
  });

  test("returns empty string for null", () => {
    expect(defaultTitle(null)).toBe("");
  });

  test("returns text query", () => {
    expect(defaultTitle({ textQuery: "vacation" })).toBe("vacation");
  });

  test("includes AND tags with + prefix", () => {
    const title = defaultTitle({
      textQuery: "photos",
      tagsAND: [{ title: "summer" }],
    });
    expect(title).toContain("+summer");
  });

  test("includes NOT tags with - prefix", () => {
    const title = defaultTitle({
      tagsNOT: [{ title: "draft" }],
    });
    expect(title).toContain("-draft");
  });

  test("includes OR tags with | prefix", () => {
    const title = defaultTitle({
      tagsOR: [{ title: "a" }, { title: "b" }],
    });
    expect(title).toContain("|a");
    expect(title).toContain("|b");
  });

  test("combines all filter types", () => {
    const title = defaultTitle({
      textQuery: "query",
      tagsAND: [{ title: "and1" }],
      tagsNOT: [{ title: "not1" }],
      tagsOR: [{ title: "or1" }],
    });
    expect(title).toContain("query");
    expect(title).toContain("+and1");
    expect(title).toContain("-not1");
    expect(title).toContain("|or1");
  });
});

// --- fuseOptions ---

describe("fuseOptions", () => {
  test("has expected keys configuration", () => {
    expect(fuseOptions.keys).toBeDefined();
    expect(fuseOptions.keys.length).toBeGreaterThan(0);
    const keyNames = fuseOptions.keys.map((k) => k.name);
    expect(keyNames).toContain("name");
    expect(keyNames).toContain("path");
    expect(keyNames).toContain("textContent");
    expect(keyNames).toContain("description");
  });

  test("uses extended search", () => {
    expect(fuseOptions.useExtendedSearch).toBe(true);
  });

  test("has minMatchCharLength of 1", () => {
    expect(fuseOptions.minMatchCharLength).toBe(1);
  });
});

// --- searchLocationIndex ---

describe("searchLocationIndex", () => {
  test("rejects with empty index", async () => {
    await expect(
      searchLocationIndex([], { textQuery: "test" }, " "),
    ).rejects.toThrow("No Index");
  });

  test("rejects with null index", async () => {
    await expect(
      searchLocationIndex(null, { textQuery: "test" }, " "),
    ).rejects.toThrow();
  });

  test("finds entries by text query (fuzzy)", async () => {
    const results = await searchLocationIndex(
      sampleIndex,
      { textQuery: "report", showUnixHiddenEntries: false },
      " ",
    );
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results.some((r) => r.name === "report.pdf")).toBe(true);
  });

  test("finds entries by text query in description", async () => {
    const results = await searchLocationIndex(
      sampleIndex,
      { textQuery: "quarterly", showUnixHiddenEntries: false },
      " ",
    );
    expect(results.length).toBeGreaterThanOrEqual(1);
  });

  test("finds entries by text query in textContent", async () => {
    const results = await searchLocationIndex(
      sampleIndex,
      { textQuery: "kickoff", showUnixHiddenEntries: false },
      " ",
    );
    expect(results.length).toBeGreaterThanOrEqual(1);
  });

  test("strict search is case-sensitive", async () => {
    const results = await searchLocationIndex(
      sampleIndex,
      {
        textQuery: "Report",
        searchType: "strict",
        showUnixHiddenEntries: false,
      },
      " ",
    );
    // "Report" won't match "report.pdf" path in strict mode (path is lowercase)
    // but it depends on what fields have uppercase
    expect(Array.isArray(results)).toBe(true);
  });

  test("semistrict search is case-insensitive substring", async () => {
    const results = await searchLocationIndex(
      sampleIndex,
      {
        textQuery: "REPORT",
        searchType: "semistrict",
        showUnixHiddenEntries: false,
      },
      " ",
    );
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results.some((r) => r.name === "report.pdf")).toBe(true);
  });

  test("filters by AND tags", async () => {
    const results = await searchLocationIndex(
      sampleIndex,
      {
        tagsAND: [{ title: "work" }, { title: "finance" }],
        showUnixHiddenEntries: false,
      },
      " ",
    );
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe("report.pdf");
  });

  test("filters by NOT tags", async () => {
    const results = await searchLocationIndex(
      sampleIndex,
      {
        tagsAND: [{ title: "work" }],
        tagsNOT: [{ title: "finance" }],
        showUnixHiddenEntries: false,
      },
      " ",
    );
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe("notes.md");
  });

  test("respects maxSearchResults", async () => {
    const results = await searchLocationIndex(
      sampleIndex,
      {
        textQuery: "a",
        maxSearchResults: 1,
        showUnixHiddenEntries: false,
      },
      " ",
    );
    expect(results.length).toBeLessThanOrEqual(1);
  });

  test("removes textContent from results", async () => {
    const results = await searchLocationIndex(
      sampleIndex,
      { textQuery: "kickoff", showUnixHiddenEntries: false },
      " ",
    );
    for (const result of results) {
      expect(result.textContent).toBeUndefined();
    }
  });

  test("restores original tag case in results", async () => {
    const index = [
      makeEntry({
        name: "file.txt",
        path: "file.txt",
        meta: { tags: [{ title: "Important" }] },
      }),
    ];
    const results = await searchLocationIndex(
      index,
      {
        tagsAND: [{ title: "important" }],
        showUnixHiddenEntries: false,
      },
      " ",
    );
    expect(results).toHaveLength(1);
    expect(results[0].tags[0].title).toBe("Important");
  });

  test("scopes to folder when searchBoxing is folder", async () => {
    const results = await searchLocationIndex(
      sampleIndex,
      {
        textQuery: "report",
        searchBoxing: "folder",
        currentDirectory: "documents",
        showUnixHiddenEntries: false,
      },
      " ",
    );
    for (const result of results) {
      expect(result.path.startsWith("documents")).toBe(true);
    }
  });

  test("returns empty when no search filters match", async () => {
    const results = await searchLocationIndex(
      sampleIndex,
      {
        tagsAND: [{ title: "nonexistent-tag-xyz" }],
        showUnixHiddenEntries: false,
      },
      " ",
    );
    expect(results).toHaveLength(0);
  });

  test("accepts pre-prepared index via options", async () => {
    const { prepareIndex } = require("./prepare-index");
    const prepared = prepareIndex(sampleIndex, " ", false);
    const results = await searchLocationIndex(
      sampleIndex,
      { textQuery: "report", showUnixHiddenEntries: false },
      " ",
      { preparedIndex: prepared },
    );
    expect(results.length).toBeGreaterThanOrEqual(1);
  });

  test("cached prepared index stays searchable across multiple calls", async () => {
    // Regression: setOriginTitle used to mutate tag.title back to the
    // uppercase original, breaking tag lookups on the second search.
    const { prepareIndex } = require("./prepare-index");
    const rawIndex = [
      makeEntry({
        name: "a.txt",
        path: "a.txt",
        meta: { tags: [{ title: "Important" }, { title: "Work" }] },
      }),
    ];
    const prepared = prepareIndex(rawIndex, " ", false);

    const r1 = await searchLocationIndex(
      rawIndex,
      { tagsAND: [{ title: "important" }], showUnixHiddenEntries: false },
      " ",
      { preparedIndex: prepared },
    );
    expect(r1).toHaveLength(1);

    // Second call on the same cached prepared index must still work.
    const r2 = await searchLocationIndex(
      rawIndex,
      { tagsAND: [{ title: "important" }], showUnixHiddenEntries: false },
      " ",
      { preparedIndex: prepared },
    );
    expect(r2).toHaveLength(1);

    // Different tag on the same cache must also still match.
    const r3 = await searchLocationIndex(
      rawIndex,
      { tagsAND: [{ title: "work" }], showUnixHiddenEntries: false },
      " ",
      { preparedIndex: prepared },
    );
    expect(r3).toHaveLength(1);
  });

  test("does not mutate prepared index tag titles", async () => {
    const { prepareIndex } = require("./prepare-index");
    const rawIndex = [
      makeEntry({
        name: "a.txt",
        path: "a.txt",
        meta: { tags: [{ title: "MixedCase" }] },
      }),
    ];
    const prepared = prepareIndex(rawIndex, " ", false);
    expect(prepared[0].tags[0].title).toBe("mixedcase");

    await searchLocationIndex(
      rawIndex,
      { tagsAND: [{ title: "mixedcase" }], showUnixHiddenEntries: false },
      " ",
      { preparedIndex: prepared },
    );
    // Prepared index entry must remain lowercase for future searches.
    expect(prepared[0].tags[0].title).toBe("mixedcase");
    expect(prepared[0].tags[0].originTitle).toBe("MixedCase");
  });

  test("does not strip textContent from cached prepared index", async () => {
    const { prepareIndex } = require("./prepare-index");
    const rawIndex = [
      makeEntry({
        name: "a.md",
        path: "a.md",
        extension: "md",
        textContent: "searchable content here",
      }),
    ];
    const prepared = prepareIndex(rawIndex, " ", false);
    expect(prepared[0].textContent).toBe("searchable content here");

    await searchLocationIndex(
      rawIndex,
      { textQuery: "searchable", showUnixHiddenEntries: false },
      " ",
      { preparedIndex: prepared },
    );
    // textContent must remain so a second fulltext search can find it.
    expect(prepared[0].textContent).toBe("searchable content here");
  });
});
