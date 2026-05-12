// Skip PDFs larger than this to avoid OOM on giant files
const MAX_PDF_SIZE = 128 * 1024 * 1024; // 128 MB

// pdfjs-dist v5 is ESM-only. Load it once via dynamic import and cache.
//
// In Node.js, pdfjs tries to spawn a fake worker by dynamically importing
// pdf.worker.mjs. We point GlobalWorkerOptions.workerSrc at an absolute path
// so it can find the worker regardless of bundling context.
let pdfjsPromise = null;

// pdfjs ships a DOMMatrix polyfill but gates it on an `isNodeJS` check that
// excludes Electron utility processes (where process.type === "utility").
// Our WS server runs as a utility process, so pdfjs's polyfill never fires
// and page.getTextContent() throws "DOMMatrix is not defined". Polyfill the
// same canvas globals ourselves before loading pdfjs.
function polyfillCanvasGlobals() {
  if (typeof globalThis.DOMMatrix !== "undefined") return;
  try {
    // getBuiltinModule is webpack-invisible — pdfjs uses the same trick.
    const mod = process.getBuiltinModule
      ? process.getBuiltinModule("module")
      : null;
    if (!mod) return;
    const requireFn = mod.createRequire(__filename);
    const canvas = requireFn("@napi-rs/canvas");
    if (canvas && canvas.DOMMatrix) {
      globalThis.DOMMatrix = canvas.DOMMatrix;
    }
    if (canvas && canvas.Path2D && typeof globalThis.Path2D === "undefined") {
      globalThis.Path2D = canvas.Path2D;
    }
    if (
      canvas &&
      canvas.ImageData &&
      typeof globalThis.ImageData === "undefined"
    ) {
      globalThis.ImageData = canvas.ImageData;
    }
  } catch (e) {
    // @napi-rs/canvas not resolvable; getTextContent will throw and the
    // outer caller will surface it.
  }
}

function resolveWorkerPath() {
  const path = require("path");
  // Try several known locations:
  // 1. Resolved via Node's module resolution (non-webpack context)
  try {
    return require.resolve("pdfjs-dist/legacy/build/pdf.worker.mjs");
  } catch (e) {
    // fall through
  }
  // 2. Next to the bundle itself (WS webpack build copies it here)
  if (typeof __dirname !== "undefined") {
    return path.join(__dirname, "pdf.worker.mjs");
  }
  return undefined;
}

function getPdfjs() {
  if (!pdfjsPromise) {
    polyfillCanvasGlobals();
    pdfjsPromise = import("pdfjs-dist/legacy/build/pdf.mjs").then((pdfjs) => {
      try {
        if (!pdfjs.GlobalWorkerOptions.workerSrc) {
          const workerPath = resolveWorkerPath();
          if (workerPath) {
            pdfjs.GlobalWorkerOptions.workerSrc = workerPath;
          }
        }
      } catch (e) {
        // If worker setup fails, pdfjs may still work in single-thread mode
      }
      return pdfjs;
    });
  }
  return pdfjsPromise;
}

/**
 * Extract plain text from a PDF using pdfjs-dist.
 *
 * Uses pdfjs-dist (same library as the renderer's PDF viewer) — roughly 2-3x
 * faster than pdf2json on multi-MB PDFs and produces more complete text output.
 *
 * @param {ArrayBuffer|Buffer|Uint8Array} arrayBuffer The PDF data.
 * @returns {Promise<string>} Extracted text content.
 */
async function extractPDFcontent(arrayBuffer) {
  if (!arrayBuffer) return "";
  const size =
    arrayBuffer.byteLength || arrayBuffer.length || 0;
  if (size === 0) return "";
  if (size > MAX_PDF_SIZE) {
    throw new Error(
      "PDF too large for text extraction (" +
        Math.round(size / 1024 / 1024) +
        " MB)",
    );
  }
  // Quick sanity check — a valid PDF starts with "%PDF-"
  // (Buffer/Uint8Array byte comparison)
  const b = arrayBuffer;
  if (
    size < 5 ||
    b[0] !== 0x25 /* % */ ||
    b[1] !== 0x50 /* P */ ||
    b[2] !== 0x44 /* D */ ||
    b[3] !== 0x46 /* F */ ||
    b[4] !== 0x2d /* - */
  ) {
    throw new Error("Not a valid PDF file");
  }

  // Normalize to a plain Uint8Array — pdfjs rejects Node's Buffer even
  // though Buffer extends Uint8Array. Check Buffer FIRST since a Buffer
  // also passes `instanceof Uint8Array`.
  let data;
  if (typeof Buffer !== "undefined" && Buffer.isBuffer(arrayBuffer)) {
    data = new Uint8Array(
      arrayBuffer.buffer,
      arrayBuffer.byteOffset,
      arrayBuffer.byteLength,
    );
  } else if (arrayBuffer instanceof Uint8Array) {
    data = arrayBuffer;
  } else {
    data = new Uint8Array(arrayBuffer);
  }

  const { getDocument } = await getPdfjs();

  const loadingTask = getDocument({
    data,
    // Minimize overhead in Node.js — these aren't needed for text extraction
    disableFontFace: true,
    disableAutoFetch: true,
    disableStream: true,
    verbosity: 0,
  });
  // Ensure any internal pdfjs promise rejections don't become unhandled —
  // the outer await/destroy() will surface the real error.
  loadingTask.promise.catch(() => {});

  let doc;
  try {
    doc = await loadingTask.promise;
    const parts = [];
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      try {
        const content = await page.getTextContent();
        const items = content.items;
        for (let j = 0; j < items.length; j++) {
          const str = items[j].str;
          if (str) {
            parts.push(str);
            parts.push(" ");
          }
        }
        parts.push("\n");
      } finally {
        // Release page resources immediately — critical for memory
        // usage on large PDFs
        page.cleanup();
      }
    }
    return parts.join("");
  } finally {
    if (doc) {
      await doc.destroy();
    } else {
      // loadingTask still holding resources if getDocument rejected
      loadingTask.destroy().catch(() => {});
    }
  }
}

module.exports = {
  extractPDFcontent,
};
