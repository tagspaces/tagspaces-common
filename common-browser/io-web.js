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

const listMetaDirectoryPromise = async (param) =>
  new Promise(async (resolve, reject) => {
    let path;
    if (typeof param === "object" && param !== null) {
      path = param.path;
    } else {
      path = param;
    }
    path = path + "/" + AppConfig.metaFolder;
    const dirHandle = await getHandle(path); //window[path]; //.localStorage.getItem(path);

    const enhancedEntries = [];

    for await (const entry of dirHandle.values()) {
      const nestedPath = `${path}/${entry.name}`;
      await idb.set(nestedPath, entry);
      // window[nestedPath] = entry;
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
    let path;
    if (typeof param === "object" && param !== null) {
      path = param.path;
    } else {
      path = param;
    }
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
      await idb.set(nestedPath, entry);
      // window[nestedPath] = entry;
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
            file.thumbPath = await getFileContentPromise(thumbPath, "DataURL");
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
    let path;
    if (typeof param === "object" && param !== null) {
      path = param.path;
    } else {
      path = param;
    }
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
  let path;
  if (typeof param === "object" && param !== null) {
    path = param.path;
  } else {
    path = param;
  }
  const fileHandle = await idb.get(path); //window[path];
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

/**
 * Persists a given content(binary supported) to a specified filepath (tested)
 * @param param
 * @param content
 * @param overWrite
 * @param mode
 * @returns {Promise<{path: *, lmdt: S3.LastModified, isFile: boolean, size: S3.ContentLength, name: (*|string)} | boolean>}
 */
const saveFilePromise = (param, content, overWrite, mode) =>
  new Promise((resolve, reject) => {
    const path = param.path;
    const bucketName = param.bucketName;
    // let isNewFile = false;
    // eslint-disable-next-line no-param-reassign
    const filePath = normalizeRootPath(path);

    /*return getPropertiesPromise({
    path: filePath,
    bucketName: bucketName,
  }).then((result) => {
    if (result === false) {
      isNewFile = true;
    }
    if (isNewFile || overWrite === true) {
      if (result.size !== content.length) {
        console.log(
          "Update index size:" +
            result.size +
            " old index size:" +
            content.length
        );*/
    // || mode === 'text') {
    const fileExt = tsPaths.extractFileExtension(filePath);

    let mimeType;
    if (fileExt === "md") {
      mimeType = "text/markdown";
    } else if (fileExt === "txt") {
      mimeType = "text/plain";
    } else if (fileExt === "html") {
      mimeType = "text/html";
    } else if (fileExt === "json") {
      mimeType = "application/json";
    } else {
      // default type
      mimeType = "text/plain";
    }
    const params = {
      Bucket: bucketName,
      Key: filePath,
      Body: content,
      ContentType: mimeType,
    }; // fs.readFileSync(filePath)
    s3().putObject(params, (err, data) => {
      if (err) {
        console.log("Error upload " + filePath); // an error occurred
        console.log(err, err.stack); // an error occurred
        resolve(false);
      }
      resolve({
        uuid: data ? data.ETag : uuidv1(),
        name:
          data && data.Key ? data.Key : tsPaths.extractFileName(filePath, "/"),
        url: data ? data.Location : filePath,
        isFile: true,
        path: filePath,
        extension: tsPaths.extractFileExtension(filePath, "/"),
        size: content.length,
        lmdt: new Date().getTime(),
        // isNewFile,
      });
    }); // .promise();
    /*}
    }
  });*/
  });

/**
 * Persists a given text content to a specified filepath (tested)
 */
function saveTextFilePromise(param, content, overWrite) {
  console.log("Saving text file: " + param.path);
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
 * Creates a directory. S3 does not have folders or files; it has buckets and objects. Buckets are used to store objects (tested)
 * @param param = { path: newDirectory/ }
 * @returns {Promise<>}
 */
function createDirectoryPromise(param) {
  const dirPath = tsPaths.normalizePath(normalizeRootPath(param.path)) + "/";
  console.log("Creating directory: " + dirPath);
  return s3()
    .putObject({
      Bucket: param.bucketName,
      Key: dirPath,
    })
    .promise()
    .then((result) => {
      const out = {
        ...result,
        dirPath,
      };
      if (dirPath.endsWith(AppConfig.metaFolder + "/")) {
        return out;
      }
      const metaFilePath = tsPaths.getMetaFileLocationForDir(dirPath, "/");
      const metaContent = '{"id":"' + new Date().getTime() + '"}';
      return saveTextFilePromise(
        { ...param, path: metaFilePath },
        metaContent,
        false
      ).then(() => out);
    });
}

/**
 * Copies a given file to a specified location (tested)
 * @param param
 * @param newFilePath
 * @returns {Promise<>}
 */
function copyFilePromise(param, newFilePath) {
  const nFilePath = tsPaths.normalizePath(normalizeRootPath(param.path));
  const nNewFilePath = tsPaths.normalizePath(normalizeRootPath(newFilePath));
  console.log("Copying file: " + nFilePath + " to " + nNewFilePath);
  if (nFilePath.toLowerCase() === nNewFilePath.toLowerCase()) {
    return new Promise((resolve, reject) => {
      reject("Copying file failed, files have the same path");
    });
  }
  return s3()
    .copyObject({
      Bucket: param.bucketName,
      CopySource: encodeURI(param.bucketName + "/" + nFilePath), //encodeS3URI
      Key: nNewFilePath, //encodeS3URI
    })
    .promise();
}

/**
 * Renames a given file (tested)
 * TODO for web minio copyObject -> The request signature we calculated does not match the signature you provided. Check your key and signing method.
 */
function renameFilePromise(param, newFilePath) {
  const nFilePath = tsPaths.normalizePath(normalizeRootPath(param.path));
  const nNewFilePath = tsPaths.normalizePath(normalizeRootPath(newFilePath));
  console.log("Renaming file: " + nFilePath + " to " + newFilePath);
  if (nFilePath === nNewFilePath) {
    return new Promise((resolve, reject) => {
      reject("Renaming file failed, files have the same path");
    });
  }
  // Copy the object to a new location
  return new Promise((resolve, reject) => {
    s3()
      .copyObject({
        Bucket: param.bucketName,
        CopySource: encodeURI(param.bucketName + "/" + nFilePath), // encodeS3URI(nFilePath),
        Key: nNewFilePath, //encodeS3URI
      })
      .promise()
      .then(() =>
        // Delete the old object
        s3()
          .deleteObject({
            Bucket: param.bucketName,
            Key: nFilePath,
          })
          .promise()
          .then(() => {
            resolve([param.path, nNewFilePath]);
          })
      )
      .catch((e) => {
        console.log(e);
        reject("Renaming file failed" + e.code);
      });
  });
}

/**
 * Rename a directory
 */
function renameDirectoryPromise(param, newDirectoryPath) {
  const parenDirPath = tsPaths.extractParentDirectoryPath(param.path, "/");
  const newDirPath = normalizeRootPath(parenDirPath + "/" + newDirectoryPath);
  console.log("Renaming directory: " + param.path + " to " + newDirPath);
  if (param.path === newDirPath) {
    return Promise.reject(
      "Renaming directory failed, directories have the same path"
    );
  }

  const listParams = {
    Bucket: param.bucketName,
    Prefix: param.path,
    Delimiter: "/",
  };
  return s3()
    .listObjectsV2(listParams)
    .promise()
    .then((listedObjects) => {
      if (listedObjects.Contents.length > 0) {
        const promises = [];
        listedObjects.Contents.forEach(({ Key }) => {
          if (Key.endsWith("/")) {
            promises.push(
              createDirectoryPromise({ ...param, path: newDirectoryPath })
            );
          } else {
            promises.push(
              copyFilePromise(
                { ...param, path: Key },
                parenDirPath +
                  "/" +
                  Key.replace(
                    tsPaths.normalizePath(param.path),
                    newDirectoryPath
                  )
              )
            );
          }
        });

        return Promise.all(promises).then(() =>
          deleteDirectoryPromise(param).then(() => newDirectoryPath)
        );
      } else {
        // empty Dir
        return createDirectoryPromise({
          ...param,
          path: newDirectoryPath,
        }).then(() =>
          deleteDirectoryPromise(param).then(() => newDirectoryPath)
        );
      }
    })
    .catch((e) => {
      console.log(e);
      return Promise.reject("No directory exist:" + param.path);
    });
}

/**
 * Delete a specified file
 */
function deleteFilePromise(param) {
  return s3()
    .deleteObject({
      Bucket: param.bucketName,
      Key: param.path,
    })
    .promise();
}

/**
 * Delete a specified directory
 * @param param
 * @returns {Promise<*[]>}
 */
function deleteDirectoryPromise(param) {
  return getDirectoryPrefixes(param).then((prefixes) => {
    if (prefixes.length > 0) {
      const deleteParams = {
        Bucket: param.bucketName,
        Delete: { Objects: prefixes },
      };

      try {
        return s3().deleteObjects(deleteParams).promise();
      } catch (e) {
        console.error(e);
        return Promise.resolve();
      }
    }
    return s3()
      .deleteObject({
        Bucket: param.bucketName,
        Key: param.path,
      })
      .promise();
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
    await idb.set(directoryHandle.name, directoryHandle);
    //window[directoryHandle.name] = directoryHandle; //.localStorage.setItem(directoryHandle.name, directoryHandle);
    return [directoryHandle.name];
    /*const fsAccess = require("browser-fs-access");
  const blobsInDirectory = await fsAccess.directoryOpen({
    recursive: false,
  });*/
  } catch (error) {
    console.error("selectDirectoryDialog", error);
  }
  return [];
}

async function getHandle(handleId) {
  const handle = await idb.get(handleId.replace(/\/$/, "")); // remove potential slash from the end of the path
  if (!handle || !(await verifyPermission(handle))) {
    console.log("no permissions to getHandle for:" + handleId);
    return undefined;
  }
  return handle;
}
async function verifyPermission(fileHandle, readWrite = true) {
  const options = {};
  if (readWrite) {
    options.mode = "readwrite";
  }
  // Check if permission was already granted. If so, return true.
  if ((await fileHandle.queryPermission(options)) === "granted") {
    return true;
  }
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

/**
 * get recursively all aws directory prefixes
 * @param param
 * @returns {Promise<[]>}
 */
async function getDirectoryPrefixes(param) {
  const prefixes = [];
  const promises = [];
  const listParams = {
    Bucket: param.bucketName,
    Prefix: tsPaths.normalizePath(normalizeRootPath(param.path)) + "/",
    Delimiter: "/",
  };
  const listedObjects = await s3().listObjectsV2(listParams).promise();

  if (
    listedObjects.Contents.length > 0 ||
    listedObjects.CommonPrefixes.length > 0
  ) {
    listedObjects.Contents.forEach(({ Key }) => {
      prefixes.push({ Key });
    });

    listedObjects.CommonPrefixes.forEach(({ Prefix }) => {
      prefixes.push({ Key: Prefix });
      promises.push(getDirectoryPrefixes({ ...param, path: Prefix }));
    });
    // if (listedObjects.IsTruncated) await this.deleteDirectoryPromise(path);
  }
  const subPrefixes = await Promise.all(promises);
  subPrefixes.map((arrPrefixes) => {
    arrPrefixes.map((prefix) => {
      prefixes.push(prefix);
    });
  });
  return prefixes;
}

function openUrl(url) {
  const tmpLink = document.createElement("a");
  tmpLink.target = "_blank";
  tmpLink.href = url;
  tmpLink.rel = "noopener noreferrer";
  document.body.appendChild(tmpLink);
  tmpLink.click();
  tmpLink.parentNode.removeChild(tmpLink);
  // window.open(url, '_blank').opener = null;
  // Object.assign(anchor, {
  //   target: '_blank',
  //   href: url,
  //   rel: 'noopener noreferrer'
  // }).click();
}

function openFile(filePath) {
  openUrl(filePath);
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
  deleteFilePromise,
  deleteDirectoryPromise,
  selectDirectoryDialog,
  openUrl,
  openFile,
};
