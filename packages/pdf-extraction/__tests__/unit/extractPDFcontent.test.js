"use strict";

const { extractPDFcontent } = require("../../src/index.js");

// Build a tiny but valid PDF in memory so the test is self-contained
// (no external fixture, no testdata clone). The xref offsets are computed
// from running byte positions — keep all content ASCII so length === bytes.
function buildMinimalPdf(text) {
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

describe("extractPDFcontent", () => {
  // pdfjs first-load (cmap parse, worker setup) can take a couple of seconds.
  jest.setTimeout(15000);

  test("extracts text from a valid PDF (Buffer input)", async () => {
    const pdf = buildMinimalPdf("Hello PDF Test");
    const text = await extractPDFcontent(pdf);
    expect(text).toContain("Hello PDF Test");
  });

  test("accepts Uint8Array input", async () => {
    const pdf = buildMinimalPdf("Uint8Array Path");
    const view = new Uint8Array(pdf.buffer, pdf.byteOffset, pdf.byteLength);
    const text = await extractPDFcontent(view);
    expect(text).toContain("Uint8Array Path");
  });

  test("returns empty string for empty input", async () => {
    expect(await extractPDFcontent(null)).toBe("");
    expect(await extractPDFcontent(Buffer.alloc(0))).toBe("");
  });

  test("rejects input that is not a PDF", async () => {
    await expect(
      extractPDFcontent(Buffer.from("not a pdf at all", "utf8")),
    ).rejects.toThrow(/Not a valid PDF file/);
  });

  test("rejects PDFs over the size limit", async () => {
    // Spoof byteLength so we exercise the size guard without allocating 128MB.
    const fake = { byteLength: 200 * 1024 * 1024 };
    await expect(extractPDFcontent(fake)).rejects.toThrow(/too large/i);
  });
});
