/**
The MIT License (MIT)
Copyright (c) 2021-present TagSpaces Authors

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

const paths = require("./paths");
const { extractTextContent } = require("./utils-io");

const locationType = {
  TYPE_LOCAL: "0",
  TYPE_CLOUD: "1",
  TYPE_AMPLIFY: "2",
  TYPE_WEBDAV: "3",
};

// Pre-compile regex patterns for better performance
const SOURCE_URL_REGEX = /(?<=data-sourceurl=["'])(http[^"']*)(?=["'])/g;
const HREF_REGEX = /(?<=href=["'])(http[^"']*)(?=["'])/g;
// Captures all href values (including relative paths) — excludes javascript:, mailto:, data:, #anchors
const HREF_ALL_REGEX = /(?<=href=["'])([^"']+)(?=["'])/g;
// Markdown link: [text](path) — bounded to prevent backtracking
const MD_LINK_REGEX = /\[[^\]]{0,500}\]\(([^)]{1,2000})\)/g;
// Optimized: avoid catastrophic backtracking with bounded patterns
const PLAIN_URL_REGEX = /https?:\/\/(?:[a-zA-Z0-9\-._~:/?#\[\]@!$&'()*+,;=])+/g;
const TS_LINK_REGEX = /ts:\/\/(?:[^\s\)]{1,2000})/g; // Bounded length to prevent abuse
const DATA_URL_REGEX = /data:[^ \t\r\n]+/g;
// Strip entire <img ...> tags whose src is a data URL — much faster than
// letting the parser/tokenizer process hundreds of KB of inline base64.
const DATA_URL_IMG_TAG_REGEX =
  /<img\b[^>]*\bsrc\s*=\s*["']data:[^"']*["'][^>]*\/?>/gi;
// Strip base64 images embedded inline in markdown via ![alt](data:...)
const MD_DATA_URL_IMG_REGEX = /!\[[^\]]*\]\(data:[^)]*\)/g;
const BODY_REGEX = /<body[^>]*>([\s\S]*?)<\/body>/i;
const SOURCE_URL_MHTML_REGEX =
  /(?<=Snapshot-Content-Location:\s)(https?:\/\/[^\s]+)/;
// Prefixes to skip when extracting relative links
const SKIP_PREFIXES = [
  "javascript:",
  "mailto:",
  "data:",
  "file:",
  "#",
  "tel:",
  "blob:",
];

// Configuration constants for security
const MAX_CONTENT_LENGTH = 10 * 1024 * 1024; // 10MB limit
const MAX_URL_LENGTH = 2048; // RFC 3986 recommends 2048 chars
const MAX_LINKS_TO_EXTRACT = 10000; // Prevent excessive link extraction

function extractLinks(textContent) {
  const links = [];

  // Input validation and safety checks
  if (!textContent || typeof textContent !== "string") {
    return links;
  }

  // Prevent ReDoS attacks by limiting content length
  const content =
    textContent.length > MAX_CONTENT_LENGTH
      ? textContent.substring(0, MAX_CONTENT_LENGTH)
      : textContent;

  // Use Set for O(1) duplicate detection instead of array.some() O(n²)
  const seenHrefs = new Set();

  try {
    // Extract from data-sourceurl attributes
    extractAndAddLinks(content, SOURCE_URL_REGEX, links, seenHrefs);

    // Extract from href attributes (absolute URLs)
    extractAndAddLinks(content, HREF_REGEX, links, seenHrefs);

    // Extract relative links from href attributes
    extractRelativeLinks(content, HREF_ALL_REGEX, links, seenHrefs);

    // Extract relative links from markdown [text](path) syntax
    extractRelativeLinks(content, MD_LINK_REGEX, links, seenHrefs);

    // Only try plain text extraction if no links found (fallback)
    if (links.length < 1) {
      extractPlainTextLinks(content, links, seenHrefs);
    }
  } catch (e) {
    console.error("Extracting URLs failed:", e.message);
  }

  // Extract TagSpaces custom links
  try {
    extractTagSpacesLinks(content, links, seenHrefs);
  } catch (e) {
    console.error("Extracting TSlinks failed:", e.message);
  }

  return links;
}

/**
 * Helper: Extract and add links from regex matches
 * @private
 */
function extractAndAddLinks(content, regex, links, seenHrefs) {
  let match;
  // Use exec() in loop instead of match() for better performance on large content
  while (
    (match = regex.exec(content)) !== null &&
    links.length < MAX_LINKS_TO_EXTRACT
  ) {
    const link = createLink(match[1]);
    if (link && !seenHrefs.has(link.href)) {
      seenHrefs.add(link.href);
      links.push(link);
    }
  }
}

/**
 * Helper: Extract plain text URLs with enhanced safety
 * @private
 */
function extractPlainTextLinks(content, links, seenHrefs) {
  let match;
  const regex = PLAIN_URL_REGEX;
  regex.lastIndex = 0; // Reset regex state

  while (
    (match = regex.exec(content)) !== null &&
    links.length < MAX_LINKS_TO_EXTRACT
  ) {
    let url = match[0];
    // Remove surrounding angle brackets if present
    url = url.replace(/^<|>$/g, "");

    // Validate URL length (prevent abuse)
    if (url.length > MAX_URL_LENGTH) {
      console.warn(`URL exceeds max length: ${url.substring(0, 100)}...`);
      continue;
    }

    const link = createLink(url);
    if (link && !seenHrefs.has(link.href)) {
      seenHrefs.add(link.href);
      links.push(link);
    }
  }
}

