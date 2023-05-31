// require('dotenv').config({path: __dirname + '/default.env', override: false, debug: true });
let metaFolder = ".ts";
let metaFolderFile = "tsm.json";
let folderLocationsFile = "tsl.json";
let folderIndexFile = "tsi.json";
let folderThumbFile = "tst.jpg";
let folderBgndFile = "tsb.jpg";
let metaFileExt = ".json";
let thumbFileExt = ".jpg";
let thumbType = "image/jpeg";
let contentFileExt = ".txt";
let beginTagContainer = "[";
let endTagContainer = "]";
let tagDelimiter = " ";
let prefixTagContainer = "";
let maxCollectedTag = 500;
let maxThumbSize = 400;
let maxBgndSize = 3840;
let thumbBgColor = "#FFFFFF";
let indexerLimit = 200000;
let mainToolbarHeight = 105;
let maxIndexAge = 600000; // 10 minutes
let defaultFileColor = "#808080";
let defaultFolderColor = "#582727"; // # 555 transparent #FDEEBD #ff791b #2c001e #880e4f
let tsProtocol = "ts://";

if (typeof process !== "undefined") {
  if (process.env.tsProtocol) tsProtocol = process.env.tsProtocol;
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
  if (process.env.defaultFileColor)
    defaultFileColor = process.env.defaultFileColor;
  if (process.env.defaultFolderColor)
    defaultFolderColor = process.env.defaultFolderColor;
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
  !document.URL.startsWith("http://localhost:1212/");
const isFirefox =
  typeof navigator !== "undefined" &&
  navigator.userAgent.toLowerCase().includes("firefox"); // typeof InstallTrigger !== 'undefined';
const isWin =
  (typeof navigator !== "undefined" && navigator.appVersion.includes("Win")) ||
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
const isCordovaiOS =
  typeof window !== "undefined" &&
  /^file:\/{3}[^\/]/i.test(window.location.href) &&
  /ios|iphone|ipod|ipad/i.test(navigator.userAgent);
const isCordovaAndroid =
  typeof document !== "undefined" &&
  document.URL.indexOf("file:///android_asset") === 0;
const isCordova = isCordovaiOS || isCordovaAndroid;
const iOSMatcher =
  typeof navigator !== "undefined" &&
  navigator.userAgent.match(/(iPad|iPhone|iPod)/i);
const isIOS = iOSMatcher && iOSMatcher.length > 0;
const isAndroid =
  typeof navigator !== "undefined" &&
  navigator.userAgent.toLowerCase().includes("android");
const isMobile = isCordovaiOS || isCordovaAndroid || isIOS || isAndroid;
const isAmplify =
  typeof window !== "undefined" && window.ExtIsAmplify !== undefined
    ? window.ExtIsAmplify
    : false;
const saveLocationsInBrowser =
  typeof window !== "undefined" &&
  window.ExtSaveLocationsInBrowser !== undefined
    ? window.ExtSaveLocationsInBrowser
    : false;

const useSidecarsForFileTagging =
  typeof window !== "undefined" &&
  (window.ExtUseSidecarsForFileTagging !== undefined
    ? window.ExtUseSidecarsForFileTagging
    : false);
const useSidecarsForFileTaggingDisableSetting =
  typeof window !== "undefined" &&
  window.ExtUseSidecarsForFileTagging !== undefined;
const useGenerateThumbnails =
  typeof window !== "undefined" && window.ExtUseGenerateThumbnails;
const geoTaggingFormat =
  typeof window !== "undefined" &&
  window.ExtGeoTaggingFormat &&
  window.ExtGeoTaggingFormat.toLocaleLowerCase();
const customLogo =
  typeof window !== "undefined" && (window.ExtLogoURL || false);
const showAdvancedSearch =
  typeof window !== "undefined" &&
  (window.ExtShowAdvancedSearch !== undefined
    ? window.ExtShowAdvancedSearch
    : true);
const showSmartTags =
  typeof window !== "undefined" &&
  (window.ExtShowSmartTags !== undefined ? window.ExtShowSmartTags : true);
const showWelcomePanel =
  typeof window !== "undefined" &&
  (window.ExtShowWelcomePanel !== undefined
    ? window.ExtShowWelcomePanel
    : true);
const locationsReadOnly =
  typeof window !== "undefined" && window.ExtLocations !== undefined;
const mapTileServers =
  typeof window !== "undefined" && (window.ExtMapTileServers || false);
const lightThemeLightColor =
  typeof window !== "undefined" &&
  (window.ExtLightThemeLightColor || "#dcf3ec");
const lightThemeMainColor =
  typeof window !== "undefined" && (window.ExtLightThemeMainColor || "#1dd19f");
const darkThemeLightColor =
  typeof window !== "undefined" && (window.ExtDarkThemeLightColor || "#56454e");
const darkThemeMainColor =
  typeof window !== "undefined" && (window.ExtDarkThemeMainColor || "#ff9abe");
const FileTypeGroups = {
  any: [""],
  images: [
    "jpg",
    "jpeg",
    "jif",
    "jiff",
    "png",
    "gif",
    "svg",
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
    "nef",
  ],
  notes: ["md", "mdown", "txt", "html"],
  documents: [
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
  audio: ["ogg", "mp3", "wav", "wave", "flac", "acc"],
  video: ["ogv", "mp4", "webm", "m4v", "mkv", "avi", "3gp", "3g2"],
  archives: ["zip", "rar", "gz", "tgz", "arc", "7z"],
  bookmarks: ["url", "lnk", "sym", "desktop", "website"],
  ebooks: ["epub", "mobi", "azw", "prc", "azw1", "azw3", "azw4", "azw8", "azk"],
  folders: ["folders"],
  files: ["files"],
  untagged: ["untagged"],
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
    "ico",
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
  thumbFileExt,
  thumbType,
  contentFileExt,
  beginTagContainer,
  endTagContainer,
  tagDelimiter,
  prefixTagContainer,
  maxCollectedTag,
  maxThumbSize,
  maxBgndSize,
  thumbBgColor,
  indexerLimit,
  mainToolbarHeight,
  maxIndexAge,
  defaultFileColor,
  defaultFolderColor,
  isElectron,
  isFirefox,
  isWin,
  isLinux,
  isMacLike,
  isMac,
  dirSeparator,
  isCordovaiOS,
  isCordovaAndroid,
  isCordova,
  isIOS,
  isAndroid,
  isWeb,
  isMobile,
  isAmplify,
  saveLocationsInBrowser,
  useSidecarsForFileTagging,
  useSidecarsForFileTaggingDisableSetting,
  useGenerateThumbnails,
  geoTaggingFormat,
  customLogo,
  showAdvancedSearch,
  showSmartTags,
  showWelcomePanel,
  locationsReadOnly,
  mapTileServers,
  lightThemeLightColor,
  lightThemeMainColor,
  darkThemeLightColor,
  darkThemeMainColor,
  tsProtocol,
  FileTypeGroups,
  ThumbGenSupportedFileTypes,
};
