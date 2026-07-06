/**
The MIT License (MIT)
Copyright (c) 2021-present TagSpaces Authors

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

let metaFolder = ".ts";
let metaFolderFile = "tsm.json";
let folderLocationsFile = "tsl.json";
let folderIndexFile = "tsi.json";
let folderThumbFile = "tst.jpg";
let folderBgndFile = "tsb.jpg";
let metaFileExt = ".json";
// Globally ignored during listing/indexing: macOS AppleDouble resource-fork
// files (._*) and Finder metadata (.DS_Store). Merged into every location's
// ignorePatterns in listDirectoryPromise.
let defaultIgnorePatterns = ["._*", ".DS_Store"];
let thumbFileExt = ".jpg";
let thumbType = "image/jpeg";
let contentFileExt = ".txt";
let beginTagContainer = "[";
let endTagContainer = "]";
let tagDelimiter = " ";
let prefixTagContainer = "";
let maxCollectedTag = 500;
let maxJSONSize = 100 * 1024 * 1024; // 100MB cap for loadJSONString DoS guard
let maxThumbSize = 500;
let maxBgndSize = 3840;
let thumbBgColor = "#FFFFFF";
let indexerLimit = 200000;
let mainToolbarHeight = 105;
let maxIndexAge = 600000; // 10 minutes
let maxThumbGenTime = 6000; // 6 sec
let defaultFileColor = "#808080";
let defaultFolderColor = "#582727"; // # 555 transparent #FDEEBD #ff791b #2c001e #880e4f
let tsProtocol = "ts://";
let mediaProtocol = "tsfile";

if (typeof process !== "undefined") {
  if (process.env.tsProtocol) tsProtocol = process.env.tsProtocol;
  if (process.env.mediaProtocol) mediaProtocol = process.env.mediaProtocol;
  if (process.env.metaFolder) metaFolder = process.env.metaFolder;
  if (process.env.metaFolderFile) metaFolderFile = process.env.metaFolderFile;
  if (process.env.folderLocationsFile)
    folderLocationsFile = process.env.folderLocationsFile;
  if (process.env.folderIndexFile)
    folderIndexFile = process.env.folderIndexFile;
  if (process.env.folderThumbFile)
    folderThumbFile = process.env.folderThumbFile;
  if (process.env.folderBgndFile) folderBgndFile = process.env.folderBgndFile;
  if (process.env.metaFileExt) metaFileExt = process.env.metaFileExt;
  if (process.env.thumbFileExt) thumbFileExt = process.env.thumbFileExt;
  if (process.env.thumbType) thumbType = process.env.thumbType;
  if (process.env.contentFileExt) contentFileExt = process.env.contentFileExt;
  if (process.env.beginTagContainer)
    beginTagContainer = process.env.beginTagContainer;
  if (process.env.endTagContainer)
    endTagContainer = process.env.endTagContainer;
  if (process.env.tagDelimiter) tagDelimiter = process.env.tagDelimiter;
  if (process.env.prefixTagContainer)
    prefixTagContainer = process.env.prefixTagContainer;
  if (process.env.maxCollectedTag)
    maxCollectedTag = parseInt(process.env.maxCollectedTag);
  if (process.env.maxThumbSize)
    maxThumbSize = parseInt(process.env.maxThumbSize);
  if (process.env.maxBgndSize) maxBgndSize = parseInt(process.env.maxBgndSize);
  if (process.env.thumbBgColor) thumbBgColor = process.env.thumbBgColor;
  if (process.env.indexerLimit)
    indexerLimit = parseInt(process.env.indexerLimit);
  if (process.env.mainToolbarHeight)
    mainToolbarHeight = parseInt(process.env.mainToolbarHeight);
  if (process.env.maxIndexAge) maxIndexAge = parseInt(process.env.maxIndexAge);
  if (process.env.maxThumbGenTime)
    maxThumbGenTime = parseInt(process.env.maxThumbGenTime);
  if (process.env.defaultFileColor)
    defaultFileColor = process.env.defaultFileColor;
  if (process.env.defaultFolderColor)
    defaultFolderColor = process.env.defaultFolderColor;
  if (process.env.folderFullTextFile)
    folderFullTextFile = process.env.folderFullTextFile;
}

const isElectron =
  typeof navigator !== "undefined" &&
  navigator.userAgent.toLowerCase().includes(" electron/");
const isNode =
  typeof process !== "undefined" &&
  process.versions != null &&
  process.versions.node != null;
const isJsDom =
  (typeof window !== "undefined" && window.name === "nodejs") ||
  (typeof navigator !== "undefined" &&
    (navigator.userAgent.includes("Node.js") ||
      navigator.userAgent.includes("jsdom")));
const isWeb =
  !isJsDom &&
  typeof document !== "undefined" &&
  document.URL.startsWith("http") &&
  !document.URL.startsWith("http://localhost:1212/") &&
  // Capacitor Android uses androidScheme: 'https' (document.URL is
  // https://localhost/...), which would otherwise misclassify the native
  // app as a web build and hide the Local location type, force S3 defaults,
  // etc. iOS Capacitor uses capacitor:// so it's already excluded above.
  !(typeof window !== "undefined" &&
    window.Capacitor !== undefined &&
    typeof window.Capacitor.isNativePlatform === "function" &&
    window.Capacitor.isNativePlatform());
const isFirefox =
  typeof navigator !== "undefined" &&
  navigator.userAgent.toLowerCase().includes("firefox"); // typeof InstallTrigger !== 'undefined';
const isWin =
  (typeof navigator !== "undefined" && navigator.userAgent.includes("Win")) ||
  (typeof process !== "undefined" &&
    (process.platform === "win32" ||
      /^(msys|cygwin)$/.test(process.env.OSTYPE)));
const isLinux =
  typeof navigator !== "undefined" &&
  navigator.userAgent.toLowerCase().includes("linux");
const isMacLike =
  typeof navigator !== "undefined" &&
  navigator.userAgent.match(/(Mac|iPhone|iPod|iPad)/i);
const isMac = typeof process !== "undefined" && process.platform === "darwin";
const dirSeparator = isWin && !isWeb ? "\\" : "/";
const isCapacitor =
  typeof window !== "undefined" &&
  window.Capacitor !== undefined &&
  typeof window.Capacitor.isNativePlatform === "function" &&
  window.Capacitor.isNativePlatform();
const isCapacitorAndroid =
  isCapacitor &&
  typeof window !== "undefined" &&
  window.Capacitor.getPlatform() === "android";
const isCapacitoriOS =
  isCapacitor &&
  typeof window !== "undefined" &&
  window.Capacitor.getPlatform() === "ios";
const isNativeMobile = isCapacitor;
const iOSMatcher =
  typeof navigator !== "undefined" &&
  navigator.userAgent.match(/(iPad|iPhone|iPod)/i);
const isIOS = iOSMatcher && iOSMatcher.length > 0;
const isAndroid =
  typeof navigator !== "undefined" &&
  navigator.userAgent.toLowerCase().includes("android");
const isMobile = isCapacitor || isIOS || isAndroid;

let folderFullTextFile = "tsft.jsonl";

const SearchTypes = {
  any: "any",
  images: "images",
  notes: "notes",
  documents: "documents",
  audio: "audio",
  video: "video",
  archives: "archives",
  bookmarks: "bookmarks",
  ebooks: "ebooks",
  emails: "emails",
  folders: "folders",
  files: "files",
  untagged: "untagged",
};

const SearchSizes = {
  empty: { key: "sizeEmpty", thresholdBytes: 0 },
  tiny: { key: "sizeTiny", thresholdBytes: 10 * 1024 },
  verySmall: { key: "sizeVerySmall", thresholdBytes: 100 * 1024 },
  small: { key: "sizeSmall", thresholdBytes: 1024 * 1024 },
  medium: { key: "sizeMedium", thresholdBytes: 100 * 1024 * 1024 },
  large: { key: "sizeLarge", thresholdBytes: 1024 * 1024 * 1024 },
  huge: { key: "sizeHuge", thresholdBytes: 1024 * 1024 * 1024 },
};

const SearchTimePeriods = {
  today: { key: "today", periodSpan: 86400000 },
  yesterday: { key: "yesterday", periodSpan: 172800000 },
  past7Days: { key: "past7Days", periodSpan: 604800000 },
  past30Days: { key: "past30Days", periodSpan: 2592000000 },
  past6Months: { key: "past6Months", periodSpan: 15778476000 },
  pastYear: { key: "pastYear", periodSpan: 31556952000 },
  moreThanYear: { key: "moreThanYear", periodSpan: 31556952001 },
};

const SearchTypeGroups = {
  [SearchTypes.any]: [""],
  [SearchTypes.images]: [
    "jpg",
    "jpeg",
    "jfif",
    "jif",
    "jiff",
    "png",
    "gif",
    "svg",
    "heic",
    "webp",
    "bmp",
    "tga",
    "tif",
    "tiff",
    "nef",
    "cr2",
    "dng",
    "psd",
    "avif",
  ],
  [SearchTypes.notes]: ["md", "mdown", "txt", "html", "mdx"],
  [SearchTypes.documents]: [
    "pdf",
    "doc",
    "docx",
    "xls",
    "xlsx",
    "odt",
    "ods",
    "odp",
    "pptx",
    "numbers",
    "potx",
    "sldx",
    "dotx",
  ],
  [SearchTypes.audio]: [
    "ogg",
    "mp3",
    "wav",
    "wave",
    "flac",
    "acc",
    "m4a",
    "m4b",
    "m4p",
    "opus",
    "aiff",
    "speex",
    "wma",
  ],
  [SearchTypes.video]: [
    "ogv",
    "mp4",
    "webm",
    "m4v",
    "mkv",
    "avi",
    "3gp",
    "3g2",
    "mov",
  ],
  [SearchTypes.archives]: ["zip", "rar", "gz", "tgz", "arc", "7z"],
  [SearchTypes.bookmarks]: ["url", "lnk", "sym", "desktop", "website"],
  [SearchTypes.ebooks]: [
    "epub",
    "mobi",
    "azw",
    "prc",
    "azw1",
    "azw3",
    "azw4",
    "azw8",
    "azk",
  ],
  [SearchTypes.emails]: ["eml", "msg"],
  [SearchTypes.folders]: ["folders"],
  [SearchTypes.files]: ["files"],
  [SearchTypes.untagged]: ["untagged"],
};

const ThumbGenSupportedFileTypes = {
  image: [
    "jpg",
    "jpeg",
    "jif",
    "jfif",
    "png",
    "gif",
    "svg",
    "tif",
    "tiff",
    // "ico",
    "webp",
    // 'psd', // Unable to resize  due to an error:  [Error: Input buffer contains unsupported image format]
    "avif",
  ],
  video: ["ogv", "mp4", "webm", "m4v", "mkv", "lrv", "3gp"],
  text: [
    "txt",
    // 'md',
    "coffee",
    "c",
    "cpp",
    "css",
    "groovy",
    "haxe",
    "xml",
    "java",
    "js",
    "json",
    "less",
    // 'markdown',
    // 'mdown',
    "php",
    "pl",
    "py",
    "rb",
    "ini",
    "sh",
    "sql",
    // 'mhtml'
  ],
  containers: [
    "zip",
    "pages",
    "key",
    "numbers",
    "epub",
    "docx",
    "pptx",
    "pptm",
    "potx",
    "potm",
    "ppxs",
    "ppsm",
    "sldx",
    "sldm",
    "dotx",
    "dotm",
    "xlsx",
    "xlsm",
    "xlst",
    "odp",
    "odg",
    "ods",
    "odt",
    "pdf",
  ],
};

module.exports = {
  metaFolder,
  metaFolderFile,
  folderLocationsFile,
  folderIndexFile,
  folderThumbFile,
  folderBgndFile,
  metaFileExt,
  defaultIgnorePatterns,
  thumbFileExt,
  thumbType,
  contentFileExt,
  beginTagContainer,
  endTagContainer,
  tagDelimiter,
  prefixTagContainer,
  maxCollectedTag,
  maxJSONSize,
  maxThumbSize,
  maxBgndSize,
  thumbBgColor,
  indexerLimit,
  mainToolbarHeight,
  maxIndexAge,
  maxThumbGenTime,
  defaultFileColor,
  defaultFolderColor,
  isElectron,
  isNode,
  isFirefox,
  isWin,
  isLinux,
  isMacLike,
  isMac,
  dirSeparator,
  isCapacitor,
  isCapacitorAndroid,
  isCapacitoriOS,
  isNativeMobile,
  isIOS,
  isAndroid,
  isWeb,
  isMobile,
  tsProtocol,
  mediaProtocol,
  folderFullTextFile,
  SearchTypes,
  SearchSizes,
  SearchTimePeriods,
  SearchTypeGroups,
  ThumbGenSupportedFileTypes,
};
