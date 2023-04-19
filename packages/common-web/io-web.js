// const pathJS = require("path"); DONT use it add for windows platform delimiter \
const { v1: uuidv1 } = require("uuid");
const tsPaths = require("@tagspaces/tagspaces-common/paths");
const AppConfig = require("@tagspaces/tagspaces-common/AppConfig");
const idb = require("idb-keyval");

/*const getDevicePaths = () =>
  Promise.resolve({
    Desktop: "desktop",
    Document: "documents",
    Pictures: "pictures",
    Download: "downloads",
    Music: "music",
    Movies: "videos",
  });*/

function getPath(param) {
  if (typeof param === "object" && param !== null) {
    return param.path;
  }
  return param;
}

const listMetaDirectoryPromise = async (param) =>
  new Promise(async (resolve, reject) => {
    const path = getPath(param) + "/" + AppConfig.metaFolder;
    const dirHandle = await getHandle(path); //window[path]; //.localStorage.getItem(path);

    const enhancedEntries = [];

    for await (const entry of dirHandle.values()) {
      const nestedPath = `${path}/${entry.name}`;
      await setHandle(nestedPath, entry);
      if (entry.kind === "file") {
        enhancedEntries.push(
          entry.getFile().then((file) => ({
            name: file.name,
            path: nestedPath,
            isFile: true,
            size: file.size,
            lmdt: file.lastModified,
          }))
        );
      }
    }
    resolve(await Promise.all(enhancedEntries));
  });

/**
 * @param param
 * @param mode = ['extractTextContent', 'extractThumbPath', 'extractThumbURL']
 * @returns {Promise<unknown>}
 */
const listDirectoryPromise = (param, mode = ["extractThumbPath"]) =>
  new Promise(async (resolve, reject) => {
    const path = getPath(param);
    const dirHandle = await getHandle(path); //window[path]; //.localStorage.getItem(path);
    /*if (!dirHandle) {
      await selectDirectoryDialog(path);
    }*/
    const dirEntries = [];
    let eentry;

    const filePromises = [];
    let haveMetaFolder = false;

    for await (const entry of dirHandle.values()) {
      if (entry.name === AppConfig.metaFolder) {
        haveMetaFolder = true;
      }
      const nestedPath = `${path}/${entry.name}`;
      await setHandle(nestedPath, entry);
      if (entry.kind === "file") {
        filePromises.push(
          entry.getFile().then((file) => {
            eentry = {};
            eentry.name = file.name;
            eentry.path = nestedPath;
            eentry.tags = [];
            eentry.meta = {};
            eentry.isFile = true;
            eentry.size = file.size;
            eentry.lmdt = file.lastModified;
            return eentry;
          })
        );
      } else if (entry.kind === "directory") {
        eentry = {};
        eentry.name = entry.name;
        eentry.path = nestedPath;
        eentry.tags = [];
        eentry.thumbPath = "";
        eentry.meta = {};
        eentry.isFile = false;
        eentry.size = 0;
        eentry.lmdt = 0;

        if (eentry.path !== path) {
          // skipping the current directory
          dirEntries.push(eentry);
        }
      }
    }

    const fileEntries = await Promise.all(filePromises);

    if (haveMetaFolder) {
      if (
        mode.some((el) => el === "extractThumbURL" || el === "extractThumbPath")
      ) {
        const metaContent = await listMetaDirectoryPromise(param);
        for (const file of fileEntries) {
          let thumbPath = tsPaths.getThumbFileLocationForFile(
            file.path,
            "/",
            false
          );
          const thumbAvailable = metaContent.some(
            (obj) => obj.path === thumbPath
          );
          if (thumbAvailable) {
            file.thumbPath = await getFileContentPromise(
              { path: thumbPath },
              "DataURL"
            );
          }
        }
      }
    }
    resolve([...dirEntries, ...fileEntries]);
  });

function isFileSystemFileHandle(handle) {
  return handle.kind === "file";
}

function isFileSystemDirectoryHandle(handle) {
  return handle.kind === "directory";
}

