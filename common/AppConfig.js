const metaFolder = ".ts";
const beginTagContainer = "[";
const endTagContainer = "]";
const tagDelimiter = " ";
const metaFileExt = ".json";
const thumbFileExt = ".jpg";
const folderThumbFile = "tst.jpg";
const folderIndexFile = "tsi.json";
const metaFolderFile = "tsm.json";
const isWin =
  process &&
  (process.platform === "win32" || /^(msys|cygwin)$/.test(process.env.OSTYPE));
const isMac = process && process.platform === "darwin";
const dirSeparator = isWin ? "\\" : "/";
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

module.exports = {
  metaFolder,
  beginTagContainer,
  endTagContainer,
  tagDelimiter,
  metaFileExt,
  thumbFileExt,
  folderThumbFile,
  folderIndexFile,
  metaFolderFile,
  isWin,
  isMac,
  dirSeparator,
  isCordovaiOS,
  isCordovaAndroid,
  isCordova,
  isIOS,
  isAndroid,
};
