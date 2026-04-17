const JSZip = require("jszip");
const {
  extractOfficeText,
  supportedOfficeExtensions,
  isOfficeExtension,
} = require("./office-extractor");

// --- Helpers to build minimal synthetic archives for each format ---

async function buildZip(files) {
  const zip = new JSZip();
  for (const [name, content] of Object.entries(files)) {
    zip.file(name, content);
  }
  return zip.generateAsync({ type: "nodebuffer" });
}

function docxBody(paragraphs) {
  const body = paragraphs
    .map((p) => `<w:p><w:r><w:t>${p}</w:t></w:r></w:p>`)
    .join("");
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
    `<w:body>${body}</w:body></w:document>`
  );
}

function xlsxSharedStrings(strings) {
  const sis = strings
    .map((s) => `<si><t>${s}</t></si>`)
    .join("");
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    `<sst count="${strings.length}" uniqueCount="${strings.length}">${sis}</sst>`
  );
}

function pptxSlide(paragraphs) {
  const body = paragraphs
    .map((p) => `<a:p><a:r><a:t>${p}</a:t></a:r></a:p>`)
    .join("");
  return (
    '<?xml version="1.0" encoding="UTF-8"?>' +
    '<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"' +
    ' xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">' +
    `<p:cSld><p:spTree>${body}</p:spTree></p:cSld></p:sld>`
  );
}

function odfContent(paragraphs) {
  const body = paragraphs.map((p) => `<text:p>${p}</text:p>`).join("");
  return (
    '<?xml version="1.0" encoding="UTF-8"?>' +
    '<office:document-content xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"' +
    ' xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0">' +
    `<office:body><office:text>${body}</office:text></office:body></office:document-content>`
  );
}

function epubChapter(title, paragraphs) {
  const body = paragraphs.map((p) => `<p>${p}</p>`).join("");
  return (
    '<?xml version="1.0" encoding="UTF-8"?>' +
    '<html xmlns="http://www.w3.org/1999/xhtml"><head><title>' +
    title +
    "</title></head><body>" +
    body +
    "</body></html>"
  );
}

// ----------------------------------------------------------------------

