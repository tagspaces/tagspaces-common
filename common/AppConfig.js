const metaFolder = ".ts";
const beginTagContainer = "[";
const endTagContainer = "]";
const tagDelimiter = " ";
const metaFileExt = ".json";
const thumbFileExt = ".jpg";
const folderThumbFile = "tst.jpg";
const folderIndexFile = "tsi.json";
const metaFolderFile = "tsm.json";
const dirSeparator = process.platform === "win32" ? "\\" : "/";
const isCordovaiOS =
  /^file:\/{3}[^\/]/i.test(window.location.href) &&
  /ios|iphone|ipod|ipad/i.test(navigator.userAgent);
const isCordovaAndroid = document.URL.indexOf("file:///android_asset") === 0;
const isCordova = isCordovaiOS || isCordovaAndroid;
const iOSMatcher = navigator.userAgent.match(/(iPad|iPhone|iPod)/i);
const isIOS = iOSMatcher && iOSMatcher.length > 0;
const isAndroid = navigator.userAgent.toLowerCase().includes("android");

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
  dirSeparator,
  isCordovaiOS,
  isCordovaAndroid,
  isCordova,
  isIOS,
  isAndroid,
};
