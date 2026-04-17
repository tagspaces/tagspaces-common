/**
 * Text extraction from ZIP-based document formats:
 *   - Microsoft Office: .docx, .xlsx, .pptx
 *   - OpenDocument:     .odt, .ods, .odp
 *   - EPUB:             .epub
 *
 * All these formats are ZIP containers with XML (or XHTML for EPUB) inside.
 * We open the archive with JSZip, read the content file(s) that carry the
 * visible text, and strip XML/HTML tags to produce plain text.
 *
 * Pure JS — works on all platforms (Electron, browser, Cordova, Capacitor,
 * Node CLI). No native deps.
 */

// Skip files larger than this to avoid OOM on pathological archives
const MAX_OFFICE_FILE_SIZE = 64 * 1024 * 1024; // 64 MB
// Cap extracted text to keep the fulltext index reasonable
const MAX_EXTRACTED_TEXT = 5 * 1024 * 1024; // 5 MB

// JSZip is lazy-loaded on first use so the module is cheap to import
let JSZipPromise = null;
function getJSZip() {
  if (!JSZipPromise) {
    JSZipPromise = Promise.resolve(require("jszip"));
  }
  return JSZipPromise;
}

/**
 * Replace XML/HTML tags with spaces so adjacent text runs don't collide.
 * e.g.  "<w:t>hello</w:t><w:t>world</w:t>"  →  " hello  world "
 * Then collapse whitespace.
 */
function stripTags(xml) {
  if (!xml) return "";
  return xml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Decode the common XML entities that carry real content.
 */
function decodeEntities(str) {
  if (!str) return "";
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)));
}

/**
 * Read text from all files in the archive whose path matches `predicate`.
 * Returns an array of decoded plain-text strings.
 */
async function extractFromEntries(zip, predicate) {
  const files = [];
  zip.forEach((relPath, file) => {
    if (!file.dir && predicate(relPath)) {
      files.push({ path: relPath, file });
    }
  });
  // Keep deterministic order (e.g. slide1, slide2, slide3) for readable output
  files.sort((a, b) => a.path.localeCompare(b.path, undefined, { numeric: true }));

  const parts = [];
  let totalSize = 0;
  for (const { file } of files) {
    if (totalSize >= MAX_EXTRACTED_TEXT) break;
    const xml = await file.async("string");
    const text = decodeEntities(stripTags(xml));
    if (text) {
      parts.push(text);
      totalSize += text.length;
    }
  }
  return parts.join(" ");
}

// --- Per-format extractors ---

async function extractDocx(zip) {
  // Main body is in word/document.xml. Comments/footnotes/endnotes/headers/
  // footers/textbox content live in sibling files — include them too.
  return extractFromEntries(zip, (p) =>
    /^word\/(document|comments|footnotes|endnotes|header\d*|footer\d*)\.xml$/i.test(
      p,
    ),
  );
}

async function extractXlsx(zip) {
  // sharedStrings.xml has every unique string. Worksheets reference these by
  // index, so sharedStrings alone captures the searchable content of most
  // spreadsheets. Also include inline strings from sheet XMLs for robustness.
  return extractFromEntries(zip, (p) =>
    /^xl\/(sharedStrings\.xml|worksheets\/sheet\d+\.xml)$/i.test(p),
  );
}

async function extractPptx(zip) {
  // One XML per slide, plus notes and masters for thoroughness
  return extractFromEntries(zip, (p) =>
    /^ppt\/(slides\/slide\d+|notesSlides\/notesSlide\d+|slideLayouts\/slideLayout\d+)\.xml$/i.test(
      p,
    ),
  );
}

async function extractOdf(zip) {
  // OpenDocument: content.xml holds the body text for all ODF formats
  // (text/spreadsheet/presentation). styles.xml has headers/footers.
  return extractFromEntries(zip, (p) =>
    /^(content|styles|meta)\.xml$/i.test(p),
  );
}

async function extractEpub(zip) {
  // EPUB content files are *.xhtml / *.html inside OEBPS/ or similar.
  // Rather than parse the OPF manifest (complex), grab all XHTML/HTML.
  return extractFromEntries(zip, (p) => /\.x?html?$/i.test(p));
}

const EXTRACTORS = {
  ".docx": extractDocx,
  ".xlsx": extractXlsx,
  ".pptx": extractPptx,
  ".odt": extractOdf,
  ".ods": extractOdf,
  ".odp": extractOdf,
  ".epub": extractEpub,
};

/**
 * Extract plain text from a supported ZIP-based office/epub file.
 *
 * @param {ArrayBuffer|Uint8Array|Buffer} buffer - File contents
 * @param {string} fileExt - Lowercase extension including the dot (".docx", etc.)
 * @returns {Promise<string>} Extracted plain text (possibly empty).
 */
async function extractOfficeText(buffer, fileExt) {
  if (!buffer) return "";
  const size = buffer.byteLength || buffer.length || 0;
  if (size === 0) return "";
  if (size > MAX_OFFICE_FILE_SIZE) {
    throw new Error(
      "Office file too large for text extraction (" +
        Math.round(size / 1024 / 1024) +
        " MB)",
    );
  }

  const extractor = EXTRACTORS[fileExt];
  if (!extractor) return "";

  const JSZip = await getJSZip();
  let zip;
  try {
    zip = await JSZip.loadAsync(buffer);
  } catch (e) {
    throw new Error(
      "Not a valid ZIP archive: " + (e && e.message ? e.message : e),
    );
  }

  const text = await extractor(zip);
  // Final length cap
  return text.length > MAX_EXTRACTED_TEXT
    ? text.substring(0, MAX_EXTRACTED_TEXT)
    : text;
}

/**
 * List of supported extensions — for use by callers that gate extraction by
 * file type. Returns lowercase extensions including the dot.
 */
function supportedOfficeExtensions() {
  return Object.keys(EXTRACTORS);
}

/**
 * @param {string} fileNameOrExt - File name or lowercase extension with dot
 * @returns {boolean}
 */
function isOfficeExtension(fileNameOrExt) {
  if (!fileNameOrExt || typeof fileNameOrExt !== "string") return false;
  const lower = fileNameOrExt.toLowerCase();
  if (lower.startsWith(".")) {
    return Object.prototype.hasOwnProperty.call(EXTRACTORS, lower);
  }
  const dot = lower.lastIndexOf(".");
  if (dot === -1) return false;
  return Object.prototype.hasOwnProperty.call(EXTRACTORS, lower.substring(dot));
}

module.exports = {
  extractOfficeText,
  supportedOfficeExtensions,
  isOfficeExtension,
};