/**
 * Helper: Extract relative file/folder links from regex matches.
 * Skips absolute URLs (already handled), anchors, javascript:, mailto:, data:, file:
 * @private
 */
function extractRelativeLinks(content, regex, links, seenHrefs) {
  let match;
  regex.lastIndex = 0; // Reset regex state

  while (
    (match = regex.exec(content)) !== null &&
    links.length < MAX_LINKS_TO_EXTRACT
  ) {
    const href = (match[1] || match[0]).trim();

    if (!href || href.length === 0 || href.length > MAX_URL_LENGTH) {
      continue;
    }

    // Skip absolute URLs (already extracted), special protocols, and anchors
    if (SKIP_PREFIXES.some((prefix) => href.toLowerCase().startsWith(prefix))) {
      continue;
    }

    // Skip absolute http(s) URLs — already handled by HREF_REGEX / PLAIN_URL_REGEX
    if (/^https?:\/\//i.test(href)) {
      continue;
    }

    // Skip ts:// links — handled separately
    if (/^ts:\/\//i.test(href)) {
      continue;
    }

    if (!seenHrefs.has(href)) {
      seenHrefs.add(href);
      links.push({
        type: "relative",
        href: href,
      });
    }
  }
}

/**
 * Helper: Extract TagSpaces custom protocol links
 * @private
 */
function extractTagSpacesLinks(content, links, seenHrefs) {
  let match;
  const regex = TS_LINK_REGEX;
  regex.lastIndex = 0; // Reset regex state

  while (
    (match = regex.exec(content)) !== null &&
    links.length < MAX_LINKS_TO_EXTRACT
  ) {
    const tsUrl = match[0];

    // Skip empty or too-short URLs
    if (!tsUrl || tsUrl.length < 5) {
      continue;
    }

    try {
      const validUrl = new URL(tsUrl);

      // Prevent duplicate tslinks with efficient Set lookup
      if (!seenHrefs.has(validUrl.href)) {
        seenHrefs.add(validUrl.href);
        links.push({
          type: "tslink",
          href: validUrl.href,
        });
      }
    } catch (error) {
      // Invalid URL - skip silently to avoid spam logging
      // console.debug("Invalid tslink:", tsUrl);
    }
  }
}

function createLink(urlmatch) {
  // console.log("URL match", urlmatch);
  try {
    const validUrl = new URL(urlmatch);
    const link = {};
    link.href = validUrl.href;
    if (validUrl.protocol === "http:" || validUrl.protocol === "https:") {
      link.type = "url";
    }
    return link;
  } catch {
    console.log("invalid url: " + urlmatch);
  }
}

/**
 * Decode quoted-printable encoding commonly used in MHTML text parts.
 * Handles soft line breaks (=\r?\n) and hex byte sequences (=E2=80=99).
 */
function decodeQuotedPrintable(str) {
  if (!str || str.indexOf("=") === -1) return str;
  // Remove soft line breaks
  let out = str.replace(/=\r?\n/g, "");
  // Decode =XX hex bytes — collect runs of =XX and decode as UTF-8
  out = out.replace(/(?:=[0-9A-Fa-f]{2})+/g, (seq) => {
    const bytes = [];
    for (let i = 0; i < seq.length; i += 3) {
      bytes.push(parseInt(seq.substr(i + 1, 2), 16));
    }
    try {
      return Buffer.from(bytes).toString("utf8");
    } catch (e) {
      return seq;
    }
  });
  return out;
}

/**
 * Extract meaningful text from an MHTML document.
 *
 * MHTML is MIME multipart: one main text/html part plus embedded resources
 * (images, CSS, fonts) as additional parts. The previous implementation kept
 * only the Snapshot-Content-Location header, discarding all the actual body
 * text. This version:
 *   1. Keeps the source URL (useful for searchability)
 *   2. Finds the first text/html part and extracts its body
 *   3. Decodes quoted-printable if that encoding is used
 */
function extractMhtmlText(fileContent) {
  if (!fileContent) return "";

  const parts = [];

  // 1. Source URL
  const sourceMatch = fileContent.match(SOURCE_URL_MHTML_REGEX);
  if (sourceMatch && sourceMatch[0]) {
    parts.push(sourceMatch[0].trim());
  }

  // 2. First text/html part. Case-insensitive header matching; the body
  //    starts after the blank line that follows the part headers.
  const htmlPartMatch = fileContent.match(
    /Content-Type:\s*text\/html[^\r\n]*(?:\r?\n[^\r\n]+)*\r?\n\r?\n([\s\S]*?)(?:\r?\n--|\r?\n$)/i,
  );
  if (htmlPartMatch && htmlPartMatch[1]) {
    let body = htmlPartMatch[1];

    // Find the encoding from the part headers (look back from the body start)
    const headerEnd = fileContent.indexOf(htmlPartMatch[1]);
    const headerBlock = fileContent.substring(
      Math.max(0, headerEnd - 500),
      headerEnd,
    );
    if (/Content-Transfer-Encoding:\s*quoted-printable/i.test(headerBlock)) {
      body = decodeQuotedPrintable(body);
    }

    // Prefer the <body> contents; fall back to full HTML if no body tag
    const bodyTagMatch = body.match(BODY_REGEX);
    parts.push(bodyTagMatch && bodyTagMatch[0] ? bodyTagMatch[0] : body);
  }

  return parts.join(" ");
}

