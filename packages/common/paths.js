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

/**
 * @param dirPath: string
 * @param dirSeparator: string
 * @returns {string}
 */
function baseName(
  dirPath,
  dirSeparator // = AppConfig.dirSeparator
) {
  const fileName = dirPath.substring(
    dirPath.lastIndexOf(dirSeparator) + 1,
    dirPath.length
  );
  return fileName || dirPath;
}

/**
 * @param filePath
 * @param dirSeparator
 * @returns {string}
 */
function extractFileExtension(filePath, dirSeparator = AppConfig.dirSeparator) {
  if (!filePath) {
    return "";
  }
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

/**
 * @param fileName: string
 * @param tags: string[]
 * @param tagDelimiter: string
 * @param dirSeparator: string = AppConfig.dirSeparator
 * @param prefixTagContainer: string = AppConfig.prefixTagContainer
 * @param filenameTagPlacedAtEnd: boolean = true
 * @returns {string}
 */
function generateFileName(
  fileName,
  tags,
  tagDelimiter,
  dirSeparator = AppConfig.dirSeparator,
  prefixTagContainer = AppConfig.prefixTagContainer,
  filenameTagPlacedAtEnd = true
) {
  function cleanFileName(fileName, prefixTagContainer) {
    if (prefixTagContainer && fileName.endsWith(prefixTagContainer)) {
      return fileName.slice(0, -prefixTagContainer.length);
    }
    return fileName.trim();
  }
  let tagsString = "";
  // Creating the string will all the tags by more that 0 tags
  if (tags && tags.length > 0) {
    tagsString = AppConfig.beginTagContainer;
    for (let i = 0; i < tags.length; i += 1) {
      if (i === tags.length - 1) {
        tagsString += tags[i].trim();
      } else {
        tagsString += tags[i].trim() + tagDelimiter;
      }
    }
    tagsString = tagsString.trim() + AppConfig.endTagContainer;
  }

  const fileExt = extractFileExtension(fileName, dirSeparator);
  // Assembling the new filename with the tags
  let newFileName = "";
  const beginTagContainer = fileName.indexOf(AppConfig.beginTagContainer);
  const endTagContainer = fileName.indexOf(AppConfig.endTagContainer);
  const lastDotPosition = fileName.lastIndexOf(".");
  if (
    beginTagContainer < 0 ||
    endTagContainer < 0 ||
    beginTagContainer >= endTagContainer
  ) {
    // Filename does not contains tags.
    if (lastDotPosition < 0) {
      // File does not have an extension
      newFileName = filenameTagPlacedAtEnd
        ? fileName.trim() + tagsString
        : tagsString + fileName.trim();
    } else {
      // File has an extension
      if (filenameTagPlacedAtEnd) {
        newFileName =
          cleanFileName(
            fileName.substring(0, lastDotPosition),
            prefixTagContainer
          ) +
          (tagsString ? prefixTagContainer + tagsString : "") +
          "." +
          fileExt;
      } else {
        newFileName =
          (tagsString ? tagsString + prefixTagContainer : "") +
          cleanFileName(
            fileName.substring(0, lastDotPosition),
            prefixTagContainer
          ) +
          "." +
          fileExt;
      }
    }
  } else {
    // File does not have an extension
    if (filenameTagPlacedAtEnd) {
      newFileName =
        cleanFileName(
          fileName.substring(0, beginTagContainer),
          prefixTagContainer
        ) +
        (tagsString ? prefixTagContainer + tagsString : "") +
        fileName.substring(endTagContainer + 1, fileName.length).trim();
    } else {
      newFileName =
        (tagsString ? tagsString + prefixTagContainer : "") +
        cleanFileName(
          fileName.substring(0, beginTagContainer),
          prefixTagContainer
        ) +
        fileName.substring(endTagContainer + 1, fileName.length).trim();
    }
  }
  if (newFileName.length < 1) {
    throw new Error("Generated filename is invalid");
  }
  // Removing double prefix todo rethink this ?? there is no double prefix
  newFileName = newFileName
    .split(prefixTagContainer + "" + prefixTagContainer)
    .join(prefixTagContainer);
  return newFileName;
}

function getMetaDirectoryPath(
  directoryPath,
  dirSeparator = AppConfig.dirSeparator
) {
  if (!directoryPath) {
    return AppConfig.metaFolder;
  }
  if (
    directoryPath.endsWith(AppConfig.metaFolder + dirSeparator) ||
    directoryPath.endsWith(dirSeparator + AppConfig.metaFolder)
  ) {
    return directoryPath;
  }
  return (
    (directoryPath ? normalizePath(directoryPath) + dirSeparator : "") +
    AppConfig.metaFolder
  );
}

function getMetaFileLocationForFile(
  entryPath,
  dirSeparator = AppConfig.dirSeparator
) {
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

function getMetaContentFileLocation(
  entryPath,
  dirSeparator = AppConfig.dirSeparator
) {
  const containingFolder = extractContainingDirectoryPath(
    entryPath,
    dirSeparator
  );
  const metaFolder = getMetaDirectoryPath(containingFolder, dirSeparator);
  return (
    metaFolder +
    dirSeparator +
    extractFileName(entryPath, dirSeparator) +
    AppConfig.contentFileExt
  );
}

function getFileLocationFromMetaFile(
  entryPath,
  dirSeparator // = AppConfig.dirSeparator
) {
  let containingFolder = extractContainingDirectoryPath(
    entryPath,
    dirSeparator
  );
  containingFolder = containingFolder.replace(
    dirSeparator + AppConfig.metaFolder,
    ""
  );
  const fileName = extractFileName(entryPath, dirSeparator).replace(
    AppConfig.metaFileExt,
    ""
  );
  return containingFolder + dirSeparator + fileName;
}

function getThumbFileLocationForFile(
  entryPath,
  dirSeparator = AppConfig.dirSeparator,
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
  const fileName = extractFileName(entryPath, dirSeparator);
  const metaFolder = getMetaDirectoryPath(containingFolder, dirSeparator);
  return (
    metaFolder +
    dirSeparator +
    (encoded
      ? encodeURIComponent(fileName).replace(/%5B/g, "[").replace(/%5D/g, "]")
      : fileName) +
    AppConfig.thumbFileExt
  );
}

function getThumbFileLocationForDirectory(
  entryPath,
  dirSeparator = AppConfig.dirSeparator
) {
  return (
    entryPath +
    (entryPath.endsWith(dirSeparator) ? "" : dirSeparator) +
    AppConfig.metaFolder +
    dirSeparator +
    AppConfig.folderThumbFile
  );
}

function getBgndFileLocationForDirectory(
  entryPath,
  dirSeparator = AppConfig.dirSeparator
) {
  return (
    entryPath +
    (entryPath.endsWith(dirSeparator) ? "" : dirSeparator) +
    AppConfig.metaFolder +
    dirSeparator +
    AppConfig.folderBgndFile
  );
}

function getBackupFileLocation(
  entryPath,
  uuid,
  dirSeparator = AppConfig.dirSeparator
) {
  const extension = extractFileExtension(entryPath, dirSeparator);
  const dirPath = extractContainingDirectoryPath(entryPath, dirSeparator);
  return (
    dirPath +
    (dirPath.endsWith(dirSeparator) ? "" : dirSeparator) +
    AppConfig.metaFolder +
    dirSeparator +
    uuid +
    dirSeparator +
    new Date().getTime() +
    "." +
    extension
  );
}

function getBackupFileDir(
  entryPath,
  uuid,
  dirSeparator = AppConfig.dirSeparator
) {
  const dirPath = extractContainingDirectoryPath(entryPath, dirSeparator);
  return (
    dirPath +
    (entryPath.endsWith(dirSeparator) ? "" : dirSeparator) +
    AppConfig.metaFolder +
    dirSeparator +
    uuid
  );
}

function getMetaFileLocationForDir(
  entryPath,
  dirSeparator = AppConfig.dirSeparator,
  metaFile = AppConfig.metaFolderFile
) {
  const metaFolder = getMetaDirectoryPath(entryPath, dirSeparator);
  return (
    metaFolder +
    (metaFolder.endsWith(dirSeparator) ? "" : dirSeparator) +
    metaFile
  );
}

function extractFileName(filePath, dirSeparator = AppConfig.dirSeparator) {
  if (!filePath || filePath.endsWith(dirSeparator)) {
    return "";
  }
  if (filePath) {
    const lastIndex = getDirSeparatorPosition(filePath, dirSeparator);
    if (lastIndex !== -1) {
      return filePath.substring(lastIndex + 1, filePath.length);
    }
  }
  return filePath;
}

/**
 * @param filePath: string
 * @param dirSeparator: string
 * @returns {string}
 */
function encodeFileName(
  filePath,
  dirSeparator // = AppConfig.dirSeparator
) {
  if (filePath) {
    const path = filePath;
    if (filePath.endsWith(dirSeparator)) {
      return "";
    }
    const lastDirSeparator = path.lastIndexOf(dirSeparator) + 1;
    return (
      path.substring(0, lastDirSeparator) +
      encodeURIComponent(path.substring(lastDirSeparator, path.length))
    );
  }
  return filePath;
}

function cleanTrailingDirSeparator(dirPath) {
  if (dirPath) {
    if (dirPath.lastIndexOf("\\") === dirPath.length - 1) {
      return dirPath.replace(/\\+$/g, ""); //dirPath.substring(0, dirPath.length - 1);
    }
    if (dirPath.lastIndexOf("/") === dirPath.length - 1) {
      return dirPath.replace(/\/+$/g, ""); //dirPath.substring(0, dirPath.length - 1);
    }
    return dirPath;
  }
  // console.log('Directory Path ' + dirPath + ' undefined');
  return "";
}

function getDirSeparatorPosition(path, dirSeparator) {
  const lastIndex = path.lastIndexOf(dirSeparator);
  if (lastIndex !== -1) {
    return lastIndex;
  } else if (dirSeparator === "\\") {
    return path.lastIndexOf("/");
  }
  return -1;
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

/**
 * @param filePath : string
 * @param dirSeparator : string
 * @returns {string}
 */
function extractFileNameWithoutExt(
  filePath,
  dirSeparator // = AppConfig.dirSeparator
) {
  const fileName = extractFileName(filePath, dirSeparator);
  const indexOfDot = fileName.lastIndexOf(".");
  const lastIndexBeginTagContainer = fileName.lastIndexOf(
    AppConfig.beginTagContainer
  );
  const lastIndexEndTagContainer = fileName.lastIndexOf(
    AppConfig.endTagContainer
  );
  if (
    lastIndexBeginTagContainer === 0 &&
    lastIndexEndTagContainer + 1 === fileName.length
  ) {
    // case: "[tag1 tag.2]"
    return "";
  }
  if (indexOfDot > 0) {
    // case: regular
    return fileName.substring(0, indexOfDot);
  }
  if (indexOfDot === 0) {
    // case ".txt"
    return "";
  }
  return fileName;
}

function extractContainingDirectoryPath(
  filePath,
  dirSeparator = AppConfig.dirSeparator
) {
  const cleanedPath = cleanTrailingDirSeparator(filePath);
  const lastIndex = cleanedPath.lastIndexOf(dirSeparator);
  return lastIndex === -1 ? dirSeparator : cleanedPath.substring(0, lastIndex);
}

/**
 * @param dirPath: string
 * @param dirSeparator: string
 * @returns {string}
 */
function extractParentDirectoryPath(
  dirPath,
  dirSeparator = AppConfig.dirSeparator
) {
  if (dirPath) {
    let path = dirPath;
    if (path.endsWith(dirSeparator)) {
      path = path.substring(0, path.lastIndexOf(dirSeparator));
    }
    const lastIndex = getDirSeparatorPosition(path, dirSeparator);
    if (lastIndex !== -1) {
      return path.substring(0, lastIndex);
    }
  }
  // return root dir in cases that dirPath not start with dirSeparator (AWS)
  return "";
}

/**
 * @param dirPath: string
 * @param dirSeparator: string
 * @returns {string}
 */
function extractDirectoryName(dirPath, dirSeparator = AppConfig.dirSeparator) {
  if (!dirPath) return "";
  let directoryName = dirPath;
  try {
    directoryName = decodeURIComponent(dirPath);
  } catch (ex) {}
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

/**
 * @param dirPath: string
 * @param dirSeparator: string
 * @returns {string}
 */
function extractShortDirectoryName(
  dirPath,
  dirSeparator // = AppConfig.dirSeparator
) {
  let shortDirName = extractDirectoryName(dirPath, dirSeparator);
  if (shortDirName.length > 20) {
    shortDirName = shortDirName.substr(0, 20) + "...";
  }
  return shortDirName;
}

function getDirSeparator(path) {
  if (path) {
    if (path.includes("\\")) {
      return "\\";
    } else if (path.includes("/")) {
      return "/";
    }
  }
  // failed to getDirSeparator return unix
  return "/";
}
/**
 * @param filePath: string
 * @param dirSeparator: string
 * @returns {string}
 */
function extractContainingDirectoryName(filePath, dirSeparator = undefined) {
  if (dirSeparator === undefined) {
    dirSeparator = getDirSeparator(filePath);
  }
  const tmpStr = filePath.substring(0, filePath.lastIndexOf(dirSeparator));
  return tmpStr.substring(tmpStr.lastIndexOf(dirSeparator) + 1, tmpStr.length);
}

/**
 * @param entryPath: string
 * @param isDirectory: boolean
 * @param dirSeparator: string
 * @returns {string|*}
 */
function extractTitle(
  entryPath,
  isDirectory = false,
  dirSeparator // = AppConfig.dirSeparator
) {
  let title;
  if (isDirectory) {
    title = extractDirectoryName(entryPath, dirSeparator); // .replace(/(^\/)|(\/$)/g, '');
    return title;
  }
  title = extractFileNameWithoutExt(entryPath, dirSeparator);

  const beginTagContainer = title.indexOf(AppConfig.beginTagContainer);
  const endTagContainer = title.lastIndexOf(AppConfig.endTagContainer);
  /* cases like "", "t", "["
      if( fileName.length <= 1) {
      // cases like "asd ] asd ["
      else if (beginTagContainer > endTagContainer) {
      // case: [ not found in the filename
      else if ( beginTagContainer < 0 )
      else if ( endTagContainer < 0 ) */
  if (beginTagContainer >= 0 && beginTagContainer < endTagContainer) {
    if (beginTagContainer === 0 && endTagContainer === title.trim().length) {
      // case: "[tag1, tag2]"
      return "";
    }
    if (endTagContainer === title.trim().length) {
      // case: "asd[tag1, tag2]"
      return title.slice(0, beginTagContainer);
    }
    // case: "title1 [tag1 tag2] title2"
    return (
      title.slice(0, beginTagContainer) +
      title.slice(endTagContainer + 1, title.length)
    );
  }
  try {
    title = decodeURIComponent(title);
  } catch (e) {
    console.warn("Decoding URI failed on: " + title + " with " + e);
  }
  return title;
}

/**
 * Remove Tags from fileName
 * @param fileName: string
 */
function cleanFileName(fileName) {
  const beginTagContainer = fileName.indexOf(AppConfig.beginTagContainer);
  const endTagContainer = fileName.lastIndexOf(AppConfig.endTagContainer);
  if (beginTagContainer >= 0 && beginTagContainer < endTagContainer) {
    return (
      fileName.slice(0, beginTagContainer) +
      fileName.slice(endTagContainer + 1, fileName.length)
    );
  }
  return fileName;
}

function extractTagsAsObjects(
  filePath,
  tagDelimiter,
  dirSeparator = AppConfig.dirSeparator
) {
  const tagsInFileName = extractTags(filePath, tagDelimiter, dirSeparator);
  return tagsAsObjects(tagsInFileName);
}

/**
 * @param tags: Array<string>
 * @returns: Array<TS.Tag>
 */
function tagsAsObjects(tags) {
  return tags.map((tag) => ({
    title: "" + tag,
    type: "plain",
  }));
}

/**
 * extract tags from filename
 * @param filePath
 * @param tagDelimiter
 * @param dirSeparator
 * @returns {string[]}
 */
function extractTags(
  filePath,
  tagDelimiter,
  dirSeparator = AppConfig.dirSeparator
) {
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

/**
 * @deprecated fail on S3 locations
 * @param filePath: string
 * @param locations: Array<TS.Location>
 */
/*function extractLocation(filePath, locations) {
  let currentLocation;
  const path = filePath.replace(/[/\\]/g, "");
  for (let i = 0; i < locations.length; i += 1) {
    const locationPath = getLocationPath(locations[i]).replace(/[/\\]/g, "");

    // Handle S3 empty location
    if (locationPath.length === 0) {
      if (currentLocation === undefined) {
        currentLocation = locations[i];
      }
    } else if (path.startsWith(locationPath)) {
      currentLocation = locations[i];
    }
  }
  return currentLocation;
}*/

/**
 * @param paths -the first is DirSeparator
 */
function joinPaths(...paths) {
  let result = "";
  const dirSeparator = paths[0] || AppConfig.dirSeparator;
  if (dirSeparator) {
    //&& (dirSeparator === '/' || dirSeparator === '\\')) {
    for (let i = 1; i < paths.length; i += 1) {
      if (paths[i]) {
        result =
          result +
          (result.endsWith(dirSeparator) ||
          paths[i].startsWith(dirSeparator) ||
          (i === 1 &&
            paths[i].startsWith(".") &&
            !paths[i].startsWith(AppConfig.metaFolder)) // relative paths
            ? ""
            : dirSeparator) +
          paths[i];
      }
    }
  } else {
    throw new Error("Wrong dirSeparator:" + dirSeparator);
  }
  if (AppConfig.isWin && result.startsWith(dirSeparator)) {
    // trim dirSeparator in windows paths like \C:\
    return result.substr(dirSeparator.length);
  }
  return result;
}

function cleanFrontDirSeparator(dirPath) {
  if (dirPath) {
    if (dirPath.startsWith("\\")) {
      return dirPath.substring(1);
    }
    if (dirPath.startsWith("/")) {
      return dirPath.substring(1);
    }
    return dirPath;
  }
  return "";
}

function isPathStartsWith(
  subDir,
  rootDir,
  dirSeparator = AppConfig.dirSeparator
) {
  const splitSubDir = subDir.split(dirSeparator).filter(Boolean); // .split(/[\\/]/)
  const splitRootDir = rootDir.split(dirSeparator).filter(Boolean);
  // Compare the remaining path segments
  for (let i = 0; i < Math.min(splitSubDir.length, splitRootDir.length); i++) {
    if (splitSubDir[i] !== splitRootDir[i]) {
      return false;
    }
  }

  return true;
}

/**
 * for files ts:?tslid=53ea7417-6267-4f7c-9c25-dc44aa41f6c8&tsepath=%2FSelect-Dion%5B20210901%5D.jpeg
 * for folders ts:?tslid=53ea7417-6267-4f7c-9c25-dc44aa41f6c8&tsepath=%2FMath
 * @param locationID: string
 * @param entryPath?: string
 * @param directoryPath?: string
 * @param entryID?: string
 * @returns {string} Generates sharing links
 */
function generateSharingLink(locationID, entryPath, directoryPath, entryID) {
  const escapedEntryPath = entryPath && encodeURIComponent(entryPath);
  const escapedDirPath = directoryPath && encodeURIComponent(directoryPath);
  let tsepath = "";
  if (escapedEntryPath) {
    tsepath = "&tsepath=" + escapedEntryPath;
  }
  let tsdpath = "";
  if (escapedDirPath) {
    tsdpath = "&tsdpath=" + escapedDirPath;
  }
  let tseid = "";
  if (entryID) {
    tseid = "&tseid=" + entryID;
  }
  return (
    AppConfig.tsProtocol + "?tslid=" + locationID + tsepath + tsdpath + tseid
  );
}

/**
 * used for indexer to create path in index
 * @param filePath
 * @param rootPath
 * @param dirSeparator
 * @returns {string} Path without root with dirSeparators subFolder/Select-Dion[20210901].jpeg
 */
function cleanRootPath(
  filePath,
  rootPath,
  dirSeparator // = AppConfig.dirSeparator
) {
  if (!filePath || !rootPath) {
    return cleanTrailingDirSeparator(cleanFrontDirSeparator(filePath));
  }
  const filePathArr = filePath
    .split(dirSeparator)
    .filter((pathPart) => pathPart);
  const rootPathArr = rootPath
    .split(dirSeparator)
    .filter((pathPart) => pathPart);
  const cleanPath = filePathArr.slice(rootPathArr.length);

  return cleanPath.join(dirSeparator);
}

module.exports = {
  baseName,
  extractFileExtension,
  generateFileName,
  getMetaDirectoryPath,
  getThumbFileLocationForFile,
  getThumbFileLocationForDirectory,
  getBgndFileLocationForDirectory,
  getBackupFileLocation,
  getBackupFileDir,
  getFileLocationFromMetaFile,
  getMetaFileLocationForFile,
  getMetaContentFileLocation,
  getMetaFileLocationForDir,
  extractFileName,
  encodeFileName,
  cleanTrailingDirSeparator,
  cleanFrontDirSeparator,
  isPathStartsWith,
  normalizePath,
  extractFileNameWithoutExt,
  extractContainingDirectoryPath,
  extractParentDirectoryPath,
  extractDirectoryName,
  extractShortDirectoryName,
  extractContainingDirectoryName,
  extractTitle,
  cleanFileName,
  extractTagsAsObjects,
  extractTags,
  tagsAsObjects,
  // extractLocation,
  joinPaths,
  generateSharingLink,
  cleanRootPath,
};
