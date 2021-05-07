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

const metaFolder = ".ts";

export function getMetaDirectoryPath(directoryPath, dirSeparator) {
  if (directoryPath.endsWith(metaFolder + dirSeparator)) {
    return directoryPath;
  }
  return (
    (directoryPath ? normalizePath(directoryPath) + dirSeparator : "") +
    metaFolder
  );
}
/**
 *
 * @param path -> root//subFolder/
 * @returns {string} -> root/subFolder
 */
export function normalizePath(path) {
  if (!path) return "";
  return cleanTrailingDirSeparator(path.replace(/\/\//g, "/"));
}

export function cleanTrailingDirSeparator(dirPath) {
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