function getPropertiesPromise(param) {
  return new Promise(async (resolve, reject) => {
    const path = getPath(param);
    const handle = await getHandle(path);
    if (handle) {
      if (isFileSystemFileHandle(handle)) {
        const file = await handle.getFile();
        resolve({
          name: file.name,
          path: path,
          isFile: true,
          size: file.size,
          lmdt: file.lastModified,
        });
      } else {
        resolve({
          name: handle.name,
          path: path,
          isFile: false,
          size: 0,
        });
      }
    } else {
      resolve(false);
    }
  });
}

const loadTextFilePromise = (param, isPreview) =>
  getFileContentPromise(param, "text", isPreview);

/**
 * Use only for files (will not work for dirs)
 * @param param
 * @param type text | arraybuffer
 * @param isPreview
 * @returns {Promise<string | string>}
 */
const getFileContentPromise = async (
  param,
  type = "text",
  isPreview = false
) => {
  const path = getPath(param);
  const fileHandle = await getHandle(path);
  const file = await fileHandle.getFile();
  if (type === "text") {
    return file.text();
  } else if (type === "DataURL") {
    return new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = function () {
        resolve(fr.result);
      };
      fr.onerror = (error) => {
        reject(error);
      };
      fr.readAsDataURL(file);
    });
  }
  return file;
};

async function writeFile(fileHandle, contents) {
  // Create a FileSystemWritableFileStream to write to.
  const writable = await fileHandle.createWritable();
  // Write the contents of the file to the stream.
  await writable.write(contents);
  // Close the file and write the contents to disk.
  await writable.close();
}

/**
 * Persists a given content(binary supported) to a specified filepath
 * @param param
 * @param content
 * @param overWrite
 * @param mode
 * @returns {Promise<any>}
 */
const saveFilePromise = (param, content, overWrite, mode) =>
  new Promise(async (resolve, reject) => {
    const path = getPath(param);
    const handle = await getHandle(path, true);
    if (!handle) {
      // new file
      const parenDirPath = tsPaths.extractParentDirectoryPath(
        path,
        AppConfig.dirSeparator
      );
      const dirHandle = await getHandle(parenDirPath, true);
      if (dirHandle) {
        const fileName = path.substr(parenDirPath.length + 1);
        const newFileHandle = await dirHandle.getFileHandle(fileName, {
          create: true,
        });
        await setHandle(path, newFileHandle);
        resolve({
          name: newFileHandle.name,
          isFile: true,
          path: path,
          extension: tsPaths.extractFileExtension(path, AppConfig.dirSeparator),
          size: 0,
          lmdt: new Date().getTime(),
          tags: [],
        });
      } else {
        reject("error saveFilePromise parentDirHandler not exist");
      }
    } else if (isFileSystemFileHandle(handle)) {
      await writeFile(handle, content);
      const file = await handle.getFile();
      resolve({
        name: file.name,
        isFile: true,
        path: path,
        extension: tsPaths.extractFileExtension(path, AppConfig.dirSeparator),
        size: file.size,
        lmdt: file.lastModified,
        tags: [],
      });
    }
  });

/**
 * Persists a given text content to a specified filepath (tested)
 */
function saveTextFilePromise(param, content, overWrite) {
  // console.log("Saving text file: " + param);
  return saveFilePromise(param, content, overWrite, "text");
}

function normalizeRootPath(filePath) {
  filePath = filePath.replace(new RegExp("//+", "g"), "/");
  filePath = filePath.replace("\\", "/");
  /* if(filePath.indexOf(AppConfig.dirSeparator) === 0){
    filePath = filePath.substr(AppConfig.dirSeparator.length);
  } */
  if (filePath.indexOf("/") === 0) {
    filePath = filePath.substr(1);
  }
  return decodeURIComponent(filePath);
}

/**
 * Persists a given binary content to a specified filepath (tested)
 * return : Promise<TS.FileSystemEntry>
 */
