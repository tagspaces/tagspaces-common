const pathLib = require("path");
const misc = require("./misc");
const fs = require("fs");

describe("Common misc unit tests", () => {
  test("misc.prepareTagGroupForExport", () => {
    const tagGroup = {
      title: "tagGroup",
      locationId: "locationId",
      children: [
        {
          title: "tag1",
          type: "plain",
        },
        {
          title: "tag2",
          type: "plain",
        },
      ],
    };

    const expected = {
      title: "tagGroup",
      children: [
        {
          title: "tag1",
          type: "plain",
        },
        {
          title: "tag2",
          type: "plain",
        },
      ],
    };

    const tagGroupForExport = misc.prepareTagGroupForExport(tagGroup);
    expect(tagGroupForExport).toEqual(expected);
  });

  test("misc.prepareTagForExport", () => {
    const tag = {
      id: "tagId",
      title: "tag",
      type: "plain",
    };

    const expected = {
      title: "tag",
      type: "plain",
    };

    const tagForExport = misc.prepareTagForExport(tag);
    expect(tagForExport).toEqual(expected);
  });

  test("misc.escapeRegExp", () => {
    const input = "abc\\def";
    const expected = "abc\\\\def";
    const output = misc.escapeRegExp(input);
    expect(output).toEqual(expected);
  });
  test("misc.parseTextQuery", () => {
    const textQuery = "+tag1 +tag2";
    const output = misc.parseTextQuery(textQuery, "+");
    expect(output).toEqual([{ title: "tag1" }, { title: "tag2" }]);
  });
  test("misc.removeAllTagsFromSearchQuery", () => {
    const textQuery = "search +tag1 -tag2 |tag3";
    const output = misc.removeAllTagsFromSearchQuery(textQuery);
    expect(output).toEqual("search");
  });
  test("misc.mergeWithExtractedTags", () => {
    const tags = [{ title: "tag1" }, { title: "tag2" }];
    const textQuery = "+tag3 +tag4";
    const output = misc.mergeWithExtractedTags(textQuery, tags, "+");
    expect(output).toEqual([
      { title: "tag1" },
      { title: "tag2" },
      { title: "tag3" },
      { title: "tag4" },
    ]);
  });

  /*test("misc.getUniqueTags", () => {
    const tags = [{ title: "tag1" }, { title: "tag2" }];
    const tags2 = [{ title: "tag1" }, { title: "tag3" }];
    const output = misc.getUniqueTags(tags,tags2);
    expect(output).toEqual([{ title: "tag1" }, { title: "tag2" }, { title: "tag3" }]);
  });*/

  test("misc.immutablySwapItems", () => {
    const items = [{ title: "tag1" }, { title: "tag2" }, { title: "tag3" }];
    const output = misc.immutablySwapItems(items, 0, 2);
    expect(output).toEqual([
      { title: "tag3" },
      { title: "tag2" },
      { title: "tag1" },
    ]);
  });

  test("misc.arrayBufferToBuffer", () => {
    const arrayBuffer = new ArrayBuffer(10);
    const buffer = misc.arrayBufferToBuffer(arrayBuffer);
    expect(buffer).toBeInstanceOf(Buffer);
  });
  test("misc.streamToBuffer", async () => {
    const stream = fs.createReadStream(
      pathLib.join(__dirname, "img.jpg")
    );
    const buffer = await misc.streamToBuffer(stream);
    expect(buffer).toBeInstanceOf(Buffer);
  });
  test("misc.formatFileSize", () => {
    const output = misc.formatFileSize(10);
    expect(output).toEqual("10 B");
  });
  test("misc.formatFileSize2", () => {
    const output = misc.formatFileSize2(1025);
    expect(output).toEqual("1.0 KiB");
  });
  /*test("misc.formatDateTime", () => {
    const date = new Date();
    const output = misc.formatDateTime(date, false);
    const dateTime = new SimpleDateFormat("yyyy-MM-dd hh:mm:ss", Locale.getDefaut()).format(new Date());
    expect(output).toEqual(
        date.toString().replace(/T/, " - ").replace(/\..+/, "")
    );
  });*/
  test("misc.convertStringToDate", () => {
    const output = misc.convertStringToDate("20200101");
    expect(output.toISOString()).toEqual("2020-01-01T00:00:00.000Z");
  });
  test("misc.sortByCriteria", () => {
    const items = [
      {
        name: "b",
        isFile: true,
        size: 30,
        lmdt: new Date("2024-06-30T00:00:00Z").getTime(),
      },
      {
        name: "a",
        isFile: true,
        size: 20,
        lmdt: new Date("2024-06-20T00:00:00Z").getTime(),
      },
      {
        name: "c",
        isFile: true,
        size: 10,
        lmdt: new Date("2024-06-10T00:00:00Z").getTime(),
      },
      { name: "folder", isFile: false },
      {
        name: "0",
        isFile: true,
        size: 11,
        lmdt: new Date("2024-06-11T00:00:00Z").getTime(),
      },
      {
        name: "2",
        isFile: true,
        size: 12,
        lmdt: new Date("2024-06-12T00:00:00Z").getTime(),
      },
      {
        name: "1",
        isFile: true,
        size: 13,
        lmdt: new Date("2024-06-13T00:00:00Z").getTime(),
      },
      {
        name: "02",
        isFile: true,
        size: 14,
        lmdt: new Date("2024-06-14T00:00:00Z").getTime(),
      },
      {
        name: "01",
        isFile: true,
        size: 15,
        lmdt: new Date("2024-06-15T00:00:00Z").getTime(),
      },
      {
        name: "10",
        isFile: true,
        size: 16,
        lmdt: new Date("2024-06-16T00:00:00Z").getTime(),
      },
    ];
    const reversedItems = [...items].reverse();
    //asc
    let output = misc.sortByCriteria(items, "byName", true);
    expect(output).toEqual([
      items.find((i) => i.name === "folder"),
      items.find((i) => i.name === "a"),
      items.find((i) => i.name === "b"),
      items.find((i) => i.name === "c"),
      items.find((i) => i.name === "0"),
      items.find((i) => i.name === "1"),
      items.find((i) => i.name === "01"),
      items.find((i) => i.name === "2"),
      items.find((i) => i.name === "02"),
      items.find((i) => i.name === "10"),
    ]);
    //asc reverse
    output = misc.sortByCriteria(reversedItems, "byName", true);
    expect(output).toEqual([
      items.find((i) => i.name === "folder"),
      items.find((i) => i.name === "0"),
      items.find((i) => i.name === "01"),
      items.find((i) => i.name === "1"),
      items.find((i) => i.name === "02"),
      items.find((i) => i.name === "2"),
      items.find((i) => i.name === "10"),
      items.find((i) => i.name === "a"),
      items.find((i) => i.name === "b"),
      items.find((i) => i.name === "c"),
    ]);
    //desc
    output = misc.sortByCriteria(items, "byName", false);
    expect(output).toEqual([
      items.find((i) => i.name === "10"),
      items.find((i) => i.name === "02"),
      items.find((i) => i.name === "2"),
      items.find((i) => i.name === "01"),
      items.find((i) => i.name === "1"),
      items.find((i) => i.name === "0"),
      items.find((i) => i.name === "c"),
      items.find((i) => i.name === "b"),
      items.find((i) => i.name === "a"),
      items.find((i) => i.name === "folder"),
    ]);

    //desc reversed
    output = misc.sortByCriteria(reversedItems, "byName", false);
    expect(output).toEqual([
      items.find((i) => i.name === "c"),
      items.find((i) => i.name === "b"),
      items.find((i) => i.name === "a"),
      items.find((i) => i.name === "10"),
      items.find((i) => i.name === "2"),
      items.find((i) => i.name === "02"),
      items.find((i) => i.name === "1"),
      items.find((i) => i.name === "01"),
      items.find((i) => i.name === "0"),
      items.find((i) => i.name === "folder"),
    ]);

    output = misc.sortByCriteria(items, "byFileSize", true);
    expect(output).toEqual([
      items.find((i) => i.name === "folder"),
      items.find((i) => i.name === "c"),
      items.find((i) => i.name === "0"),
      items.find((i) => i.name === "2"),
      items.find((i) => i.name === "1"),
      items.find((i) => i.name === "02"),
      items.find((i) => i.name === "01"),
      items.find((i) => i.name === "10"),
      items.find((i) => i.name === "a"),
      items.find((i) => i.name === "b"),
    ]);

    output = misc.sortByCriteria(items, "byDateModified", true);
    expect(output).toEqual([
      items.find((i) => i.name === "folder"),
      items.find((i) => i.name === "c"),
      items.find((i) => i.name === "0"),
      items.find((i) => i.name === "2"),
      items.find((i) => i.name === "1"),
      items.find((i) => i.name === "02"),
      items.find((i) => i.name === "01"),
      items.find((i) => i.name === "10"),
      items.find((i) => i.name === "a"),
      items.find((i) => i.name === "b"),
    ]);
  });

  describe("extractLinks function", () => {
    test("should extract links from HTML href attributes", () => {
      const html = '<a href="https://example.com/">link</a>';
      const links = misc.extractLinks(html);
      expect(links).toHaveLength(1);
      expect(links[0].href).toBe("https://example.com/");
      expect(links[0].type).toBe("url");
    });

    test("should extract multiple links from plain text", () => {
      const text = "Visit https://example.com/ or https://test.org/ for more info";
      const links = misc.extractLinks(text);
      expect(links.length).toBeGreaterThanOrEqual(2);
      expect(links.some((link) => link.href.includes("example.com"))).toBe(
        true
      );
      expect(links.some((link) => link.href.includes("test.org"))).toBe(true);
    });

    test("should extract links with angle brackets", () => {
      const text = "Visit <https://example.com/> for more";
      const links = misc.extractLinks(text);
      expect(links.some((link) => link.href.includes("example.com"))).toBe(
        true
      );
    });

    test("should extract data-sourceurl from HTML", () => {
      const html = 'data-sourceurl="https://example.com/"';
      const links = misc.extractLinks(html);
      expect(links.some((link) => link.href.includes("example.com"))).toBe(
        true
      );
    });

    test("should extract tslinks", () => {
      const text = "ts://?tslid=test-id&tsepath=file.pdf&tseid=entry-id";
      const links = misc.extractLinks(text);
      expect(links.some((link) => link.type === "tslink")).toBe(true);
    });

    test("should skip duplicate tslinks", () => {
      const text = "ts://?tslid=test-id and ts://?tslid=test-id again";
      const links = misc.extractLinks(text);
      const tslinks = links.filter((l) => l.type === "tslink");
      expect(tslinks.length).toBe(1);
    });

    test("should handle empty text", () => {
      const links = misc.extractLinks("");
      expect(links).toEqual([]);
    });

    test("should handle text with no links", () => {
      const text = "Just some plain text with no links";
      const links = misc.extractLinks(text);
      expect(links).toEqual([]);
    });

    test("should support both http and https protocols", () => {
      const text = "http://example.com/ and https://example.com/";
      const links = misc.extractLinks(text);
      expect(links.some((l) => l.href.includes("http://example.com"))).toBe(true);
      expect(links.some((l) => l.href.includes("https://example.com"))).toBe(true);
    });

    // --- Relative link tests ---

    test("should extract relative href links from HTML", () => {
      const html = '<a href="./docs/readme.md">Docs</a>';
      const links = misc.extractLinks(html);
      expect(links).toHaveLength(1);
      expect(links[0].href).toBe("./docs/readme.md");
      expect(links[0].type).toBe("relative");
    });

    test("should extract parent-relative href links", () => {
      const html = '<a href="../folder/file.pdf">File</a>';
      const links = misc.extractLinks(html);
      expect(links.some((l) => l.href === "../folder/file.pdf" && l.type === "relative")).toBe(true);
    });

    test("should extract bare relative file paths from href", () => {
      const html = '<a href="subfolder/document.txt">Doc</a>';
      const links = misc.extractLinks(html);
      expect(links.some((l) => l.href === "subfolder/document.txt" && l.type === "relative")).toBe(true);
    });

    test("should extract relative links from markdown syntax", () => {
      const md = "See [the readme](./README.md) for details";
      const links = misc.extractLinks(md);
      expect(links.some((l) => l.href === "./README.md" && l.type === "relative")).toBe(true);
    });

    test("should extract parent-relative markdown links", () => {
      const md = "Check [report](../reports/q4.pdf)";
      const links = misc.extractLinks(md);
      expect(links.some((l) => l.href === "../reports/q4.pdf" && l.type === "relative")).toBe(true);
    });

    test("should extract multiple relative links", () => {
      const html = '<a href="./a.txt">A</a> <a href="./b.txt">B</a>';
      const links = misc.extractLinks(html);
      const relative = links.filter((l) => l.type === "relative");
      expect(relative).toHaveLength(2);
    });

    test("should not duplicate relative links", () => {
      const html = '<a href="./same.txt">A</a> <a href="./same.txt">B</a>';
      const links = misc.extractLinks(html);
      const relative = links.filter((l) => l.href === "./same.txt");
      expect(relative).toHaveLength(1);
    });

    test("should mix absolute and relative links", () => {
      const html = '<a href="https://example.com/">Ext</a> <a href="./local.md">Local</a>';
      const links = misc.extractLinks(html);
      expect(links.some((l) => l.type === "url")).toBe(true);
      expect(links.some((l) => l.type === "relative")).toBe(true);
    });

    test("should skip javascript: hrefs", () => {
      const html = '<a href="javascript:void(0)">Click</a>';
      const links = misc.extractLinks(html);
      expect(links).toHaveLength(0);
    });

    test("should skip mailto: hrefs", () => {
      const html = '<a href="mailto:test@example.com">Mail</a>';
      const links = misc.extractLinks(html);
      expect(links).toHaveLength(0);
    });

    test("should skip anchor-only hrefs", () => {
      const html = '<a href="#section">Jump</a>';
      const links = misc.extractLinks(html);
      expect(links).toHaveLength(0);
    });

    test("should skip file:// protocol hrefs", () => {
      const html = '<a href="file:///path/to/file.txt">File</a>';
      const links = misc.extractLinks(html);
      expect(links).toHaveLength(0);
    });

    test("should skip data: URIs in hrefs", () => {
      const html = '<a href="data:text/plain;base64,SGVsbG8=">Data</a>';
      const links = misc.extractLinks(html);
      expect(links).toHaveLength(0);
    });

    test("should handle relative folder links", () => {
      const html = '<a href="./my-folder/">Folder</a>';
      const links = misc.extractLinks(html);
      expect(links.some((l) => l.href === "./my-folder/" && l.type === "relative")).toBe(true);
    });

    test("should extract markdown links to folders", () => {
      const md = "Open [project folder](../projects/my-project/)";
      const links = misc.extractLinks(md);
      expect(links.some((l) => l.href === "../projects/my-project/" && l.type === "relative")).toBe(true);
    });

    test("should handle markdown image links as relative", () => {
      const md = "![screenshot](./images/screen.png)";
      const links = misc.extractLinks(md);
      expect(links.some((l) => l.href === "./images/screen.png" && l.type === "relative")).toBe(true);
    });

    test("should not treat absolute URLs in markdown as relative", () => {
      const md = "[Example](https://example.com/)";
      const links = misc.extractLinks(md);
      expect(links.every((l) => l.type !== "relative")).toBe(true);
      expect(links.some((l) => l.type === "url")).toBe(true);
    });
  });

  describe("extractTxtContentAndLinks function", () => {
    test("should extract text content from text files", () => {
      const entry = {
        name: "test.txt",
        path: "/path/to/test.txt",
        isFile: true,
      };
      const content = "This is test content";

      misc.extractTxtContentAndLinks(entry, content, false);

      expect(entry.textContent).toBeDefined();
    });

    test("should extract links when requested", () => {
      const entry = {
        name: "test.txt",
        path: "/path/to/test.txt",
        isFile: true,
      };
      const content = "Visit https://example.com for more information";

      misc.extractTxtContentAndLinks(entry, content, true);

      expect(entry.links).toBeDefined();
    });

    test("should handle markdown files", () => {
      const entry = {
        name: "test.md",
        path: "/path/to/test.md",
        isFile: true,
      };
      const content = "# Title\nSome markdown content";

      misc.extractTxtContentAndLinks(entry, content, false);

      expect(entry.textContent).toBeDefined();
    });

    test("should handle HTML files with body tag", () => {
      const entry = {
        name: "test.html",
        path: "/path/to/test.html",
        isFile: true,
      };
      const content = "<html><body>Test content</body></html>";

      misc.extractTxtContentAndLinks(entry, content, false);

      expect(entry.textContent).toBeDefined();
    });

    test("should skip unsupported file types", () => {
      const entry = {
        name: "test.pdf",
        path: "/path/to/test.pdf",
        isFile: true,
      };
      const content = "Some content";

      misc.extractTxtContentAndLinks(entry, content, false);

      expect(entry.textContent).toBeUndefined();
    });

    test("should handle directory entries with description", () => {
      const entry = {
        name: "folder",
        path: "/path/to/folder",
        isFile: false,
        meta: {
          description: "Visit https://example.com",
        },
      };

      misc.extractTxtContentAndLinks(entry, "", true);

      // Should call setEntryLinks for directory with description
      expect(!entry.textContent).toBe(true);
    });

    test("should handle empty content", () => {
      const entry = {
        name: "test.txt",
        path: "/path/to/test.txt",
        isFile: true,
      };

      misc.extractTxtContentAndLinks(entry, null, false);

      expect(entry.textContent).toBeUndefined();
    });

    test("should remove data URLs from content", () => {
      const entry = {
        name: "test.html",
        path: "/path/to/test.html",
        isFile: true,
      };
      const content = `<body>
        <img src="data:image/png;base64,ABC123">
        Real content here
      </body>`;

      misc.extractTxtContentAndLinks(entry, content, false);

      expect(entry.textContent).toBeDefined();
      expect(entry.textContent).not.toContain("data:");
    });

    // --- Markdown variants ---

    test("should handle .marp files as markdown", () => {
      const entry = {
        name: "deck.marp",
        path: "/p/deck.marp",
        isFile: true,
      };
      const content =
        "---\nmarp: true\n---\n\n# Slide Title\n\nImportant **content** here.";
      misc.extractTxtContentAndLinks(entry, content, false);
      expect(entry.textContent).toBeDefined();
      expect(entry.textContent).toContain("slide");
      expect(entry.textContent).toContain("important");
    });

    // --- HTML variants ---

    test("should handle .htm files via body match", () => {
      const entry = { name: "a.htm", path: "/p/a.htm", isFile: true };
      const content =
        "<html><head><title>IgnoredTitle</title></head><body>Searchable body text</body></html>";
      misc.extractTxtContentAndLinks(entry, content, false);
      expect(entry.textContent).toContain("searchable");
      expect(entry.textContent).not.toContain("ignoredtitle");
    });

    test("should handle .xhtml files via body match", () => {
      const entry = { name: "a.xhtml", path: "/p/a.xhtml", isFile: true };
      const content =
        '<?xml version="1.0"?><html xmlns="http://www.w3.org/1999/xhtml">' +
        "<head><title>IgnoredTitle</title></head>" +
        "<body><h1>XHTML Heading</h1><p>xhtml body text</p></body></html>";
      misc.extractTxtContentAndLinks(entry, content, false);
      expect(entry.textContent).toContain("xhtml");
      expect(entry.textContent).not.toContain("ignoredtitle");
    });

    test("should handle .shtml files via body match", () => {
      const entry = { name: "a.shtml", path: "/p/a.shtml", isFile: true };
      const content =
        "<html><head><title>Header</title></head>" +
        "<body><!--#include file=\"inc.html\"--><p>shtml content body</p></body></html>";
      misc.extractTxtContentAndLinks(entry, content, false);
      expect(entry.textContent).toContain("shtml");
    });

    test("should handle .eml files as plain text (no body match)", () => {
      const entry = { name: "msg.eml", path: "/p/msg.eml", isFile: true };
      const content =
        "From: alice@example.com\nTo: bob@tagspaces.org\n" +
        "Subject: Meeting notes\n\nHi Bob,\nHere are the notes.\nThanks,\nAlice";
      misc.extractTxtContentAndLinks(entry, content, false);
      expect(entry.textContent).toContain("meeting");
      expect(entry.textContent).toContain("alice");
      expect(entry.textContent).toContain("notes");
    });

    test("should handle .mhtml: keep source URL and extract body text", () => {
      const entry = { name: "page.mhtml", path: "/p/page.mhtml", isFile: true };
      const content =
        "From: <Saved by Browser>\r\n" +
        "Snapshot-Content-Location: https://example.com/article\r\n" +
        "MIME-Version: 1.0\r\n" +
        'Content-Type: multipart/related; boundary="----=_boundary_1"\r\n' +
        "\r\n" +
        "------=_boundary_1\r\n" +
        "Content-Type: text/html; charset=utf-8\r\n" +
        "Content-Transfer-Encoding: quoted-printable\r\n" +
        "Content-Location: https://example.com/article\r\n" +
        "\r\n" +
        "<html><body><h1>Article Title</h1>" +
        "<p>This is the main article body with interesting searchable content.</p>" +
        "</body></html>\r\n" +
        "------=_boundary_1--\r\n";
      misc.extractTxtContentAndLinks(entry, content, false);
      // source URL should be preserved
      expect(entry.textContent).toContain("example.com");
      // body text should now be extracted (was previously discarded)
      expect(entry.textContent).toContain("article");
      expect(entry.textContent).toContain("searchable");
    });

    test("should decode quoted-printable in .mhtml bodies", () => {
      const entry = { name: "qp.mhtml", path: "/p/qp.mhtml", isFile: true };
      const content =
        "Snapshot-Content-Location: https://example.com/page\r\n" +
        'Content-Type: multipart/related; boundary="b"\r\n' +
        "\r\n" +
        "--b\r\n" +
        "Content-Type: text/html; charset=utf-8\r\n" +
        "Content-Transfer-Encoding: quoted-printable\r\n" +
        "\r\n" +
        // "café" encoded as quoted-printable: caf=C3=A9
        "<html><body><p>caf=C3=A9 and more</p></body></html>\r\n" +
        "--b--\r\n";
      misc.extractTxtContentAndLinks(entry, content, false);
      expect(entry.textContent).toContain("café");
    });

    // --- Shortcut formats ---

    test("should index .url files with URL and name", () => {
      const entry = { name: "bookmark.url", path: "/p/bookmark.url", isFile: true };
      const content =
        "[InternetShortcut]\nURL=https://tagspaces.org\nIconIndex=0";
      misc.extractTxtContentAndLinks(entry, content, false);
      expect(entry.textContent).toContain("tagspaces.org");
      expect(entry.textContent).toContain("internetshortcut");
    });

    test("should index .website files", () => {
      const entry = { name: "pinned.website", path: "/p/pinned.website", isFile: true };
      const content =
        "[InternetShortcut]\nURL=https://github.com/tagspaces";
      misc.extractTxtContentAndLinks(entry, content, false);
      expect(entry.textContent).toContain("github.com");
    });

    test("should index .webloc plist files", () => {
      const entry = { name: "mac.webloc", path: "/p/mac.webloc", isFile: true };
      // Real .webloc files have newlines/indentation between tags —
      // without whitespace the entire XML is one unsearchable token.
      const content =
        '<?xml version="1.0" encoding="UTF-8"?>\n' +
        '<plist version="1.0">\n' +
        "  <dict>\n" +
        "    <key>URL</key>\n" +
        "    <string>https://docs.tagspaces.org</string>\n" +
        "  </dict>\n" +
        "</plist>";
      misc.extractTxtContentAndLinks(entry, content, false);
      expect(entry.textContent).toContain("docs.tagspaces.org");
    });

    test("should index .desktop entries", () => {
      const entry = { name: "app.desktop", path: "/p/app.desktop", isFile: true };
      const content =
        "[Desktop Entry]\nType=Link\nName=TagSpaces\nURL=https://tagspaces.org";
      misc.extractTxtContentAndLinks(entry, content, false);
      expect(entry.textContent).toContain("tagspaces");
      expect(entry.textContent).toContain("link");
    });

    test("should strip data URLs from shortcut files", () => {
      const entry = { name: "big.url", path: "/p/big.url", isFile: true };
      const bigBlob = "A".repeat(5000);
      const content =
        "[InternetShortcut]\nURL=https://example.com\n" +
        `IconFile=data:image/png;base64,${bigBlob}\nIconIndex=0`;
      misc.extractTxtContentAndLinks(entry, content, false);
      expect(entry.textContent).not.toContain("AAAA");
      expect(entry.textContent).not.toContain("data:image");
      expect(entry.textContent).toContain("example.com");
    });

    // --- CSV ---

    test("should index .csv and treat comma/semicolon as separators", () => {
      const entry = { name: "data.csv", path: "/p/data.csv", isFile: true };
      const content =
        "Name,Email,Company\n" +
        "Alice,alice@example.com,Acme\n" +
        "Bob;bob@example.com;Widgets";
      misc.extractTxtContentAndLinks(entry, content, false);
      expect(entry.textContent).toContain("alice");
      expect(entry.textContent).toContain("widgets");
      // commas/semicolons should be replaced — each value its own token
      expect(entry.textContent).not.toMatch(/alice,/);
      expect(entry.textContent).not.toMatch(/bob;/);
    });

    test("should strip surrounding quotes from quoted CSV cells", () => {
      const entry = { name: "q.csv", path: "/p/q.csv", isFile: true };
      const content = '"Smith, John","Designer"\n"Doe, Jane","Engineer"';
      misc.extractTxtContentAndLinks(entry, content, false);
      expect(entry.textContent).toContain("smith");
      expect(entry.textContent).toContain("designer");
      expect(entry.textContent).not.toMatch(/"smith/);
    });

    // --- VCF ---

    test("should index .vcf contact fields", () => {
      const entry = { name: "c.vcf", path: "/p/c.vcf", isFile: true };
      const content =
        "BEGIN:VCARD\nVERSION:3.0\n" +
        "FN:Jane Doe\nEMAIL:jane@tagspaces.org\n" +
        "ORG:Acme Corporation\nTITLE:CEO\n" +
        "TEL:+1-555-1234\nEND:VCARD";
      misc.extractTxtContentAndLinks(entry, content, false);
      expect(entry.textContent).toContain("jane");
      expect(entry.textContent).toContain("tagspaces.org");
      expect(entry.textContent).toContain("acme");
      expect(entry.textContent).toContain("ceo");
      expect(entry.textContent).toContain("555");
    });

    test("should strip PHOTO field and its folded continuation lines", () => {
      const entry = { name: "p.vcf", path: "/p/p.vcf", isFile: true };
      const photoBlob = "X".repeat(200);
      const content =
        "BEGIN:VCARD\nVERSION:3.0\nFN:Test Person\n" +
        `PHOTO;ENCODING=b;TYPE=JPEG:/9j/4AAQSkZJRgABAQ${photoBlob}\n` +
        ` ${photoBlob}\n ${photoBlob}\nEMAIL:test@example.com\nEND:VCARD`;
      misc.extractTxtContentAndLinks(entry, content, false);
      expect(entry.textContent).not.toContain("XXX");
      expect(entry.textContent).not.toContain("/9j/");
      expect(entry.textContent).toContain("test person");
      expect(entry.textContent).toContain("test@example.com");
    });

    test("should strip vCard LOGO/SOUND/KEY binary fields", () => {
      const entry = { name: "lk.vcf", path: "/p/lk.vcf", isFile: true };
      const blob = "Z".repeat(200);
      const content =
        "BEGIN:VCARD\nVERSION:3.0\nFN:Corp Rep\n" +
        `LOGO;ENCODING=b:${blob}\n ${blob}\n` +
        `SOUND;ENCODING=b:${blob}\n ${blob}\n` +
        `KEY;ENCODING=b:${blob}\n ${blob}\n` +
        "ORG:Company Name\nEND:VCARD";
      misc.extractTxtContentAndLinks(entry, content, false);
      expect(entry.textContent).not.toContain("ZZZ");
      expect(entry.textContent).toContain("company");
      expect(entry.textContent).toContain("corp rep");
    });
  });

  describe("setEntryLinks function", () => {
    test("should set links on entry object", () => {
      const entry = {
        path: "/test/file.txt",
      };
      const content = "https://example.com";

      misc.setEntryLinks(entry, content);

      expect(entry.links).toBeDefined();
    });

    test("should merge new links with existing ones", () => {
      const entry = {
        path: "/test/file.txt",
        links: [{ href: "https://existing.com", type: "url" }],
      };
      const content = "https://new.com";

      misc.setEntryLinks(entry, content);

      expect(entry.links.length).toBeGreaterThanOrEqual(1);
    });

    test("should avoid duplicate links", () => {
      const entry = {
        path: "/test/file.txt",
        links: [{ href: "https://example.com", type: "url" }],
      };
      const content = "https://example.com and https://example.com";

      misc.setEntryLinks(entry, content);

      const exampleLinks = entry.links.filter(
        (l) => l.href === "https://example.com"
      );
      expect(exampleLinks.length).toBe(1);
    });

    test("should handle empty content", () => {
      const entry = {
        path: "/test/file.txt",
      };

      misc.setEntryLinks(entry, "");

      // Should not set links if none found
      expect(!entry.links || entry.links.length === 0).toBe(true);
    });

    test("should initialize links array if not present", () => {
      const entry = {
        path: "/test/file.txt",
      };
      const content = "https://example.com";

      misc.setEntryLinks(entry, content);

      expect(entry.links).toBeDefined();
      expect(Array.isArray(entry.links)).toBe(true);
    });
  });

  describe("getUrlParameterByName function", () => {
    test("should extract parameter value from URL", () => {
      const url = "https://example.com?param=value";
      const result = misc.getUrlParameterByName(url, "param");
      expect(result).toBe("value");
    });

    test("should extract multiple parameters", () => {
      const url = "https://example.com?id=123&name=test";
      expect(misc.getUrlParameterByName(url, "id")).toBe("123");
      expect(misc.getUrlParameterByName(url, "name")).toBe("test");
    });

    test("should handle URL encoded values", () => {
      const url = "https://example.com?text=hello%20world";
      const result = misc.getUrlParameterByName(url, "text");
      expect(result).toBe("hello world");
    });

    test("should handle plus signs as spaces", () => {
      const url = "https://example.com?text=hello+world";
      const result = misc.getUrlParameterByName(url, "text");
      expect(result).toBe("hello world");
    });

    test("should return empty string for missing parameter", () => {
      const url = "https://example.com?param=value";
      const result = misc.getUrlParameterByName(url, "missing");
      expect(result).toBe("");
    });

    test("should handle ampersand delimiters", () => {
      const url = "https://example.com?first=1&second=2&third=3";
      expect(misc.getUrlParameterByName(url, "second")).toBe("2");
    });

    test("should handle empty parameter value", () => {
      const url = "https://example.com?param=";
      const result = misc.getUrlParameterByName(url, "param");
      expect(result).toBe("");
    });
  });

  describe("filterByUnique function", () => {
    test("should remove duplicate objects by key", () => {
      const items = [
        { id: 1, name: "John" },
        { id: 1, name: "John" },
        { id: 2, name: "Jane" },
      ];
      const result = misc.filterByUnique(items, "id");
      expect(result.length).toBe(2);
    });

    test("should preserve order of first occurrence", () => {
      const items = [
        { id: 2, name: "Jane" },
        { id: 1, name: "John" },
        { id: 2, name: "Jane" },
      ];
      const result = misc.filterByUnique(items, "id");
      expect(result[0].id).toBe(2);
      expect(result[1].id).toBe(1);
    });

    test("should handle empty array", () => {
      const result = misc.filterByUnique([], "id");
      expect(result).toEqual([]);
    });

    test("should handle nested properties", () => {
      const items = [
        { data: { id: 1 }, name: "John" },
        { data: { id: 1 }, name: "John" },
        { data: { id: 2 }, name: "Jane" },
      ];
      const result = misc.filterByUnique(items, "data.id");
      expect(result.length).toBe(2);
    });
  });

  describe("filterByDuplicate function", () => {
    test("should return only items that appear multiple times", () => {
      const items = [
        { id: 1, name: "John" },
        { id: 1, name: "John" },
        { id: 2, name: "Jane" },
      ];
      const result = misc.filterByDuplicate(items, "id", 2);
      expect(result.length).toBe(2);
      expect(result.every((item) => item.id === 1)).toBe(true);
    });

    test("should handle custom duplicate length", () => {
      const items = [
        { id: 1, name: "A" },
        { id: 1, name: "A" },
        { id: 1, name: "A" },
        { id: 2, name: "B" },
        { id: 2, name: "B" },
      ];
      const result = misc.filterByDuplicate(items, "id", 3);
      expect(result.every((item) => item.id === 1)).toBe(true);
      expect(result.length).toBe(3);
    });

    test("should return empty array if no duplicates", () => {
      const items = [
        { id: 1, name: "John" },
        { id: 2, name: "Jane" },
        { id: 3, name: "Bob" },
      ];
      const result = misc.filterByDuplicate(items, "id", 2);
      expect(result.length).toBe(0);
    });

    test("should handle empty array", () => {
      const result = misc.filterByDuplicate([], "id");
      expect(result).toEqual([]);
    });

    test("should handle nested properties", () => {
      const items = [
        { data: { id: 1 }, name: "A" },
        { data: { id: 1 }, name: "A" },
        { data: { id: 2 }, name: "B" },
      ];
      const result = misc.filterByDuplicate(items, "data.id", 2);
      expect(result.length).toBe(2);
    });
  });
});
