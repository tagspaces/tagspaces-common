/**
The MIT License (MIT)
Copyright (c) 2021-present TagSpaces Authors

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

const paths = require("./paths");
const { createTextIndex, extractTextContent } = require("./utils-io");

const locationType = {
  TYPE_LOCAL: "0",
  TYPE_CLOUD: "1",
  TYPE_AMPLIFY: "2",
  TYPE_WEBDAV: "3",
};

function extractLinks(textContent) {
  const links = [];

  try {
    // Extracting source url from HTML files saved with the browser extension
    // const sourceUrlRegex = /data-sourceurl=["'](http[^"']*)["']/g;
    const sourceUrlRegex = /(?<=data-sourceurl=["'])(http[^"']*)(?=["'])/g;
    const sourceUrlMatches = textContent.match(sourceUrlRegex) || [];
    for (const match of sourceUrlMatches) {
      const link = createLink(match);
      if (link) {
        links.push(link);
      }
    }

    // if content is html link should be in href attributes
    const urlRegex = /(?<=href=["'])(http[^"']*)(?=["'])/g;
    const urlMatches = textContent.match(urlRegex) || [];
    for (const match of urlMatches) {
      const link = createLink(match);
      if (link) {
        links.push(link);
      }
    }

    // if plain text or markdown try to find links beginning with http
    if (links.length < 1) {
      // const urlRegex = /(https?:\/\/[^\s]+)/g;
      const urlRegex = /https?:\/\/[^\s\)]+|(?<=\()\s*https?:\/\/[^\s\)]+/g;
      // const urlRegex = /https?:\/\/[^\s<>]+|<https?:\/\/[^\s<>]+>/g;
      const urlMatches = textContent.match(urlRegex) || [];
      for (const match of urlMatches) {
        // Recognizing correctly <https://example.com>
        const cleanedMatch = match.replace(/^<|>$/g, "");
        const link = createLink(cleanedMatch);
        if (link) {
          links.push(link);
        }
      }
    }
  } catch (e) {
    console.error("Extracting URL failed with: " + e);
  }

  try {
    // const tsUrlRegex = /ts?:\/\/\?([-a-zA-Z0-9@:%_\+.~#?&\\//=]*)/g;
    const tsUrlRegex = /(?:ts):\/\/[^\s\)]+/g;
    const tsUrls = textContent.match(tsUrlRegex);
    // ts://?tslid=e78bf5d0-4546-86a5-eb81d8da4a38&tsepath=05252023171513.pdf&tseid=398a089d1c02405e87ba96530b2f81ca
    // ts://?tslid=9ea06d80-a904-8161-112c2266c152&tsepath=20231122190210_%5Balteleipziger%5D%20copy%202.pdf&tseid=ff013ed261dc433ca0b83d69f462d765
    // ts://?tslid=1f915e7fd93a4527e4396e1dcab2e&tsdpath=contacts&tseid=2df0135aa2cd4e01a804b60d70ac39eb
    tsUrls?.forEach((tsUrl) => {
      if (tsUrl?.length > 5) {
        try {
          const validUrl = new URL(tsUrl);
          const link = {};
          link.type = "tslink";
          link.href = validUrl.href;
          // const tseid = validUrl.searchParams.get("tseid");
          // if (tseid) {
          //   link.tseid = tseid;
          // }
          // skip duplicates
          if (!links.some((item) => item.href === link.href)) {
            links.push(link);
          }
        } catch {
          console.log("invalid tslink: " + tsUrl);
        }
      }
    });
  } catch (e) {
    console.error("Extracting TSlinks failed with: " + e);
  }
  return links;
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

function extractTxtContentAndLinks(eentry, fileContent, extractLinks = false) {
  const fileName = eentry.name.toLowerCase();

  if (!eentry.isFile && eentry.meta?.description && extractLinks) {
    setEntryLinks(eentry, eentry.meta?.description);
  } else if (
    fileName.endsWith(".txt") ||
    fileName.endsWith(".md") ||
    fileName.endsWith(".htm") ||
    fileName.endsWith(".html") ||
    // fileName.endsWith(".mhtml") || // mhtml extraction disable due to heavy parsing
    fileName.endsWith(".website") ||
    fileName.endsWith(".url")
  ) {
    try {
      //let textContent = await fs.readFile(eentry.path, "utf8");
      let textContent = "";
      if (fileContent) {
        // console.log("Extracting content from: " + eentry.path);
        try {
          // remove all dataurls
          textContent = fileContent.replace(/data:[^ \t\r\n]+/g, "");
        } catch (e) {
          console.error(
            "Error removing data urls: " + fileName + " with: " + e
          );
        }
        if (fileName.endsWith(".htm") || fileName.endsWith(".html")) {
          // Extracting the body tag
          // const bodyRegex = /\<body[^>]*\>([^]*)\<\/body/m;
          const bodyRegex = /<body[^>]*>([\s\S]*?)<\/body>/i;
          try {
            textContent = fileContent.match(bodyRegex)[0].trim();
          } catch (e) {
            console.error(
              "Error parsing the body of the HTML document: " +
                fileName +
                " with: " +
                e
            );
          }
        } else if (fileName.endsWith(".mhtml")) {
          //TODO handling of = at line end unclear
          const sourceURLRegex =
            /(?<=Snapshot-Content-Location:\s)(https?:\/\/[^\s]+)/;
          const bodyRegex = /<body[^>]*>([\s\S]*?)<\/body>/i;
          try {
            const sourceUrl = fileContent.match(sourceURLRegex)[0].trim();
            // const bodyContent = textContent.match(bodyRegex)[0];
            // console.log("Body: " + bodyContent);
            // const oneLineContent = bodyContent
            //   .split("\n")
            //   .map((line) => (line.endsWith("=") ? line.slice(0, -1) : line))
            //   .join("");
            // console.log("One line: " + oneLineContent);
            // textContent =
            //   sourceUrl + "\n" + oneLineContent.split("=3D").join("=");
            textContent = sourceUrl;
          } catch (e) {
            console.error(
              "Error parsing the body of the MHTML document: " +
                fileName +
                " with: " +
                e
            );
          }
        }
        eentry.textContent = extractTextContent(fileName, textContent);
        if (extractLinks) {
          setEntryLinks(eentry, textContent);
        }
      }
    } catch (error) {
      console.error(`Error reading file at ${eentry.path}:`, error);
    }
  }
}

function setEntryLinks(entry, textContent) {
  // console.log(
  //   "Ext. links for " + entry.path + " content: " + textContent.substr(0, 200)
  // );
  const links = extractLinks(textContent);
  // console.log("Extracted links: " + JSON.stringify(links));
  if (links && links.length > 0) {
    if (entry.links && entry.links.length > 0) {
      // console.log("Entry links already avail");
      const newLinks = links.filter(
        (link) => !entry.links.some((item) => item.href === link.href)
      );
      entry.links = [...entry.links, ...newLinks];
    } else {
      // console.log("Entry links not avail");
      entry.links = links;
    }
  }
  console.log(
    "Entry links for " + entry.path + "\n" + JSON.stringify(entry.links)
  );
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
    (q) => !q.startsWith("+") && !q.startsWith("-") && !q.startsWith("|")
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
      "Expected ArrayBuffer, TypedArray, or Buffer, but got " + data
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
    `Unsupported data type: ${Object.prototype.toString.call(data)}`
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
 * @param date: string | number
 * @param includeTime: boolean
 * @returns {string}
 */