function saveBinaryFilePromise(
  param,
  content,
  overWrite,
  onUploadProgress,
  onAbort
) {
  return new Promise((resolve, reject) => {
    let isNewFile = false;
    // eslint-disable-next-line no-param-reassign
    const filePath = normalizeRootPath(param.path);
    getPropertiesPromise({ ...param, path: filePath })
      .then((result) => {
        if (result === false) {
          isNewFile = true;
        }
        if (isNewFile || overWrite === true) {
          const params = {
            Bucket: param.bucketName,
            Key: filePath,
            Body: content,
          };
          const request = s3().upload(params);
          if (onUploadProgress) {
            request.on("httpUploadProgress", (progress) => {
              if (onUploadProgress) {
                onUploadProgress(progress, () => request.abort());
              }
            }); // onUploadProgress as any);
          }
          if (onAbort) {
            onAbort = () => request.abort();
          }
          try {
            request
              .promise()
              .then((data) => {
                resolve({
                  uuid: uuidv1(), // data.ETag,
                  name: data.Key
                    ? data.Key
                    : tsPaths.extractFileName(filePath, "/"),
                  url: data.Location,
                  isFile: true,
                  path: filePath,
                  extension: tsPaths.extractFileExtension(filePath, "/"),
                  size: content.length,
                  lmdt: new Date().getTime(),
                  tags: [],
                  isNewFile,
                });
              })
              .catch((err) => {
                reject(err);
              });
          } catch (err) {
            console.log("Error upload " + filePath); // an error occurred
            console.log(err, err.stack); // an error occurred
            reject("saveBinaryFilePromise error");
          }
        } else {
          resolve(result);
        }
        return result;
      })
      .catch((err) => reject(err));
  });
}

/**
 * Creates a directory.
 * @param param = { path: newDirectory/ }
 * @returns {Promise<>}
 */
function createDirectoryPromise(param) {
  return new Promise(async (resolve, reject) => {
    const path = getPath(param);
    const parenDirPath = tsPaths.extractParentDirectoryPath(
      path,
      AppConfig.dirSeparator
    );
    const parentDirHandle = await getHandle(parenDirPath, true);
    if (parentDirHandle) {
      const newDirName = path.substr(parenDirPath.length + 1);
      const newDirectoryHandle = await parentDirHandle.getDirectoryHandle(
        newDirName,
        {
          create: true,
        }
      );
      await setHandle(path, newDirectoryHandle);
      resolve(path);
    }
  });
}

/**
 * Copies a given file to a specified location
 * @param param
 * @param newFilePath
 * @returns {Promise<>}
 */
function copyFilePromise(param, newFilePath) {
  // https://github.com/WICG/file-system-access/pull/317
  return Promise.reject("not supported");
  /*return new Promise(async (resolve, reject) => {
    const path = getPath(param);
    const fileHandle = await getHandle(path, true);
    if (fileHandle) {
      const parenDirPath = tsPaths.extractParentDirectoryPath(
        path,
        AppConfig.dirSeparator
      );
      const parentDirHandle = await getHandle(parenDirPath, true);
      if (parentDirHandle) {
        const targetDir = tsPaths.extractParentDirectoryPath(
          path,
          AppConfig.dirSeparator
        );
        const targetDirHandle = await getHandle(targetDir, true);
        if (targetDirHandle) {
          const same = await parentDirHandle.isSameEntry(targetDirHandle);
          if (same) {
            reject("Copying file failed, files have the same path");
          } else {
            await fileHandle.move(targetDirHandle);
            resolve([path, newFilePath]);
          }
        } else {
          reject("Copying file failed, targetDirHandle not exist:" + targetDir);
        }
      } else {
        reject(
          "Copying file failed, parentDirHandle not exist:" + parenDirPath
        );
      }
    } else {
      reject("Copying file failed, files not exist:" + path);
    }
  });*/
}

/**
 * Renames a given file
 */
function renameFilePromise(param, newFilePath, onProgress = undefined) {
  // https://github.com/WICG/file-system-access/pull/317
  return Promise.reject("not supported");
  /*return new Promise(async (resolve, reject) => {
    const path = getPath(param);
    const fileHandle = await getHandle(path, true);
    if (fileHandle) {
      const fileName = tsPaths.extractFileName(newFilePath);
      await fileHandle.move(fileName);
      resolve([path, newFilePath]);
    } else {
      reject("Copying file failed, files not exist:" + path);
    }
  });*/
}

