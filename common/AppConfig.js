// require('dotenv').config({path: __dirname + '/default.env', override: false, debug: true });
const metaFolder = process.env.metaFolder || ".ts";
const metaFolderFile = process.env.metaFolderFile || "tsm.json";
const folderLocationsFile = process.env.folderLocationsFile || "tsl.json";
const folderIndexFile = process.env.folderIndexFile || "tsi.json";
const folderThumbFile = process.env.folderThumbFile || "tst.jpg";
const metaFileExt = process.env.metaFileExt || ".json";
const thumbFileExt = process.env.thumbFileExt || ".jpg";
const thumbType = process.env.thumbType || "image/jpeg";
const contentFileExt = process.env.contentFileExt || ".txt";
const beginTagContainer = process.env.beginTagContainer || "[";
const endTagContainer = process.env.endTagContainer || "]";
const tagDelimiter = process.env.tagDelimiter || " ";
const prefixTagContainer = process.env.prefixTagContainer || "";
const maxCollectedTag = parseInt(process.env.maxCollectedTag || 500);
const maxThumbSize = parseInt(process.env.maxThumbSize || 400);
const thumbBgColor = process.env.thumbBgColor || "#FFFFFF";
const indexerLimit = parseInt(process.env.indexerLimit || 200000);
const mainToolbarHeight = parseInt(process.env.mainToolbarHeight || 105);
const maxIndexAge = parseInt(process.env.maxIndexAge || 600000); // 10 minutes
const defaultFileColor = process.env.defaultFileColor || "#808080";
const defaultFolderColor = process.env.defaultFolderColor || "#582727"; // 555 transparent #FDEEBD #ff791b #2c001e #880e4f
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
  (process &&
    (process.platform === "win32" ||
      /^(msys|cygwin)$/.test(process.env.OSTYPE)));
const isLinux =
  typeof navigator !== "undefined" &&
  navigator.userAgent.toLowerCase().includes("linux");
const isMacLike =
  typeof navigator !== "undefined" &&
  navigator.userAgent.match(/(Mac|iPhone|iPod|iPad)/i);
const isMac = process && process.platform === "darwin";
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

module.exports = {
  metaFolder,
  metaFolderFile,
  folderLocationsFile,
  folderIndexFile,
  folderThumbFile,
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
};
