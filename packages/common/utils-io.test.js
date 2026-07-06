const fs = require("fs-extra");
const pathLib = require("path");
const utilsIO = require("@tagspaces/tagspaces-common/utils-io");
const AppConfig = require("@tagspaces/tagspaces-common/AppConfig");
const {
  listDirectoryPromise,
} = require("@tagspaces/tagspaces-common-node/io-node");

// walkDirectory applies AppConfig.defaultIgnorePatterns on top of any
// per-call patterns, so filter the same junk from readdirSync before
// comparing counts.
const picomatch = require("picomatch");
const isIgnored = picomatch(AppConfig.defaultIgnorePatterns);
function listVisible(dir) {
  return fs.readdirSync(dir).filter((n) => !isIgnored(n));
}

describe("Common utils-io unit tests", () => {
  test("walkDirectory", async () => {
    const dir = pathLib.resolve(
      __dirname,
      "..",
      "..",
      "scripts",
      "testdata",
      "file-structure",
      "supported-filestypes"
    );
    const entries = await utilsIO.walkDirectory(
      { path: dir },
      listDirectoryPromise
    );
    const files = listVisible(dir);
    expect(entries.length).toBe(files.length);
  });

  test("enhanceEntry", async () => {
    const dir = pathLib.resolve(
      __dirname,
      "..",
      "..",
      "scripts",
      "testdata",
      "file-structure",
      "supported-filestypes"
    );
    const entries = await utilsIO.walkDirectory(
      { path: dir },
      listDirectoryPromise
    );
    const enhancedEntries = entries.map(utilsIO.enhanceEntry);
    const files = listVisible(dir);
    expect(enhancedEntries.length).toBe(files.length);

    expect(enhancedEntries[0].name).toBe("empty_folder");
    expect(enhancedEntries[0].isFile).toBe(false);

    const lastEntry = enhancedEntries[enhancedEntries.length - 1];
    expect(lastEntry.name).toBe("sample_exif[iptc].jpg");
    expect(lastEntry.isFile).toBe(true);
    expect(lastEntry.tags).toEqual([
      {
        title: "iptc",
        type: "plain",
      },
    ]);
  });
  test("loadJSONString", async () => {
    //TODO
  });

  describe("getUuid function", () => {
    test("should generate UUID v4 by default", () => {
      const uuid = utilsIO.getUuid();
      expect(uuid).toBeDefined();
      expect(uuid.length).toBe(32); // UUID without dashes
      expect(uuid).toMatch(/^[a-f0-9]{32}$/i);
    });

    test("should generate UUID v1 when version is 1", () => {
      const uuid = utilsIO.getUuid(1);
      expect(uuid).toBeDefined();
      expect(uuid.length).toBe(32); // UUID without dashes
      expect(uuid).toMatch(/^[a-f0-9]{32}$/i);
    });

    test("should generate unique UUIDs", () => {
      const uuid1 = utilsIO.getUuid();
      const uuid2 = utilsIO.getUuid();
      expect(uuid1).not.toBe(uuid2);
    });

    test("should remove hyphens from UUID", () => {
      const uuid = utilsIO.getUuid();
      expect(uuid).not.toContain("-");
    });
  });

  describe("loadJSONString function", () => {
    test("should parse valid JSON", () => {
      const jsonString = '{"key": "value", "number": 42}';
      const result = utilsIO.loadJSONString(jsonString);
      expect(result).toEqual({ key: "value", number: 42 });
    });

    test("should handle JSON with arrays", () => {
      const jsonString = '{"items": [1, 2, 3], "name": "test"}';
      const result = utilsIO.loadJSONString(jsonString);
      expect(result.items).toEqual([1, 2, 3]);
      expect(result.name).toBe("test");
    });

    test("should handle nested objects", () => {
      const jsonString = '{"outer": {"inner": "value"}}';
      const result = utilsIO.loadJSONString(jsonString);
      expect(result.outer.inner).toBe("value");
    });

    test("should remove UTF-8 BOM if present", () => {
      const jsonString = '\ufeff{"key": "value"}';
      const result = utilsIO.loadJSONString(jsonString);
      expect(result).toEqual({ key: "value" });
    });

    test("should handle empty JSON objects", () => {
      const jsonString = "{}";
      const result = utilsIO.loadJSONString(jsonString);
      expect(result).toEqual({});
    });

    test("should handle empty JSON arrays", () => {
      const jsonString = "[]";
      const result = utilsIO.loadJSONString(jsonString);
      expect(result).toEqual([]);
    });

    test("should return undefined for invalid JSON", () => {
      const jsonString = "{invalid json}";
      const result = utilsIO.loadJSONString(jsonString);
      expect(result).toBeUndefined();
    });

    test("should return undefined for null input", () => {
      const result = utilsIO.loadJSONString(null);
      expect(result).toBeUndefined();
    });

    test("should return undefined for empty string", () => {
      const result = utilsIO.loadJSONString("");
      expect(result).toBeUndefined();
    });

    test("should handle JSON with special characters", () => {
      const jsonString = '{"text": "hello\\nworld", "emoji": "🚀"}';
      const result = utilsIO.loadJSONString(jsonString);
      expect(result.text).toBe("hello\nworld");
      expect(result.emoji).toBe("🚀");
    });
  });

  describe("runPromisesSynchronously function", () => {
    test("should resolve promises in order", async () => {
      const results = [];
      const promises = [
        Promise.resolve(1),
        Promise.resolve(2),
        Promise.resolve(3),
      ];
      const result = await utilsIO.runPromisesSynchronously(promises);
      expect(result).toEqual([1, 2, 3]);
    });

    test("should handle async functions returning promises", async () => {
      const promises = [
        (async () => "a")(),
        (async () => "b")(),
        (async () => "c")(),
      ];
      const result = await utilsIO.runPromisesSynchronously(promises);
      expect(result).toEqual(["a", "b", "c"]);
    });

    test("should handle empty array", async () => {
      const result = await utilsIO.runPromisesSynchronously([]);
      expect(result).toEqual([]);
    });

    test("should execute promises synchronously (in order)", async () => {
      const order = [];
      const promises = [
        (async () => {
          order.push(1);
          return 1;
        })(),
        (async () => {
          order.push(2);
          return 2;
        })(),
        (async () => {
          order.push(3);
          return 3;
        })(),
      ];
      const result = await utilsIO.runPromisesSynchronously(promises);
      expect(order).toEqual([1, 2, 3]);
      expect(result).toEqual([1, 2, 3]);
    });

    test("should handle promise rejection", async () => {
      const promises = [
        Promise.resolve(1),
        Promise.reject(new Error("Test error")),
        Promise.resolve(3),
      ];
      await expect(
        utilsIO.runPromisesSynchronously(promises)
      ).rejects.toThrow("Test error");
    });

    test("should preserve results order", async () => {
      const promises = [
        new Promise((resolve) => setTimeout(() => resolve("first"), 10)),
        Promise.resolve("second"),
        new Promise((resolve) => setTimeout(() => resolve("third"), 5)),
      ];
      const result = await utilsIO.runPromisesSynchronously(promises);
      expect(result).toEqual(["first", "second", "third"]);
    });
  });

  describe("isThumbGenSupportedFileType function", () => {
    test("should return true for supported image files", () => {
      const result = utilsIO.isThumbGenSupportedFileType("jpg", "image");
      expect(result).toBe(true);
    });

    test("should return true for supported container files", () => {
      const result = utilsIO.isThumbGenSupportedFileType("pdf", "containers");
      expect(result).toBe(true);
    });

    test("should return false for unsupported file types", () => {
      const result = utilsIO.isThumbGenSupportedFileType(
        "unknown",
        "image"
      );
      expect(result).toBe(false);
    });

    test("should check all file types when no type provided", () => {
      // Should return true if file extension is supported in any type
      const result = utilsIO.isThumbGenSupportedFileType("jpg");
      expect(result).toBe(true);
    });

    test("should return false for unsupported file type parameter", () => {
      const result = utilsIO.isThumbGenSupportedFileType("jpg", "unsupported");
      expect(result).toBe(false);
    });

    test("should handle video file type", () => {
      const result = utilsIO.isThumbGenSupportedFileType("mp4", "video");
      expect(result).toBe(true);
    });

    test("should support text file type", () => {
      const result = utilsIO.isThumbGenSupportedFileType("txt", "text");
      expect(result).toBe(true);
    });
  });

  describe("createTextIndex function", () => {
    test("should create text index from simple text", () => {
      const text = "hello world hello";
      const result = utilsIO.createTextIndex(text);
      expect(result).toContain("hello");
      expect(result).toContain("world");
    });

    test("should remove duplicate tokens", () => {
      const text = "apple apple banana apple";
      const result = utilsIO.createTextIndex(text);
      const tokens = result.split(" ");
      const appleCount = tokens.filter((t) => t === "apple").length;
      expect(appleCount).toBe(1);
    });

    test("should handle multiple whitespace", () => {
      const text = "hello    world  test";
      const result = utilsIO.createTextIndex(text);
      expect(result).toBe("hello world test");
    });

    test("should trim leading and trailing whitespace", () => {
      const text = "  hello world  ";
      const result = utilsIO.createTextIndex(text);
      expect(result).not.toMatch(/^ | $/);
    });

    test("should return empty string for null", () => {
      const result = utilsIO.createTextIndex(null);
      expect(result).toBe("");
    });

    test("should return empty string for empty string", () => {
      const result = utilsIO.createTextIndex("");
      expect(result).toBe("");
    });

    test("should handle single word", () => {
      const result = utilsIO.createTextIndex("hello");
      expect(result).toBe("hello");
    });

    test("should preserve token order", () => {
      const text = "zebra apple banana apple zebra";
      const result = utilsIO.createTextIndex(text);
      const tokens = result.split(" ");
      expect(tokens[0]).toBe("zebra");
      expect(tokens[1]).toBe("apple");
      expect(tokens[2]).toBe("banana");
    });

    test("should handle tabs and newlines", () => {
      const text = "hello\tworld\ntest";
      const result = utilsIO.createTextIndex(text);
      expect(result).toBe("hello world test");
    });
  });

  describe("extractTextContent function", () => {
    test("should extract text from plain text files", () => {
      const fileName = "document.txt";
      const content = "Hello World This is a test";
      const result = utilsIO.extractTextContent(fileName, content);
      expect(result).toContain("hello");
      expect(result).toContain("world");
    });

    test("should convert text to lowercase", () => {
      const fileName = "document.txt";
      const content = "HELLO WORLD";
      const result = utilsIO.extractTextContent(fileName, content);
      expect(result).toContain("hello");
      expect(result).not.toContain("HELLO");
    });

    test("should handle markdown files", () => {
      const fileName = "document.md";
      const content = "# Title\nSome content";
      const result = utilsIO.extractTextContent(fileName, content);
      expect(typeof result).toBe("string");
    });

    test("should handle HTML files", () => {
      const fileName = "document.html";
      const content = "<p>Hello World</p>";
      const result = utilsIO.extractTextContent(fileName, content);
      expect(typeof result).toBe("string");
    });

    test("should handle HTM files", () => {
      const fileName = "document.htm";
      const content = "<p>Hello World</p>";
      const result = utilsIO.extractTextContent(fileName, content);
      expect(typeof result).toBe("string");
    });

    test("should handle MHTML files", () => {
      const fileName = "document.mhtml";
      const content = "<p>Hello World</p>";
      const result = utilsIO.extractTextContent(fileName, content);
      expect(typeof result).toBe("string");
    });

    test("should remove HTML script tags", () => {
      const fileName = "document.html";
      const content =
        "<p>Keep this</p><script>var x = 1;</script><p>Keep this too</p>";
      const result = utilsIO.extractTextContent(fileName, content);
      expect(result).not.toContain("script");
      expect(result).not.toContain("var x");
    });

    test("should remove HTML style tags", () => {
      const fileName = "document.html";
      const content =
        "<p>Keep this</p><style>body { color: red; }</style><p>Keep this too</p>";
      const result = utilsIO.extractTextContent(fileName, content);
      expect(result).not.toContain("style");
      expect(result).not.toContain("color: red");
    });

    test("should handle empty content", () => {
      const fileName = "document.txt";
      const content = "";
      const result = utilsIO.extractTextContent(fileName, content);
      expect(result).toBe("");
    });

    test("should deduplicate tokens in result", () => {
      const fileName = "document.txt";
      const content = "test test test other test";
      const result = utilsIO.extractTextContent(fileName, content);
      const tokens = result.split(" ");
      const testCount = tokens.filter((t) => t === "test").length;
      expect(testCount).toBe(1);
    });

    test("should decode HTML entities", () => {
      const fileName = "document.html";
      const content = "<body><p>Tom &amp; Jerry cost &#36;5</p></body>";
      const result = utilsIO.extractTextContent(fileName, content);
      expect(result).toContain("tom");
      expect(result).toContain("jerry");
      // &amp; → & then lowercase preserves the ampersand
      expect(result).not.toContain("amp");
    });

    test("should strip HTML comments", () => {
      const fileName = "document.html";
      const content = "<p>Visible</p><!-- hidden comment --><p>Also visible</p>";
      const result = utilsIO.extractTextContent(fileName, content);
      expect(result).toContain("visible");
      expect(result).not.toContain("hidden");
      expect(result).not.toContain("comment");
    });

    test("should not stack-overflow on adversarial markdown-like HTML", () => {
      // The marked lexer's emStrong regex can blow the call stack on
      // certain inputs. Our regex-based HTML extractor must be immune.
      const fileName = "document.html";
      const content =
        "<body><p>" +
        "*".repeat(10000) +
        "</p><p>real content here</p><p>" +
        "_".repeat(10000) +
        "</p></body>";
      // Must not throw a RangeError
      expect(() =>
        utilsIO.extractTextContent(fileName, content),
      ).not.toThrow();
      const result = utilsIO.extractTextContent(fileName, content);
      expect(result).toContain("real");
      expect(result).toContain("content");
    });

    test("should handle HTML tags without collapsing adjacent text", () => {
      // <b>foo</b>bar should become "foo bar", not "foobar"
      const fileName = "document.html";
      const content = "<body><b>foo</b>bar<i>baz</i>qux</body>";
      const result = utilsIO.extractTextContent(fileName, content);
      expect(result).toContain("foo");
      expect(result).toContain("bar");
      expect(result).toContain("baz");
      expect(result).toContain("qux");
      // Adjacent text nodes must not merge — explicit space from tag replacement
      expect(result).not.toMatch(/foobar/);
      expect(result).not.toMatch(/bazqux/);
    });

    test("markdown extraction returns plain text tokens", () => {
      const fileName = "doc.md";
      const content = "# Heading\n\nSome plain paragraph text here.";
      const result = utilsIO.extractTextContent(fileName, content);
      expect(result).toContain("heading");
      expect(result).toContain("plain");
      expect(result).toContain("paragraph");
    });
  });
});