/**
 * Rename a directory
 */
function renameDirectoryPromise(param, newDirectoryPath) {
  return Promise.reject("not supported");
}

/**
 * Move a directory
 */
function moveDirectoryPromise(param, newDirectoryPath) {
  return Promise.reject("not supported");
}

/**
 * Delete a specified file
 */
function deleteFilePromise(param) {
  return new Promise(async (resolve, reject) => {
    const path = getPath(param);
    const parenDirPath = tsPaths.extractParentDirectoryPath(
      path,
      AppConfig.dirSeparator
    );
    const dirHandle = await getHandle(parenDirPath, true);
    if (dirHandle) {
      const fileName = path.substr(parenDirPath.length + 1);
      await dirHandle.removeEntry(fileName);
      resolve(path);
    } else {
      reject("no dirHandle for path:" + path);
    }
  });
}

/**
 * Delete a specified directory
 * @param param
 * @returns {Promise<*[]>}
 */
async function deleteDirectoryPromise(param) {
  return new Promise(async (resolve, reject) => {
    const path = getPath(param);
    const parenDirPath = tsPaths.extractParentDirectoryPath(
      path,
      AppConfig.dirSeparator
    );
    const dirHandle = await getHandle(parenDirPath, true);
    if (dirHandle) {
      const dirName = path.substr(parenDirPath.length + 1);
      await dirHandle.removeEntry(dirName, { recursive: true });
      resolve(path);
    } else {
      reject("no dirHandle for path:" + path);
    }
  });
}

/**
 * @returns {Promise<*[]>}
 */
async function selectDirectoryDialog(startIn = "documents") {
  try {
    const directoryHandle = await window.showDirectoryPicker({
      startIn,
    });
    await setHandle(directoryHandle.name, directoryHandle, false); //.localStorage.setItem(directoryHandle.name, directoryHandle);
    return [directoryHandle.name];
  } catch (error) {
    console.error("selectDirectoryDialog", error);
  }
  return [];
}

async function setHandle(handleId, handle, temp = true) {
  const key = handleId
    .split(AppConfig.dirSeparator)
    .filter((v) => v !== "")
    .join(AppConfig.dirSeparator);
  window["fsaLocations"] = window["fsaLocations"]
    ? { ...window["fsaLocations"], [key]: handle }
    : { [key]: handle };
  if (!temp) {
    await idb.set(key, handle);
  }
}

async function getHandle(handleId, readWrite = false) {
  // const key = handleId.replace(/\/$/, ""); // remove potential slash from the end of the path
  const key = handleId
    .split(AppConfig.dirSeparator)
    .filter((v) => v !== "")
    .join(AppConfig.dirSeparator);
  let handle = window["fsaLocations"] ? window["fsaLocations"][key] : undefined;
  if (!handle) {
    handle = await idb.get(key);
  }
  if (!handle || !(await verifyPermission(handle, readWrite))) {
    console.log("no permissions to getHandle for:" + handleId);
    return undefined;
  }
  return handle;
}

async function verifyPermission(fileHandle, readWrite = false) {
  const options = {};
  if (readWrite) {
    options.mode = "readwrite";
  }
  // Check if permission was already granted. If so, return true.
  const permissions = await fileHandle.queryPermission(options);
  if (permissions === "granted") {
    return true;
  }
  // console.debug("no permissions:" + permissions);
  try {
    // Request permission. If the user grants permission, return true.
    if ((await fileHandle.requestPermission(options)) === "granted") {
      return true;
    }
  } catch (error) {
    console.error(error); // this can fail with a DOMException
  }
  // The user didn't grant permission, so return false.
  return false;
}

module.exports = {
  listMetaDirectoryPromise,
  listDirectoryPromise,
  saveFilePromise,
  saveTextFilePromise,
  getPropertiesPromise,
  loadTextFilePromise,
  getFileContentPromise,
  saveBinaryFilePromise,
  createDirectoryPromise,
  copyFilePromise,
  renameFilePromise,
  renameDirectoryPromise,
  moveDirectoryPromise,
  deleteFilePromise,
  deleteDirectoryPromise,
  selectDirectoryDialog,
};