function extractTxtContentAndLinks(eentry, fileContent, extractLinks = false) {
  const fileName = eentry.name.toLowerCase();

  if (!eentry.isFile && eentry.meta?.description && extractLinks) {
    setEntryLinks(eentry, eentry.meta?.description);
    return;
  }

  // Check if file type is supported for content extraction
  const supportedExtensions = [
    ".txt",
    ".md",
    ".marp",
    ".htm",
    ".html",
    ".xhtml",
    ".shtml",
    ".eml",
    ".mhtml",
    ".website",
    ".url",
    ".webloc",
    ".desktop",
    ".csv",
    ".vcf",
  ];
  const fileExt = "." + fileName.split(".").pop();

  if (!supportedExtensions.includes(fileExt)) {
    return;
  }

  try {
    if (!fileContent) {
      return;
    }

    // Strip embedded data URLs FIRST — before any other regex work.
    // HTML/MD files in TagSpaces commonly have base64 images inlined.
    // These can dominate the file size and slow every subsequent step
    // (body match, toLowerCase, marked lexer).
    //
    // Order matters: strip whole <img src="data:..."> and markdown
    // ![alt](data:...) first, then any remaining bare "data:..." URIs.
    let textContent = fileContent
      .replace(DATA_URL_IMG_TAG_REGEX, "")
      .replace(MD_DATA_URL_IMG_REGEX, "")
      .replace(DATA_URL_REGEX, "");

    if (
      fileName.endsWith(".htm") ||
      fileName.endsWith(".html") ||
      fileName.endsWith(".xhtml") ||
      fileName.endsWith(".shtml")
    ) {
      // Match body on the already-cleaned content (not the raw one) —
      // otherwise the body match would drag all the dataurls back in.
      const bodyMatch = textContent.match(BODY_REGEX);
      if (bodyMatch && bodyMatch[0]) {
        textContent = bodyMatch[0].trim();
      }
    } else if (fileName.endsWith(".mhtml")) {
      textContent = extractMhtmlText(textContent);
    } else if (fileName.endsWith(".csv")) {
      // Replace field separators with spaces so each cell value becomes its
      // own token. Also strip surrounding quotes from quoted fields.
      textContent = textContent.replace(/[,;]+/g, " ").replace(/"/g, " ");
    } else if (fileName.endsWith(".vcf")) {
      // vCard: strip embedded binary fields (PHOTO, LOGO, SOUND, KEY) which
      // can carry large base64 payloads across folded continuation lines.
      // A folded continuation line starts with whitespace; the field ends at
      // the next line that doesn't start with whitespace.
      textContent = textContent.replace(
        /^(PHOTO|LOGO|SOUND|KEY)[^\r\n]*\r?\n(?:[ \t][^\r\n]*\r?\n)*/gim,
        "",
      );
      // Replace vCard separators (: ; ,) with spaces so field names and
      // values become individual tokens.
      textContent = textContent.replace(/[:;,]+/g, " ");
    }

    eentry.textContent = extractTextContent(fileName, textContent);
    if (extractLinks) {
      setEntryLinks(eentry, textContent);
    }
  } catch (error) {
    console.warn(
      `Skipping content extraction: ${eentry.name}` +
        (error.message ? " (" + error.message.split("\n")[0] + ")" : ""),
    );
  }
}

function setEntryLinks(entry, textContent) {
  const links = extractLinks(textContent);
  if (!links || links.length === 0) {
    return;
  }

  // Use Set for efficient deduplication
  const existingHrefs = entry.links
    ? new Set(entry.links.map((link) => link.href))
    : new Set();
  const newLinks = links.filter((link) => !existingHrefs.has(link.href));

  if (newLinks.length > 0) {
    entry.links = entry.links ? [...entry.links, ...newLinks] : newLinks;
  }

  // console.log(
  //   "Entry links for " + entry.path + "\n" + JSON.stringify(entry.links)
  // );
}

function getUrlParameterByName(url, paramName) {
  const name = paramName.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
  const regex = new RegExp("[\\?&]" + name + "=([^&#]*)");
  const results = regex.exec(url);
  let param =
    results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
  if (param.includes("#")) {
    param = param.split("#").join("%23");
  }
  return param;
}

/**
 * @param tagGroup: TS.TagGroup
 * @returns {TS.TagGroup}
 */
function prepareTagGroupForExport(tagGroup) {
  const preparedTagGroup = {
    title: tagGroup.title,
    uuid: tagGroup.uuid,
    children: [],
  };
  if (tagGroup.created_date) {
    preparedTagGroup.created_date = tagGroup.created_date;
  }
  if (tagGroup.color) {
    preparedTagGroup.color = tagGroup.color;
  }
  if (tagGroup.textcolor) {
    preparedTagGroup.textcolor = tagGroup.textcolor;
  }
  if (tagGroup.modified_date) {
    preparedTagGroup.modified_date = tagGroup.modified_date;
  }
  if (tagGroup.expanded) {
    preparedTagGroup.expanded = tagGroup.expanded;
  }
  if (tagGroup.children && tagGroup.children.length > 0) {
    tagGroup.children.forEach((tag) => {
      const cleanedTag = prepareTagForExport(tag);
      if (cleanedTag.title) {
        preparedTagGroup.children.push(prepareTagForExport(cleanedTag));
      }
    });
  }
  return preparedTagGroup;
}
/**
 * @param tag TS.Tag
 */
function prepareTagForExport(tag) {
  return {
    title: tag.title,
    ...(tag.color && { color: tag.color }),
    ...(tag.textcolor && { textcolor: tag.textcolor }),
    ...(tag.type && { type: tag.type }),
    ...(tag.description && { description: tag.description }),
  };
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // $& means the whole matched string
}

/**
 * @param textQuery: string
 * @param identifier: string
 * @returns {[TS.Tag]}
 */
function parseTextQuery(textQuery, identifier) {
  const extractedTags = [];
  let query = textQuery;
  if (query && query.length > 0) {
    query = query
      .trim()
      .replace(new RegExp(escapeRegExp(identifier) + "\\s+", "g"), identifier);
    const textQueryParts = query.split(" ");
    if (textQueryParts) {
      // && textQueryParts.length > 1) {
      textQueryParts.forEach((part) => {
        const trimmedPart = part.trim();
        if (trimmedPart.startsWith(identifier)) {
          const tagTitle = trimmedPart.substr(1).trim();
          extractedTags.push({
            title: tagTitle,
          });
        }
      });
    }
  }
  return extractedTags;
}

/**
 * @param query: string
 * @returns {string}
 */
function removeAllTagsFromSearchQuery(query) {
  if (!query) {
    return "";
  }
  // return query.replace(/([+-?]\S+)/g, '').trim();
  const queryArray = query.split(" ");
  const returnArray = queryArray.filter(
    (q) => !q.startsWith("+") && !q.startsWith("-") && !q.startsWith("|"),
  );
  return returnArray.join(" ").trim();
}

/**
 * @param textQuery : string
 * @param tags: Array<TS.Tag>
 * @param identifier: string
 * @returns {undefined|Array<TS.Tag>|TS.Tag[]|*}
 */
function mergeWithExtractedTags(textQuery, tags, identifier) {
  const extractedTags = parseTextQuery(textQuery, identifier);
  if (tags) {
    if (extractedTags.length > 0) {
      return getUniqueTags(tags, extractedTags);
    }
    return tags;
  }
  if (extractedTags.length > 0) {
    return extractedTags;
  }
  return undefined;
}

/**
 * @param tags1: Array<TS.Tag>
 * @param tags2: Array<TS.Tag>
 * @returns {TS.Tag[]}
 */
function getUniqueTags(tags1, tags2) {
  const mergedArray = [...tags1, ...tags2];
  // mergedArray have duplicates, lets remove the duplicates using Set
  const set = new Set();
  return mergedArray.filter((tag) => {
    if (!set.has(tag.title)) {
      set.add(tag.title);
      return true;
    }
    return false;
  }, set);
}

/**
 * @deprecated TODO not used for remove
 * @param objArr: Array<Object>
 * @param func
 */
function traverse(objArr, func) {
  objArr.forEach((obj) => {
    Object.keys(obj).map((objKey) => {
      func.apply(this, [obj, objKey]);
      if (objKey === "subPages" && typeof Array.isArray(obj[objKey])) {
        traverse(obj[objKey], func);
      }
      return true;
    });
  });
}

/**
 * @param items
 * @param firstIndex: number
 * @param secondIndex: number
 * @returns {*}
 */
function immutablySwapItems(items, firstIndex, secondIndex) {
  const results = items.slice();
  const firstItem = items[firstIndex];
  results[firstIndex] = items[secondIndex];
  results[secondIndex] = firstItem;
  return results;
}

/**
 * Convert 64bit url string to Blob
 * @name b64toBlob
 * @method
 * @param {string} b64Data - the 64bit url string which should be converted to Blob
 * @param {string} contentType - content type of blob
 * @param {int} sliceSize - optional size of slices if omited 512 is used as default
 * @returns {Blob}
 * TODO charCodeAt is not a function at Windows
 */
function b64toBlob(b64Data, contentType = "", sliceSize = 512) {
  const byteCharacters = Buffer.from(b64Data, "base64"); // atob(b64Data);
  const byteArrays = [];

  for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
    const slice = byteCharacters.subarray(offset, offset + sliceSize);
    const byteNumbers = new Array(slice.length);
    for (let i = 0; i < slice.length; i += 1) {
      byteNumbers[i] = slice.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    byteArrays.push(byteArray);
  }
  return new Blob(byteArrays, { type: contentType });
}

/**
 * @param min: number
 * @param max: number
 * @returns {number}
 */
function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Convert ArrayBuffer or TypedArray to Node Buffer safely
 * @param {ArrayBuffer|TypedArray} data
 * @returns {Buffer}
 */
function arrayBufferToBuffer(data) {
  if (!data) {
    throw new TypeError(
      "Expected ArrayBuffer, TypedArray, or Buffer, but got " + data,
    );
  }

  // If it’s already a Buffer, just return it
  if (Buffer.isBuffer(data)) {
    return data;
  }

  // If it’s a TypedArray (Uint8Array, etc.), use its underlying buffer & offsets
  if (ArrayBuffer.isView(data)) {
    return Buffer.from(data.buffer, data.byteOffset, data.byteLength);
  }

  // If it’s a raw ArrayBuffer
  if (data instanceof ArrayBuffer) {
    return Buffer.from(data);
  }
  throw new TypeError(
    `Unsupported data type: ${Object.prototype.toString.call(data)}`,
  );
  /* const buffer = Buffer.alloc(data.byteLength);
  const view = new Uint8Array(data);
  for (let i = 0; i < buffer.length; ++i) {
    buffer[i] = view[i];
  }*/
  //return buffer;
}

function streamToBuffer(stream) {
  const buffs = [];
  return new Promise(function (resolve) {
    stream.on("data", function (d) {
      buffs.push(d);
    });
    stream.on("end", function () {
      resolve(Buffer.concat(buffs));
    });
  });
}

/**
 * @param bytes: number
 * @param decimals
 * @returns {string}
 */
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

/**
 * @deprecated use formatBytes instead
 * @param sizeInBytes: number
 * @returns {string}
 */
function formatFileSize(sizeInBytes) {
  const kilobyte = 1024;
  const megabyte = kilobyte * kilobyte;
  const gigabyte = megabyte * kilobyte;
  const terabyte = gigabyte * kilobyte;
  const precision = 2;

  if (sizeInBytes >= 0 && sizeInBytes < kilobyte) {
    return sizeInBytes + " B";
  }
  if (sizeInBytes >= kilobyte && sizeInBytes < megabyte) {
    return (sizeInBytes / kilobyte).toFixed(precision) + " KB";
  }
  if (sizeInBytes >= megabyte && sizeInBytes < gigabyte) {
    return (sizeInBytes / megabyte).toFixed(precision) + " MB";
  }
  if (sizeInBytes >= gigabyte && sizeInBytes < terabyte) {
    return (sizeInBytes / gigabyte).toFixed(precision) + " GB";
  }
  if (sizeInBytes >= terabyte) {
    return (sizeInBytes / terabyte).toFixed(precision) + " TB";
  }
  return sizeInBytes + "";
}

/**
 * @deprecated use formatBytes instead
 * @param sizeInBytes: number
 * @param siSystem: boolean
 * @returns {string}
 */
function formatFileSize2(sizeInBytes, siSystem) {
  const threshold = siSystem ? 1000 : 1024;
  if (!sizeInBytes) {
    return "";
  }
  if (sizeInBytes < threshold) {
    return sizeInBytes + " B";
  }
  const units = siSystem
    ? ["kB", "MB", "GB", "TB", "PB", "EB"]
    : ["KiB", "MiB", "GiB", "TiB", "PiB", "EiB"];
  let cUnit = -1;
  do {
    sizeInBytes /= threshold;
    ++cUnit;
  } while (sizeInBytes >= threshold);
  return sizeInBytes.toFixed(1) + " " + units[cUnit];
}

/**
 * Helper function to pad numbers with leading zero
 * @param {number} num
 * @returns {string}
 */
function padZero(num) {
  return (num < 10 ? "0" : "") + num;
}

/**
 * @param date: string | number
 * @param includeTime: boolean
 * @returns {string}
 */
function formatDateTime(date, includeTime) {
  if (date === undefined || date === "") {
    return "";
  }
  const d = new Date(date);
  const cDate = padZero(d.getDate());
  const cMonth = padZero(d.getMonth() + 1);
  const cYear = d.getFullYear();

  if (!includeTime) {
    return cYear + "-" + cMonth + "-" + cDate;
  }

  const cHour = padZero(d.getHours());
  const cMinute = padZero(d.getMinutes());
  const cSecond = padZero(d.getSeconds());

  return (
    cYear +
    "-" +
    cMonth +
    "-" +
    cDate +
    " - " +
    cHour +
    ":" +
    cMinute +
    ":" +
    cSecond
  );
}

/**
 * Convert a date in the following format 20191204 or 20191204T124532
 * https://en.wikipedia.org/wiki/ISO_8601
 * @param date: string | Date
 * @param includeTime: boolean
 * @param includeMS?: boolean
 * @returns {string}
 */
function formatDateTime4Tag(date, includeTime, includeMS) {
  if (
    date === undefined ||
    date === null ||
    date === "" ||
    date.toString() === "Invalid Date"
  ) {
    return "";
  }
  const d = new Date(date);
  const cDate = padZero(d.getDate());
  const cMonth = padZero(d.getMonth() + 1);
  const cYear = d.getFullYear();

  if (!includeTime) {
    return cYear + "" + cMonth + "" + cDate;
  }

  const cHour = padZero(d.getHours());
  const cMinute = padZero(d.getMinutes());
  const cSecond = padZero(d.getSeconds());
  const time = "T" + cHour + cMinute + cSecond;

  const milliseconds = includeMS ? "." + d.getMilliseconds() : "";
  return cYear + "" + cMonth + "" + cDate + time + milliseconds;
}

/**
 * @param dateString: string
 * @returns {boolean|Date}
 */
function convertStringToDate(dateString) {
  if (dateString === undefined || dateString === "") {
    return false;
  }
  if (dateString.length === 8) {
    return new Date(
      dateString.substring(0, 4) +
        "-" +
        dateString.substring(4, 6) +
        "-" +
        dateString.substring(6, 8),
    );
  }
  return false;
}

function toLowerCaseSafe(txt) {
  return txt ? txt.toLowerCase() : "";
}

/**
 * @param a: TS.FileSystemEntry
 * @param b: TS.FileSystemEntry
 * @returns {number|number}
 */
function sortAlphaNum(a, b) {
  // Regular expression to separate the digit string from the non-digit strings.
  const reParts = /\d+|\D+/g;

  // Regular expression to test if the string has a digit.
  const reDigit = /\d/;

  // Get rid of casing issues && remove tags for files only (folders dont have tags in name)
  const cleanedA = a.isFile
    ? paths.cleanFileName(toLowerCaseSafe(a.name))
    : toLowerCaseSafe(a.name);
  const cleanedB = b.isFile
    ? paths.cleanFileName(toLowerCaseSafe(b.name))
    : toLowerCaseSafe(b.name);

  // Separates the strings into substrings that have only digits and those
  // that have no digits.
  const aParts = cleanedA.match(reParts);
  const bParts = cleanedB.match(reParts);

  // Used to determine if aPart and bPart are digits.
  let isDigitPart;

  // If `a` and `b` are strings with substring parts that match...
  if (
    aParts &&
    bParts &&
    (isDigitPart = reDigit.test(aParts[0])) === reDigit.test(bParts[0])
  ) {
    // Loop through each substring part to compare the overall strings.
    const len = Math.min(aParts.length, bParts.length);
    for (let i = 0; i < len; i += 1) {
      let aPart = aParts[i];
      let bPart = bParts[i];
      // If comparing digits, convert them to numbers (assuming base 10).
      if (isDigitPart) {
        aPart = parseInt(aPart, 10);
        bPart = parseInt(bPart, 10);
      }

      // If the substrings aren't equal, return either -1 or 1.
      if (aPart !== bPart) {
        return aPart < bPart ? -1 : 1;
      }

      // Toggle the value of isDigitPart since the parts will alternate.
      isDigitPart = !isDigitPart;
    }
  }

  // Use normal comparison.
  // @ts-ignore
  return (a >= b) - (a <= b);
}

/**
 * Sorting functionality
 * @param a: TS.FileSystemEntry
 * @param b: TS.FileSystemEntry
 * @returns {number}
 */
function sortByName(a, b) {
  // @ts-ignore
  return !b.isFile - !a.isFile || sortAlphaNum(a, b);
}

/**
 * @param a: TS.FileSystemEntry
 * @param b: TS.FileSystemEntry
 * @returns {number}
 */
function sortBySize(a, b) {
  const aSize = a.size | 0;
  const bSize = b.size | 0;
  return aSize - bSize;
}

function getTimestamp(value) {
  if (value === undefined) {
    return 0; // Default to epoch start if undefined
  }
  return value; // Already a timestamp
}

/**
 * @param a: TS.FileSystemEntry
 * @param b: TS.FileSystemEntry
 * @returns {number}
 */
function sortByDateModified(a, b) {
  const aLmdt = getTimestamp(a.lmdt);
  const bLmdt = getTimestamp(b.lmdt);
  return aLmdt - bLmdt;
}

/**
 * @param a: TS.FileSystemEntry
 * @param b: TS.FileSystemEntry
 * @returns {number}
 */
function sortByExtension(a, b) {
  return a.extension === b.extension
    ? sortAlphaNum(a, b)
    : a.extension.toString().localeCompare(b.extension);
}

/**
 * @param a: TS.FileSystemEntry
 * @param b: TS.FileSystemEntry
 * @returns {number}
 */
function sortByFirstTag(a, b) {
  if ((!a.tags && !b.tags) || (a.tags.length < 1 && b.tags.length < 1)) {
    return sortAlphaNum(a, b);
  }
  if (!a.tags || a.tags.length < 1) {
    return -1;
  }
  if (!b.tags || b.tags.length < 1) {
    return 1;
  }
  return a.tags[0].title.localeCompare(b.tags[0].title);
}

/**
 * @param array: Array<any>
 * @returns {Array<*>}
 */
function shuffleArray(array) {
  // Durstenfeld shuffle
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

/**
 * @param data: any
 * @param criteria: string
 * @param order: boolean
 * @returns {Array<*>|*}
 */
function sortByCriteria(data, criteria, order) {
  const copyData = [...data];

  // Create a map of sort functions for better performance than switch
  const sortFunctionMap = {
    byName: () => {
      copyData.sort(sortByName);
      return !order ? copyData.reverse() : copyData;
    },
    byFileSize: () => {
      copyData.sort(order ? sortBySize : (a, b) => -1 * sortBySize(a, b));
      return copyData;
    },
    byDateModified: () => {
      copyData.sort(
        order ? sortByDateModified : (a, b) => -1 * sortByDateModified(a, b),
      );
      return copyData;
    },
    byExtension: () => {
      copyData.sort(
        order ? sortByExtension : (a, b) => -1 * sortByExtension(a, b),
      );
      return copyData;
    },
    byFirstTag: () => {
      copyData.sort(
        order ? sortByFirstTag : (a, b) => -1 * sortByFirstTag(a, b),
      );
      return copyData;
    },
    random: () => shuffleArray(copyData),
  };

  const sortFn = sortFunctionMap[criteria];
  return sortFn ? sortFn() : copyData.sort(sortByName);
}

/**
 * @description Check if value is of type 'object'
 * @param val
 * @returns {boolean}
 */
const isObj = (val) => typeof val === "object" && !isArr(val) && !isNull(val);
/**
 * @description Check if value is of type 'null'
 * @param val
 * @returns {boolean}
 */
const isNull = (val) => val === null;
/**
 * @description Check if value is of type 'number'
 * @param val
 * @returns {boolean}
 */
const isNum = (val) => typeof val === "number" && !isNaN(val);
/**
 * @description Check if value is of type 'function'
 * @param val
 * @returns {boolean}
 */
const isFunc = (val) => typeof val === "function";
/**
 * @description Check if value is of type 'array'
 * @param val
 * @returns {boolean}
 */
const isArr = (val) => Array.isArray(val);
/**
 * @description Check if value is of type 'string'
 * @param val
 * @returns {boolean}
 */
const isStr = (val) => typeof val === "string";
/**
 * Check if value is of type 'undefined'
 */
const isUndef = (val) => typeof val === "undefined";
/**
 * Check if value is of type 'boolean'
 */
const isBool = (val) => typeof val === "boolean";
/**
 * Check if object has property
 */
const hasProp = (obj, prop) => obj.hasOwnProperty(prop);
/**
 * Check if object has method
 */
const hasMethod = (obj, method) => hasProp(obj, method) && isFunc(obj[method]);
/**
 * Check if object has key
 */
const hasKey = (obj, key) => getKeys(obj).indexOf(key) > -1;
/**
 * @description Get object keys
 * @param obj
 * @returns {Array}
 */
const getKeys = (obj) => Object.keys(obj);
/**
 * @description Iterate over each key of an object
 * @param obj
 * @param callback
 */
const eachKey = (obj, callback) => {
  Object.keys(obj).forEach((key, index) => callback(key, obj[key], index));
};

/**
 * @description Linear iterator for object properties
 * @param obj
 * @param callback
 */
const eachProp = (obj, callback) => {
  eachKey(obj, (key, prop, index) => callback(prop, key, index));
};

/**
 * @description Extend
 * @param baseObject
 * @param restObjects
 * @returns {object}
 */
const extend = (baseObject, ...restObjects) => {
  const { assign } = Object;
  const modifiedObject = assign({}, baseObject);
  restObjects.map((obj) => assign(modifiedObject, obj));
  return modifiedObject;
};

/**
 * @deprecated not used
 * @description Iterate recursively
 * @param handler
 * @param complete
 * @param index
 * @returns {*}
 */
const recurIter = (handler, complete, index = 0) => {
  handler((canRecur) => {
    if (!canRecur) {
      return complete();
    }
    const nextIndex = index + 1;
    recurIter(handler, complete, nextIndex);
  }, index);
};

/**
 * @description Poll over an interval of time
 * @param handler
 * @param complete
 * @param interval
 */
const poll = (handler, complete, interval) => {
  setTimeout(() => {
    handler((canPoll) => {
      if (canPoll) {
        return poll(handler, complete, interval);
      }
      complete();
    });
  }, interval);
};

/**
 * @description Buffer high-frequency events
 * @returns {function(*=, *=, *=)}
 */
const buffer = ({ timeout, id }) => {
  const timers = {};
  return (callback) => {
    if (!id) {
      timers[id] = "0";
    }
    if (timers[id]) {
      clearTimeout(timers[id]);
    }
    timers[id] = setTimeout(callback, timeout);
  };
};

/**
 * @description Determine type checker
 * @param type
 * @returns {*}
 */
const determineTypeChecker = (type) => {
  switch (type) {
    case "number":
      return isNum;
    case "object":
      return isObj;
    case "null":
      return isNull;
    case "function":
      return isFunc;
    case "array":
      return isArr;
    case "string":
      return isStr;
    case "bool":
    case "boolean":
      return isBool;
    case "undefined":
    default:
      return isUndef;
  }
};

/**
 * @description Filter object data
 * @param objectData
 * @param requiredKeys
 */
const filterObjectData = (objectData, requiredKeys) => {
  const filteredObject = {};
  eachKey(objectData, (key, value) => {
    if (requiredKeys.indexOf(key) === -1) {
      return false;
    }
    filteredObject[key] = value;
  });
  return filteredObject;
};

/**
 * @description Filter array of objects data
 * @param arrayData
 * @param requiredKeys
 */
const filterArrayOfObjectsData = (arrayData, requiredKeys) =>
  arrayData.reduce((accumulator, item) => {
    const filteredObject = filterObjectData(item, requiredKeys);
    accumulator.push(filteredObject);
    return accumulator;
  }, []);

/**
 * @description Pluck object data to array
 * @param objectData
 * @param requiredKey
 */
const pluckObjectDataToArray = (objectData, requiredKey) => {
  const filteredArray = [];
  eachKey(objectData, (key, value) => {
    if (requiredKey !== key) {
      return false;
    }
    filteredArray.push(value);
  });
  return filteredArray;
};

/**
 * @description Pluck array of objects data to array
 * @param arrayData
 * @param requiredKey
 */
const pluckArrayOfObjectsDataToArray = (arrayData, requiredKey) =>
  arrayData.reduce((accumulator, item) => {
    const filteredArray = pluckObjectDataToArray(item, requiredKey);
    return [...accumulator, ...filteredArray];
  }, []);

/**
 * @description Extract nexted prop
 * @param obj
 * @param keysText
 * @returns {*}
 */
const extractNestedProp = (obj, keysText) => {
  const keys = keysText.split(".");
  const keysLength = keys.length - 1;
  let keysIndex = 0;
  let isValidKey = true;
  let targetObj = Object.assign({}, obj);
  let targetProp;
  let nextTarget;

  if (keys.length > 0) {
    while (isValidKey) {
      nextTarget = targetObj[keys[keysIndex]];

      // ... check if final target is reached ...
      if (keysIndex === keysLength) {
        // ... extract target prop
        targetProp =
          !isUndef(nextTarget) && !isNull(nextTarget) ? nextTarget : undefined;
        break;
      }

      // ... check if next target is not an object ...
      if (!isObj(nextTarget)) {
        // ... cancel sequence
        isValidKey = false;
        break;
      }

      targetObj = nextTarget;
      keysIndex++;
    }
  }

  return targetProp;
};

/**
 * @description Sort by
 * @param items
 * @param keysText
 * @param type
 * @param direction
 */
const sortBy = (items, keysText, type = "string", direction = "asc") =>
  items.sort((a, b) => {
    const aVal = extractNestedProp(a, keysText);
    const bVal = extractNestedProp(b, keysText);
    if (isUndef(aVal) || isNull(aVal)) {
      return direction === "asc" ? -1 : 1;
    }

    if (isUndef(bVal) || isNull(bVal)) {
      return direction === "asc" ? 1 : -1;
    }
    if (type === "string" || type === "email") {
      if (aVal.toLowerCase() > bVal.toLowerCase()) {
        return direction === "asc" ? 1 : -1;
      }
      if (aVal.toLowerCase() < bVal.toLowerCase()) {
        return direction === "asc" ? -1 : 1;
      }
      return 0;
    }
    if (type === "number" || type === "integer" || type === "float") {
      if (aVal > bVal) {
        return direction === "asc" ? 1 : -1;
      }
      if (aVal < bVal) {
        return direction === "asc" ? -1 : 1;
      }
      return 0;
    }
    if (type === "date") {
      // @ts-ignore
      const res1 = new Date(aVal) - new Date(bVal);
      // @ts-ignore
      const res2 = new Date(bVal) - new Date(aVal);
      return direction === "asc" ? res1 : res2;
    }
  });

/**
 * @description Shape
 * @param items
 * @returns {*}
 */
const shape = (items) => {
  let shapeItems = [...items];

  return {
    fetch: () => shapeItems,
    filterByUnique(key) {
      shapeItems = filterByUnique(shapeItems, key);
      return this;
    },
    filterByDuplicate(key, length = 2) {
      shapeItems = filterByDuplicate(shapeItems, key, length);
      return this;
    },
    sortBy({ key, type = "string", direction = "asc" }) {
      shapeItems = sortBy(shapeItems, key, type, direction);
      return this;
    },
    reduceTo(key) {
      shapeItems = shapeItems.reduce((accumulator, item) => {
        const prop = extractNestedProp(item, key);
        if (isArr(prop)) {
          return [...accumulator, ...prop];
        }
        if (!isUndef(prop) && !isNull(prop)) {
          return [...accumulator, prop];
        }
      }, []);
      return this;
    },
  };
};

/**
 * @description Filter by unique
 * @param items
 * @param key
 * @returns {*}
 */
const filterByUnique = (items, key) => {
  const seenValues = new Set();
  return items.reduce((accumulator, item) => {
    const itemProp = extractNestedProp(item, key);
    if (seenValues.has(itemProp)) {
      return accumulator;
    }
    seenValues.add(itemProp);
    accumulator.push(extend({}, item));
    return accumulator;
  }, []);
};

/**
 * @description Filter by duplicate
 * @param items
 * @param key
 * @param duplicateLength
 * @returns {*}
 */
const filterByDuplicate = (items, key, duplicateLength = 2) => {
  const itemPropCounts = new Map();

  // Count occurrences
  items.forEach((item) => {
    const itemProp = extractNestedProp(item, key);
    itemPropCounts.set(itemProp, (itemPropCounts.get(itemProp) || 0) + 1);
  });

  // Filter items with count >= duplicateLength
  return items.filter((item) => {
    const itemProp = extractNestedProp(item, key);
    return itemPropCounts.get(itemProp) >= duplicateLength;
  });
};

module.exports = {
  locationType,
  extractTxtContentAndLinks,
  extractLinks,
  setEntryLinks,
  getUrlParameterByName,
  prepareTagGroupForExport,
  prepareTagForExport,
  escapeRegExp,
  parseTextQuery,
  removeAllTagsFromSearchQuery,
  mergeWithExtractedTags,
  traverse,
  immutablySwapItems,
  b64toBlob,
  getRandomInt,
  arrayBufferToBuffer,
  streamToBuffer,
  formatBytes,
  formatFileSize,
  formatFileSize2,
  formatDateTime,
  formatDateTime4Tag,
  convertStringToDate,
  sortAlphaNum,
  sortByName,
  sortBySize,
  sortByDateModified,
  sortByExtension,
  sortByFirstTag,
  shuffleArray,
  sortByCriteria,
  isObj,
  isNull,
  isNum,
  isFunc,
  isArr,
  isStr,
  isUndef,
  isBool,
  hasProp,
  hasMethod,
  hasKey,
  getKeys,
  eachKey,
  eachProp,
  extend,
  recurIter,
  poll,
  buffer,
  determineTypeChecker,
  filterObjectData,
  filterArrayOfObjectsData,
  pluckObjectDataToArray,
  pluckArrayOfObjectsDataToArray,
  extractNestedProp,
  sortBy,
  shape,
  filterByUnique,
  filterByDuplicate,
};