function formatDateTime(date, includeTime) {
  if (date === undefined || date === "") {
    return "";
  }
  const d = new Date(date);
  let cDate = "" + d.getDate();
  cDate += "";
  if (cDate.length === 1) {
    cDate = "0" + cDate;
  }
  let cMonth = "" + (d.getMonth() + 1);
  cMonth += "";
  if (cMonth.length === 1) {
    cMonth = "0" + cMonth;
  }
  const cYear = "" + d.getFullYear();
  let cHour = "" + d.getHours();
  cHour += "";
  if (cHour.length === 1) {
    cHour = "0" + cHour;
  }
  let cMinute = "" + d.getMinutes();
  cMinute += "";
  if (cMinute.length === 1) {
    cMinute = "0" + cMinute;
  }
  let cSecond = "" + d.getSeconds();
  cSecond += "";
  if (cSecond.length === 1) {
    cSecond = "0" + cSecond;
  }
  let time = "";
  if (includeTime) {
    time = " - " + cHour + ":" + cMinute + ":" + cSecond;
  }
  return cYear + "-" + cMonth + "-" + cDate + time;
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
  let cDate = "" + d.getDate();
  cDate += "";
  if (cDate.length === 1) {
    cDate = "0" + cDate;
  }
  let cMonth = "" + (d.getMonth() + 1);
  cMonth += "";
  if (cMonth.length === 1) {
    cMonth = "0" + cMonth;
  }
  const cYear = d.getFullYear();
  let time = "";
  if (includeTime) {
    let cHour = "" + d.getHours();
    cHour += "";
    if (cHour.length === 1) {
      cHour = "0" + cHour;
    }
    let cMinute = "" + d.getMinutes();
    cMinute += "";
    if (cMinute.length === 1) {
      cMinute = "0" + cMinute;
    }
    let cSecond = "" + d.getSeconds();
    cSecond += "";
    if (cSecond.length === 1) {
      cSecond = "0" + cSecond;
    }
    time = "T" + cHour + "" + cMinute + "" + cSecond;
  }
  let milliseconds = "";
  if (includeMS) {
    milliseconds = "." + d.getMilliseconds();
  }
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
        dateString.substring(6, 8)
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
  switch (criteria) {
    case "byName":
      copyData.sort(sortByName);
      if (!order) {
        copyData.reverse();
      }
      return copyData; //data.sort((a, b) => -1 * sortByName(a, b));
    case "byFileSize":
      if (order) {
        return copyData.sort(sortBySize);
      }
      return copyData.sort((a, b) => -1 * sortBySize(a, b));
    case "byDateModified":
      if (order) {
        return copyData.sort(sortByDateModified);
      }
      return copyData.sort((a, b) => -1 * sortByDateModified(a, b));
    case "byExtension":
      if (order) {
        return copyData.sort(sortByExtension);
      }
      return copyData.sort((a, b) => -1 * sortByExtension(a, b));
    case "byFirstTag":
      if (order) {
        return copyData.sort(sortByFirstTag);
      }
      return copyData.sort((a, b) => -1 * sortByFirstTag(a, b));
    case "random":
      return shuffleArray(copyData);
    default:
      return copyData.sort(sortByName);
  }
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
const filterByUnique = (items, key) =>
  items.reduce((accumulator, item) => {
    const itemProp = extractNestedProp(item, key);
    const isDuplicate =
      accumulator.filter((filteredItem) => {
        const prop = extractNestedProp(filteredItem, key);
        return prop === itemProp;
      }).length > 0;

    if (isDuplicate) {
      return accumulator;
    }

    const modifiedItem = extend({}, item);
    accumulator.push(modifiedItem);
    return accumulator;
  }, []);

/**
 * @description Filter by duplicate
 * @param items
 * @param key
 * @param duplicateLength
 * @returns {*}
 */
const filterByDuplicate = (items, key, duplicateLength = 2) =>
  items.filter((item) => {
    const itemProp = extractNestedProp(item, key);
    const duplicatesCount = duplicateLength - 1;
    return (
      items.filter((innerItem) => {
        const prop = extractNestedProp(innerItem, key);
        return prop === itemProp;
      }).length > duplicatesCount
    );
  });

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
