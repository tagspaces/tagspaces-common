/**
 * TagSpaces - universal file and folder organizer
 * Copyright (C) 2017-present TagSpaces UG (haftungsbeschraenkt)
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License (version 3) as
 * published by the Free Software Foundation.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 *
 */

const AppConfig = require("./AppConfig");

function getMetaDirectoryPath(directoryPath, dirSeparator = "/") {
  if (!directoryPath) {
    return AppConfig.metaFolder;
  }
  if (directoryPath.endsWith(AppConfig.metaFolder + dirSeparator)) {
    return directoryPath;
  }
  return normalizePath(directoryPath) + dirSeparator + AppConfig.metaFolder;
}

/**
 *
 * @param path -> root//subFolder/
 * @returns {string} -> root/subFolder
 */
function normalizePath(path) {
  if (!path) return "";
  return cleanTrailingDirSeparator(path.replace(/\/\//g, "/"));
}

function extractContainingDirectoryPath(filePath, dirSeparator = "/") {
  if (filePath.indexOf(dirSeparator) === -1) {
    return dirSeparator;
  }
  return filePath.substring(0, filePath.lastIndexOf(dirSeparator));
}

function extractParentDirectoryPath(dirPath, dirSeparator = "/") {
  if (!dirPath) return;
  let path = dirPath;
  if (path.endsWith(dirSeparator)) {
    path = path.substring(0, path.lastIndexOf(dirSeparator));
  }
  const lastIndex = path.lastIndexOf(dirSeparator);
  if (lastIndex !== -1) {
    return path.substring(0, lastIndex);
  }
  // return root dir in cases that dirPath not start with dirSeparator (AWS)
  return "";
}

function cleanTrailingDirSeparator(dirPath) {
  if (dirPath) {
    if (dirPath.lastIndexOf("\\") === dirPath.length - 1) {
      return dirPath.substring(0, dirPath.length - 1);
    }
    if (dirPath.lastIndexOf("/") === dirPath.length - 1) {
      return dirPath.substring(0, dirPath.length - 1);
    }
    return dirPath;
  }
  // console.log('Directory Path ' + dirPath + ' undefined');
  return "";
}

function extractFileName(filePath, dirSeparator = "/") {
  return filePath
    ? filePath.substring(
        filePath.lastIndexOf(dirSeparator) + 1,
        filePath.length
      )
    : filePath;
}

function extractDirectoryName(dirPath, dirSeparator = "/") {
  if (!dirPath) return "";
  let directoryName = dirPath;
  if (dirPath.indexOf(dirSeparator) !== -1) {
    if (dirPath.endsWith(dirSeparator)) {
      directoryName = directoryName.substring(
        0,
        dirPath.lastIndexOf(dirSeparator)
      );
    }
    const lastDirSeparator = directoryName.lastIndexOf(dirSeparator);
    if (lastDirSeparator !== -1) {
      directoryName = directoryName.substring(
        lastDirSeparator + 1,
        directoryName.length
      );
    }
  }
  return directoryName;
}

function extractFileExtension(filePath, dirSeparator = "/") {
  const lastindexDirSeparator = filePath.lastIndexOf(dirSeparator);
  const lastIndexEndTagContainer = filePath.lastIndexOf(
    AppConfig.endTagContainer
  );
  const lastindexDot = filePath.lastIndexOf(".");
  if (lastindexDot < 0) {
    return "";
  }
  if (lastindexDot < lastindexDirSeparator) {
    // case: "../remote.php/webdav/somefilename"
    return "";
  }
  if (lastindexDot < lastIndexEndTagContainer) {
    // case: "[20120125 89.4kg 19.5% 60.5% 39.8% 2.6kg]"
    return "";
  }
  let extension = filePath
    .substring(lastindexDot + 1, filePath.length)
    .toLowerCase()
    .trim();
  const lastindexQuestionMark = extension.lastIndexOf("?");
  if (lastindexQuestionMark > 0) {
    // Removing everything after ? in URLs .png?queryParam1=2342
    extension = extension.substring(0, lastindexQuestionMark);
  }
  return extension;
}

function getMetaFileLocationForFile(entryPath, dirSeparator = "/") {
  const containingFolder = extractContainingDirectoryPath(
    entryPath,
    dirSeparator
  );
  const metaFolder = getMetaDirectoryPath(containingFolder, dirSeparator);
  return (
    metaFolder +
    dirSeparator +
    extractFileName(entryPath, dirSeparator) +
    AppConfig.metaFileExt
  );
}

function getMetaFileLocationForDir(
  entryPath,
  dirSeparator = "/", // = AppConfig.dirSeparator
  metaFile = AppConfig.metaFolderFile
) {
  const metaFolder = getMetaDirectoryPath(entryPath, dirSeparator);
  return metaFolder + dirSeparator + metaFile;
}

function getThumbFileLocationForFile(
  entryPath,
  dirSeparator = "/",
  encoded = true
) {
  if (entryPath.indexOf(dirSeparator + AppConfig.metaFolder) > -1) {
    // entryPath is in .ts folder - no thumb file location exist
    return undefined;
  }
  const containingFolder = extractContainingDirectoryPath(
    entryPath,
    dirSeparator
  );
  const mFolder = getMetaDirectoryPath(containingFolder, dirSeparator);
  const fileName = extractFileName(entryPath, dirSeparator);
  return (
    mFolder +
    dirSeparator +
    (encoded
      ? encodeURIComponent(fileName).replace(/%5B/g, "[").replace(/%5D/g, "]")
      : fileName) +
    AppConfig.thumbFileExt
  );
}

function getThumbFileLocationForDirectory(entryPath, dirSeparator = "/") {
  return (
    entryPath +
    (entryPath.endsWith(dirSeparator) ? "" : dirSeparator) +
    AppConfig.metaFolder +
    dirSeparator +
    AppConfig.folderThumbFile
  );
}

function extractTagsAsObjects(filePath, tagDelimiter, dirSeparator = "/") {
  const tagsInFileName = extractTags(filePath, tagDelimiter, dirSeparator);
  const tagArray = [];
  tagsInFileName.map((tag) => {
    tagArray.push({
      title: "" + tag,
      // type: "plain",
    });
    return true;
  });
  return tagArray;
}

function extractTags(filePath, tagDelimiter, dirSeparator = "/") {
  // console.log('Extracting tags from: ' + filePath);
  const fileName = extractFileName(filePath, dirSeparator);
  // WithoutExt
  let tags = [];
  const beginTagContainer = fileName.indexOf(AppConfig.beginTagContainer);
  const endTagContainer = fileName.indexOf(AppConfig.endTagContainer);
  if (
    beginTagContainer < 0 ||
    endTagContainer < 0 ||
    beginTagContainer >= endTagContainer
  ) {
    // console.log('Filename does not contains tags. Aborting extraction.');
    return tags;
  }
  const cleanedTags = [];
  const tagContainer = fileName
    .slice(beginTagContainer + 1, endTagContainer)
    .trim();
  tags = tagContainer.split(tagDelimiter);
  for (let i = 0; i < tags.length; i += 1) {
    // Min tag length set to 1 character
    if (tags[i].trim().length > 0) {
      cleanedTags.push(tags[i]);
    }
  }
  return cleanedTags;
}

module.exports = {
  normalizePath,
  cleanTrailingDirSeparator,
  getMetaDirectoryPath,
  extractContainingDirectoryPath,
  extractParentDirectoryPath,
  getThumbFileLocationForFile,
  getThumbFileLocationForDirectory,
  getMetaFileLocationForFile,
  getMetaFileLocationForDir,
  extractFileName,
  extractDirectoryName,
  extractFileExtension,
  extractTagsAsObjects,
};
