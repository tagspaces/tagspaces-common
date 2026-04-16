const { prepareIndex } = require("./prepare-index");

describe("prepareIndex", () => {
  const baseEntry = {
    name: "file.txt",
    path: "/dir/file.txt",
    isFile: true,
    extension: "txt",
    size: 100,
    lmdt: Date.now(),
  };

  test("returns enhanced entries with empty tags", () => {
    const index = [{ ...baseEntry }];
    const result = prepareIndex(index, " ", false);
    expect(result).toHaveLength(1);
    expect(result[0].tags).toEqual([]);
    expect(result[0].tagsDescription).toBe("");
  });

  test("lowercases tag titles and preserves originTitle", () => {
    const index = [
      {
        ...baseEntry,
        meta: { tags: [{ title: "Important" }] },
      },
    ];
    const result = prepareIndex(index, " ", false);
    expect(result[0].tags[0].title).toBe("important");
    expect(result[0].tags[0].originTitle).toBe("Important");
  });

  test("does not set originTitle if already lowercase", () => {
    const index = [
      {
        ...baseEntry,
        meta: { tags: [{ title: "work" }] },
      },
    ];
    const result = prepareIndex(index, " ", false);
    expect(result[0].tags[0].title).toBe("work");
    expect(result[0].tags[0].originTitle).toBeUndefined();
  });

  test("extracts time period from date tags", () => {
    const index = [
      {
        ...baseEntry,
        meta: { tags: [{ title: "202401" }] },
      },
    ];
    const result = prepareIndex(index, " ", false);
    expect(result[0].fromTime).toBeDefined();
    expect(result[0].toTime).toBeDefined();
    expect(result[0].fromTime).toBeLessThan(result[0].toTime);
  });

  test("builds tagsDescription from tag descriptions", () => {
    const index = [
      {
        ...baseEntry,
        meta: {
          tags: [
            { title: "todo", description: "needs review" },
            { title: "bug", description: "critical issue" },
          ],
        },
      },
    ];
    const result = prepareIndex(index, " ", false);
    expect(result[0].tagsDescription).toContain("needs review");
    expect(result[0].tagsDescription).toContain("critical issue");
  });

  test("filters hidden entries when showUnixHiddenEntries is false", () => {
    const index = [
      { ...baseEntry, name: ".hidden", path: "/dir/.hidden" },
      { ...baseEntry, name: "visible.txt", path: "/dir/visible.txt" },
    ];
    const result = prepareIndex(index, " ", false);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("visible.txt");
  });

  test("includes hidden entries when showUnixHiddenEntries is true", () => {
    const index = [
      { ...baseEntry, name: ".hidden", path: "/dir/.hidden" },
      { ...baseEntry, name: "visible.txt", path: "/dir/visible.txt" },
    ];
    const result = prepareIndex(index, " ", true);
    expect(result).toHaveLength(2);
  });

  test("extracts geo-location from Plus Code tags", () => {
    const index = [
      {
        ...baseEntry,
        meta: { tags: [{ title: "8FVC9G8F+6W" }] },
      },
    ];
    const result = prepareIndex(index, " ", false);
    expect(result[0].lat).toBeDefined();
    expect(result[0].lon).toBeDefined();
    expect(typeof result[0].lat).toBe("number");
  });

  test("handles entries with tags from filename", () => {
    const index = [
      {
        ...baseEntry,
        name: "photo[vacation summer].jpg",
        path: "/photos/photo[vacation summer].jpg",
      },
    ];
    const result = prepareIndex(index, " ", false);
    expect(result[0].tags).toHaveLength(2);
    expect(result[0].tags.map((t) => t.title)).toContain("vacation");
    expect(result[0].tags.map((t) => t.title)).toContain("summer");
  });

  test("handles empty index", () => {
    const result = prepareIndex([], " ", false);
    expect(result).toEqual([]);
  });
});
