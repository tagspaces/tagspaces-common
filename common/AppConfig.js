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

export {
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
};
