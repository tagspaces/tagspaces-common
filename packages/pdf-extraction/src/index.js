const PDFParser = require("pdf2json");

// Skip PDFs larger than this to avoid OOM on giant files
const MAX_PDF_SIZE = 128 * 1024 * 1024; // 128 MB

/**
 * Extract plain text from a PDF using pdf2json.
 * @param {ArrayBuffer|Buffer} arrayBuffer The PDF data.
 * @returns {Promise<string>} Extracted text content.
 */
function extractPDFcontent(arrayBuffer) {
  return new Promise((resolve, reject) => {
    try {
      // Guard against huge PDFs
      const bufferSize = arrayBuffer.byteLength || arrayBuffer.length || 0;
      if (bufferSize > MAX_PDF_SIZE) {
        reject(
          new Error(
            "PDF too large for text extraction (" +
              Math.round(bufferSize / 1024 / 1024) +
              " MB)",
          ),
        );
        return;
      }

      const pdfParser = new PDFParser();
      let settled = false;

      // Attach error handler FIRST — otherwise a synchronous error from
      // parseBuffer races with handler registration and gets lost
      pdfParser.on("pdfParser_dataError", (errData) => {
        if (settled) return;
        settled = true;
        reject(errData.parserError || errData);
      });

      // Use an array of string parts, join at end — avoids O(N²) string
      // concatenation for PDFs with many text runs
      const parts = [];

      pdfParser.on("pdfParser_dataReady", (pdfDocument) => {
        if (settled) return;
        settled = true;
        try {
          const pages = pdfDocument && pdfDocument.Pages;
          if (!pages || !pages.length) {
            resolve("");
            return;
          }
          for (let i = 0; i < pages.length; i++) {
            const page = pages[i];
            if (!page || !page.Texts) continue;
            const texts = page.Texts;
            for (let j = 0; j < texts.length; j++) {
              const runs = texts[j].R;
              if (!runs) continue;
              for (let k = 0; k < runs.length; k++) {
                const raw = runs[k].T;
                if (!raw) continue;
                // Avoid decodeURIComponent when there's nothing to decode —
                // many PDFs have pure ASCII in T fields
                parts.push(
                  raw.indexOf("%") === -1 ? raw : decodeURIComponent(raw),
                );
                parts.push(" ");
              }
            }
            parts.push("\n");
          }
          resolve(parts.join(""));
        } catch (err) {
          reject(err);
        }
      });

      // Kick off parsing after handlers are attached
      const buf = Buffer.isBuffer(arrayBuffer)
        ? arrayBuffer
        : Buffer.from(arrayBuffer);
      pdfParser.parseBuffer(buf);
    } catch (error) {
      reject(error);
    }
  });
}

module.exports = {
  extractPDFcontent,
};