describe("office-extractor", () => {
  describe("isOfficeExtension", () => {
    test("returns true for supported extensions", () => {
      for (const ext of supportedOfficeExtensions()) {
        expect(isOfficeExtension(ext)).toBe(true);
      }
    });

    test("returns true for full file names", () => {
      expect(isOfficeExtension("doc.docx")).toBe(true);
      expect(isOfficeExtension("BOOK.EPUB")).toBe(true);
      expect(isOfficeExtension("/path/to/sheet.xlsx")).toBe(true);
    });

    test("returns false for non-office extensions", () => {
      expect(isOfficeExtension(".pdf")).toBe(false);
      expect(isOfficeExtension(".txt")).toBe(false);
      expect(isOfficeExtension("photo.jpg")).toBe(false);
    });

    test("handles empty or invalid input", () => {
      expect(isOfficeExtension("")).toBe(false);
      expect(isOfficeExtension(null)).toBe(false);
      expect(isOfficeExtension(undefined)).toBe(false);
      expect(isOfficeExtension("noextension")).toBe(false);
    });
  });

  describe("supportedOfficeExtensions", () => {
    test("covers all 7 target formats", () => {
      const exts = supportedOfficeExtensions();
      expect(exts).toEqual(
        expect.arrayContaining([
          ".docx",
          ".xlsx",
          ".pptx",
          ".odt",
          ".ods",
          ".odp",
          ".epub",
        ]),
      );
    });
  });

  describe("edge cases", () => {
    test("empty input returns empty string", async () => {
      expect(await extractOfficeText(null, ".docx")).toBe("");
      expect(await extractOfficeText(Buffer.alloc(0), ".docx")).toBe("");
    });

    test("unknown extension returns empty string", async () => {
      const buf = await buildZip({ "foo.txt": "bar" });
      expect(await extractOfficeText(buf, ".pdf")).toBe("");
      expect(await extractOfficeText(buf, ".unknown")).toBe("");
    });

    test("rejects files larger than 64MB", async () => {
      // Create a fake size property without actually allocating 65MB
      const fakeBuffer = { byteLength: 65 * 1024 * 1024 };
      await expect(
        extractOfficeText(fakeBuffer, ".docx"),
      ).rejects.toThrow(/too large/i);
    });

    test("rejects invalid zip data", async () => {
      const notAZip = Buffer.from("This is definitely not a zip archive");
      await expect(
        extractOfficeText(notAZip, ".docx"),
      ).rejects.toThrow(/zip/i);
    });

    test("accepts ArrayBuffer and Uint8Array", async () => {
      const buf = await buildZip({
        "word/document.xml": docxBody(["hello world"]),
      });
      // as Buffer
      expect(await extractOfficeText(buf, ".docx")).toContain("hello");
      // as Uint8Array
      expect(
        await extractOfficeText(new Uint8Array(buf), ".docx"),
      ).toContain("hello");
      // as ArrayBuffer
      const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
      expect(await extractOfficeText(ab, ".docx")).toContain("hello");
    });
  });

  describe(".docx extraction", () => {
    test("extracts paragraphs from word/document.xml", async () => {
      const buf = await buildZip({
        "word/document.xml": docxBody([
          "First paragraph text",
          "Second paragraph text",
          "Final important note",
        ]),
      });
      const text = await extractOfficeText(buf, ".docx");
      expect(text).toContain("First paragraph text");
      expect(text).toContain("Final important note");
    });

    test("includes comments, footnotes, headers, footers", async () => {
      const buf = await buildZip({
        "word/document.xml": docxBody(["body content here"]),
        "word/comments.xml": docxBody(["comment by reviewer"]),
        "word/footnotes.xml": docxBody(["footnote text"]),
        "word/header1.xml": docxBody(["page header"]),
        "word/footer1.xml": docxBody(["page footer"]),
      });
      const text = await extractOfficeText(buf, ".docx");
      expect(text).toContain("body content");
      expect(text).toContain("comment by reviewer");
      expect(text).toContain("footnote text");
      expect(text).toContain("page header");
      expect(text).toContain("page footer");
    });

    test("ignores non-text files in the archive", async () => {
      const buf = await buildZip({
        "word/document.xml": docxBody(["real document text"]),
        "word/media/image1.png": "binary-image-data",
        "[Content_Types].xml": "<Types></Types>",
      });
      const text = await extractOfficeText(buf, ".docx");
      expect(text).toContain("real document text");
      expect(text).not.toContain("binary-image-data");
    });

    test("decodes XML entities", async () => {
      const buf = await buildZip({
        "word/document.xml": docxBody([
          "Tom &amp; Jerry",
          "&lt;code&gt; snippet",
          "&quot;quoted&quot; text",
        ]),
      });
      const text = await extractOfficeText(buf, ".docx");
      expect(text).toContain("Tom & Jerry");
      expect(text).toContain("<code>");
      expect(text).toContain('"quoted"');
    });
  });

  describe(".xlsx extraction", () => {
    test("extracts from sharedStrings.xml", async () => {
      const buf = await buildZip({
        "xl/sharedStrings.xml": xlsxSharedStrings([
          "Invoice",
          "Customer Name",
          "Total Amount",
          "TagSpaces Corp",
        ]),
        "xl/worksheets/sheet1.xml": "<worksheet/>",
      });
      const text = await extractOfficeText(buf, ".xlsx");
      expect(text).toContain("Invoice");
      expect(text).toContain("Customer Name");
      expect(text).toContain("TagSpaces Corp");
    });

    test("extracts inline strings from worksheets", async () => {
      const buf = await buildZip({
        "xl/worksheets/sheet1.xml":
          '<worksheet><sheetData><row><c t="inlineStr"><is><t>inline cell value</t></is></c></row></sheetData></worksheet>',
      });
      const text = await extractOfficeText(buf, ".xlsx");
      expect(text).toContain("inline cell value");
    });

    test("preserves sheet order for numbered worksheets", async () => {
      const buf = await buildZip({
        "xl/worksheets/sheet2.xml":
          '<worksheet><sheetData><row><c><is><t>second sheet</t></is></c></row></sheetData></worksheet>',
        "xl/worksheets/sheet10.xml":
          '<worksheet><sheetData><row><c><is><t>tenth sheet</t></is></c></row></sheetData></worksheet>',
        "xl/worksheets/sheet1.xml":
          '<worksheet><sheetData><row><c><is><t>first sheet</t></is></c></row></sheetData></worksheet>',
      });
      const text = await extractOfficeText(buf, ".xlsx");
      // Numeric sort — sheet1 before sheet2 before sheet10 (not lexicographic)
      const iFirst = text.indexOf("first");
      const iSecond = text.indexOf("second");
      const iTenth = text.indexOf("tenth");
      expect(iFirst).toBeGreaterThanOrEqual(0);
      expect(iFirst).toBeLessThan(iSecond);
      expect(iSecond).toBeLessThan(iTenth);
    });
  });

  describe(".pptx extraction", () => {
    test("extracts text from all slides", async () => {
      const buf = await buildZip({
        "ppt/slides/slide1.xml": pptxSlide([
          "Welcome to the presentation",
        ]),
        "ppt/slides/slide2.xml": pptxSlide([
          "Main content slide",
          "With multiple bullets",
        ]),
        "ppt/slides/slide3.xml": pptxSlide(["Thank you"]),
      });
      const text = await extractOfficeText(buf, ".pptx");
      expect(text).toContain("Welcome");
      expect(text).toContain("Main content");
      expect(text).toContain("multiple bullets");
      expect(text).toContain("Thank you");
    });

    test("includes speaker notes from notesSlides", async () => {
      const buf = await buildZip({
        "ppt/slides/slide1.xml": pptxSlide(["slide text"]),
        "ppt/notesSlides/notesSlide1.xml": pptxSlide(["speaker notes here"]),
      });
      const text = await extractOfficeText(buf, ".pptx");
      expect(text).toContain("slide text");
      expect(text).toContain("speaker notes");
    });
  });

  describe(".odt/.ods/.odp extraction", () => {
    test(".odt extracts content.xml", async () => {
      const buf = await buildZip({
        "mimetype": "application/vnd.oasis.opendocument.text",
        "content.xml": odfContent([
          "Document title here",
          "Body paragraph content",
        ]),
      });
      const text = await extractOfficeText(buf, ".odt");
      expect(text).toContain("Document title");
      expect(text).toContain("Body paragraph");
    });

    test(".ods extracts content.xml", async () => {
      const buf = await buildZip({
        "mimetype": "application/vnd.oasis.opendocument.spreadsheet",
        "content.xml": odfContent(["spreadsheet cell data"]),
      });
      const text = await extractOfficeText(buf, ".ods");
      expect(text).toContain("spreadsheet cell data");
    });

    test(".odp extracts content.xml", async () => {
      const buf = await buildZip({
        "mimetype": "application/vnd.oasis.opendocument.presentation",
        "content.xml": odfContent(["slide title", "slide body text"]),
      });
      const text = await extractOfficeText(buf, ".odp");
      expect(text).toContain("slide title");
      expect(text).toContain("slide body text");
    });

    test("includes styles.xml (headers/footers in ODF)", async () => {
      const buf = await buildZip({
        "content.xml": odfContent(["main body"]),
        "styles.xml": odfContent(["header text in styles"]),
      });
      const text = await extractOfficeText(buf, ".odt");
      expect(text).toContain("main body");
      expect(text).toContain("header text in styles");
    });
  });

  describe(".epub extraction", () => {
    test("extracts text from XHTML chapter files", async () => {
      const buf = await buildZip({
        "mimetype": "application/epub+zip",
        "META-INF/container.xml": '<container/>',
        "OEBPS/chapter1.xhtml": epubChapter("Chapter One", [
          "It was the best of times.",
          "It was the worst of times.",
        ]),
        "OEBPS/chapter2.xhtml": epubChapter("Chapter Two", [
          "In a hole in the ground there lived a hobbit.",
        ]),
      });
      const text = await extractOfficeText(buf, ".epub");
      expect(text).toContain("best of times");
      expect(text).toContain("hobbit");
    });

    test("extracts from .html and .htm files too", async () => {
      const buf = await buildZip({
        "content/page1.html": "<html><body><p>plain html chapter</p></body></html>",
        "content/page2.htm": "<html><body><p>htm variant content</p></body></html>",
      });
      const text = await extractOfficeText(buf, ".epub");
      expect(text).toContain("plain html chapter");
      expect(text).toContain("htm variant content");
    });

    test("ignores non-content zip entries", async () => {
      const buf = await buildZip({
        "OEBPS/chapter1.xhtml": epubChapter("Ch1", ["real chapter content"]),
        "OEBPS/images/cover.jpg": "binary-image",
        "OEBPS/styles.css": "body { color: red; }",
      });
      const text = await extractOfficeText(buf, ".epub");
      expect(text).toContain("real chapter content");
      expect(text).not.toContain("binary-image");
      expect(text).not.toContain("color: red");
    });
  });

  describe("text cap", () => {
    test("truncates output to 5MB maximum", async () => {
      // Build a docx with lots of repeated text
      const bigParagraph = "word ".repeat(200000); // ~1MB per paragraph
      const buf = await buildZip({
        "word/document.xml": docxBody([
          bigParagraph,
          bigParagraph,
          bigParagraph,
          bigParagraph,
          bigParagraph,
          bigParagraph,
          bigParagraph,
        ]),
      });
      const text = await extractOfficeText(buf, ".docx");
      expect(text.length).toBeLessThanOrEqual(5 * 1024 * 1024);
    });
  });
});
