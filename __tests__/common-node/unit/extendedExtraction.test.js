"use strict";

// Tests the `extendedExtraction` Pro/Lite gate in the indexer pipeline:
// when falsy, PDF and Office branches are skipped; when a function (the PDF
// parser), the PDF branch runs and Office extraction is allowed.
// Plain-text / Markdown / link extraction must work regardless.
//
// Each test uses its own fresh subdir because `extractAndSavePdf` caches the
// extracted PDF text under `.ts/<file>.pdf.txt` based on mtime, which would
// otherwise short-circuit later tests away from the injected parser mock.

const fs = require("fs");
const pathLib = require("path");
const os = require("os");
const {
  listDirectoryPromise,
  saveTextFilePromise,
  createDirectoryPromise,
  deleteDirectoryPromise,
} = require("@tagspaces/tagspaces-common-node/io-node");

function buildMinimalPdf(text) {
  // Same recipe as packages/pdf-extraction/__tests__/unit/extractPDFcontent.test.js
  const stream = `BT /F1 12 Tf 50 700 Td (${text}) Tj ET`;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] " +
      "/Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let out = "%PDF-1.4\n";
  const offsets = [];
  for (let i = 0; i < objects.length; i++) {
    offsets.push(out.length);
    out += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
  }
  const xrefOffset = out.length;
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const o of offsets) {
    out += `${String(o).padStart(10, "0")} 00000 n \n`;
  }
  out +=
    `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\n` +
    `startxref\n${xrefOffset}\n%%EOF\n`;
  return Buffer.from(out, "binary");
}

let counter = 0;
async function makeFixture() {
  const dir = pathLib.join(
    os.tmpdir(),
    `extendedExt-${process.pid}-${Date.now()}-${counter++}`,
  );
  await createDirectoryPromise(dir);
  await saveTextFilePromise(
    { path: pathLib.join(dir, "note.md") },
    "# Title\n\nHello markdown world.\n\n[Example](https://example.com)\n",
    true,
  );
  await saveTextFilePromise(
    { path: pathLib.join(dir, "readme.txt") },
    "plain text content sample",
    true,
  );
  fs.writeFileSync(
    pathLib.join(dir, "report.pdf"),
    buildMinimalPdf("Hello PDF Sample"),
  );
  return dir;
}

describe("extendedExtraction gate (Lite vs Pro)", () => {
  const dirs = [];

  afterAll(async () => {
    for (const d of dirs) {
      try {
        await deleteDirectoryPromise(d);
      } catch (e) {
        // best effort
      }
    }
  });

  async function fixture() {
    const d = await makeFixture();
    dirs.push(d);
    return d;
  }

  test("Lite (extendedExtraction=false): plain text indexed, PDF skipped", async () => {
    const dir = await fixture();
    const list = await listDirectoryPromise(
      { path: dir, extendedExtraction: false },
      ["loadMeta", "extractTextContent"],
      [],
    );
    const md = list.find((e) => e.name === "note.md");
    const txt = list.find((e) => e.name === "readme.txt");
    const pdf = list.find((e) => e.name === "report.pdf");

    expect(md).toBeDefined();
    expect(txt).toBeDefined();
    expect(pdf).toBeDefined();

    expect(md.textContent).toBeTruthy();
    expect(md.textContent).toContain("hello");
    expect(md.textContent).toContain("markdown");
    expect(txt.textContent).toBeTruthy();
    expect(txt.textContent).toContain("plain");
    // PDF must NOT have textContent in Lite
    expect(pdf.textContent).toBeFalsy();
  });

  test("Lite: extractLinks still works for plain-text files", async () => {
    const dir = await fixture();
    const list = await listDirectoryPromise(
      { path: dir, extendedExtraction: false },
      ["loadMeta", "extractTextContent", "extractLinks"],
      [],
    );
    const md = list.find((e) => e.name === "note.md");
    expect(md.links).toBeDefined();
    expect(Array.isArray(md.links)).toBe(true);
    const hasExample = md.links.some(
      (l) => l && l.href && l.href.includes("example.com"),
    );
    expect(hasExample).toBe(true);
  });

  test("Pro (extendedExtraction=fn): PDF branch invokes the injected parser", async () => {
    const dir = await fixture();
    const fakePdfParser = jest
      .fn()
      .mockResolvedValue("fake pdf extracted text");
    const list = await listDirectoryPromise(
      { path: dir, extendedExtraction: fakePdfParser },
      ["loadMeta", "extractTextContent"],
      [],
    );
    const pdf = list.find((e) => e.name === "report.pdf");
    expect(pdf).toBeDefined();
    expect(fakePdfParser).toHaveBeenCalledTimes(1);
    expect(pdf.textContent).toBeTruthy();
    expect(pdf.textContent).toContain("fake");
  });

  test("Pro: legacy param.extractPDFcontent still works (back-compat)", async () => {
    // CLI / thumbgen still pass the function under the old key — io-fsclient
    // falls back to `param.extractPDFcontent` when `extendedExtraction` is
    // unset. Verify that path keeps working.
    const dir = await fixture();
    const fakePdfParser = jest
      .fn()
      .mockResolvedValue("legacy extracted text");
    const list = await listDirectoryPromise(
      { path: dir, extractPDFcontent: fakePdfParser },
      ["loadMeta", "extractTextContent"],
      [],
    );
    const pdf = list.find((e) => e.name === "report.pdf");
    expect(pdf).toBeDefined();
    expect(fakePdfParser).toHaveBeenCalled();
    expect(pdf.textContent).toBeTruthy();
    expect(pdf.textContent).toContain("legacy");
  });
});
