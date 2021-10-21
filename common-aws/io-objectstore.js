const AWS = require("aws-sdk");
// const pathJS = require("path"); DONT use it add for windows platform delimiter \
const tsPaths = require("@tagspaces/tagspaces-common/paths");
const AppConfig = require("@tagspaces/tagspaces-common/AppConfig");
// get reference to S3 client
let S3;
let conf;

function config() {
  return conf;
}

function s3() {
  if (S3) {
    return S3;
  }
  S3 = new AWS.S3();
  return S3;
}

function configure(objectStoreConfig) {
  conf = objectStoreConfig;
  const advancedMode =
    objectStoreConfig.endpointURL && objectStoreConfig.endpointURL.length > 7;
  if (advancedMode) {
    const endpoint = new AWS.Endpoint(objectStoreConfig.endpointURL);
    S3 = new AWS.S3({
      endpoint: endpoint, // as string,
      accessKeyId: objectStoreConfig.accessKeyId,
      secretAccessKey: objectStoreConfig.secretAccessKey,
      sessionToken: objectStoreConfig.sessionToken,
      s3ForcePathStyle: true, // needed for minio
      signatureVersion: "v4", // needed for minio
      logger: console,
    });
  } else {
    S3 = new AWS.S3({
      region: objectStoreConfig.region,
      accessKeyId: objectStoreConfig.accessKeyId,
      secretAccessKey: objectStoreConfig.secretAccessKey,
      signatureVersion: "v4",
    });
  }
}

const getURLforPath = (param, expirationInSeconds = 900) => {
  const path = param.path;
  const bucketName = param.bucketName;
  if (!path || path.length < 1) {
    console.warn("Wrong path param for getURLforPath");
    return "";
  }
  const params = {
    Bucket: bucketName,
    Key: path,
    Expires: expirationInSeconds,
  };
  try {
    return s3().getSignedUrl("getObject", params);
  } catch (e) {
    console.warn("Error by getSignedUrl" + e.toString());
    return "";
  }
};

const listMetaDirectoryPromise = async (param) => {
  const path = param.path;
  const bucketName = param.bucketName;
  const entries = [];
  let entry;

  const params = {
    Delimiter: "/",
    Prefix:
      path !== "/" && path.length > 0
        ? normalizeRootPath(path + "/" + AppConfig.metaFolder + "/")
        : AppConfig.metaFolder + "/",
    Bucket: bucketName,
  };
  const results = await s3()
    .listObjectsV2(params)
    .promise()
    .then((data) => {
      // if (window.walkCanceled) {
      //     return resolve(entries); // returning results even if walk canceled
      // }
      // Handling files
      data.Contents.forEach((file) => {
        // console.warn('Meta: ' + JSON.stringify(file));
        entry = {};
        entry.name = file.Key; // extractFileName(file.Key, '/');
        entry.path = file.Key;
        entry.isFile = true;
        entry.size = file.Size;
        entry.lmdt = Date.parse(file.LastModified);
        if (file.Key !== params.Prefix) {
          // skipping the current folder
          entries.push(entry);
        }
      });
      return entries;
    })
    .catch((err) => {
      // console.log(err);
      console.warn("Error listing meta directory " + path, err);
      return entries; // returning results even if any promise fails
    });
  return results;
};

const listDirectoryPromise = (param, lite = true) =>
  new Promise(async (resolve) => {
    const path = param.path;
    const bucketName = param.bucketName;
    const enhancedEntries = [];
    let eentry;

    const metaContent = await listMetaDirectoryPromise(param);
    // console.log('Meta folder content: ' + JSON.stringify(metaContent));

    const params = {
      Delimiter: "/",
      Prefix:
        path.length > 0 && path !== "/" ? normalizeRootPath(path + "/") : "",
      // MaxKeys: 10000, // It returns actually up to 1000
      Bucket: bucketName,
    };
    s3().listObjectsV2(params, (error, data) => {
      // console.warn(data);
      /* data = {
                        Contents: [
                           {
                          ETag: "\"70ee1738b6b21\"",
                          Key: "example11.jpg",
                          LastModified: <Date Representation>,
                          Owner: {
                           DisplayName: "myname12",
                           ID: "12345example251"
                          },
                          Size: 112311,
                          StorageClass: "STANDARD"
                         },..
                        ],
                        NextMarker: "eyJNYXJrZXIiOiBudWxsLCAiYm90b190cnVuY2F0ZV9hbW91bnQiOiAyfQ=="
                       }
                       */
      if (error) {
        console.error(
          "Error listing directory " +
            params.Prefix +
            " bucketName:" +
            bucketName,
          error
        );
        resolve(enhancedEntries); // returning results even if any promise fails
        return;
      }

      // if (window.walkCanceled) {
      //     resolve(enhancedEntries); // returning results even if walk canceled
      //     return;
      // }

      const metaPromises = [];

      // Handling "directories"
      data.CommonPrefixes.forEach((dir) => {
        // console.warn(JSON.stringify(dir));
        const prefix = dir.Prefix; // normalizePath(normalizeRootPath(dir.Prefix));
        eentry = {};
        const prefixArray = prefix.replace(/\/$/, "").split("/");
        eentry.name = prefixArray[prefixArray.length - 1]; // dir.Prefix.substring(0, dir.Prefix.length - 1);
        eentry.path = prefix;
        eentry.bucketName = bucketName;
        eentry.tags = [];
        eentry.thumbPath = "";
        eentry.meta = {};
        eentry.isFile = false;
        eentry.size = 0;
        eentry.lmdt = 0;

        if (eentry.path !== params.Prefix) {
          // skipping the current directory
          enhancedEntries.push(eentry);
          metaPromises.push(getEntryMeta(eentry));
        }

        // if (window.walkCanceled) {
        //     resolve(enhancedEntries);
        // }
      });

      // Handling files
      data.Contents.forEach((file) => {
        // console.warn(JSON.stringify(file));
        let thumbPath = tsPaths.getThumbFileLocationForFile(file.Key);
        if (thumbPath.startsWith("/")) {
          thumbPath = thumbPath.substring(1);
        }
        const thumbAvailable = metaContent.find(
          (obj) => obj.path === thumbPath
        );
        if (thumbAvailable) {
          thumbPath = getURLforPath(
            {
              path: thumbPath,
              bucketName: bucketName,
            },
            604800
          ); // 60 * 60 * 24 * 7 = 1 week
        } else {
          thumbPath = "";
        }

        eentry = {};
        eentry.name = tsPaths.extractFileName(file.Key);
        eentry.path = file.Key;
        eentry.bucketName = bucketName;
        eentry.tags = [];
        eentry.thumbPath = thumbPath;
        eentry.meta = {};
        eentry.isFile = true;
        eentry.size = file.Size;
        eentry.lmdt = Date.parse(file.LastModified);
        if (file.Key !== params.Prefix) {
          // skipping the current folder
          enhancedEntries.push(eentry);
          let metaFilePath = tsPaths.getMetaFileLocationForFile(file.Key);
          if (metaFilePath.startsWith("/")) {
            metaFilePath = metaFilePath.substring(1);
          }
          const metaFileAvailable = metaContent.find(
            (obj) => obj.path === metaFilePath
          );
          if (metaFileAvailable) {
            metaPromises.push(getEntryMeta(eentry));
          }
        }
      });

      Promise.all(metaPromises)
        .then((entriesMeta) => {
          entriesMeta.forEach((entryMeta) => {
            enhancedEntries.some((enhancedEntry) => {
              if (enhancedEntry.path === entryMeta.path) {
                enhancedEntry = entryMeta;
                return true;
              }
              return false;
            });
          });
          resolve(enhancedEntries);
          return true;
        })
        .catch(() => {
          resolve(enhancedEntries);
        });
    });
  });

const getEntryMeta = async (eentry) => {
  const promise = new Promise(async (resolve) => {
    const entryPath = tsPaths.normalizePath(eentry.path);
    if (eentry.isFile) {
      const metaFilePath = tsPaths.getMetaFileLocationForFile(entryPath, "/");
      const metaFileContent = await loadTextFilePromise({
        path: metaFilePath,
        bucketName: eentry.bucketName,
      });
      eentry.meta = JSON.parse(metaFileContent.trim());
      resolve(eentry);
      // resolve({ ...eentry, meta: JSON.parse(metaFileContent.trim()) });
    } else {
      if (
        !entryPath.includes("/" + AppConfig.metaFolder) &&
        !entryPath.includes(AppConfig.metaFolder + "/")
      ) {
        // skipping meta folder
        const folderTmbPath =
          entryPath +
          "/" +
          AppConfig.metaFolder +
          "/" +
          AppConfig.folderThumbFile;
        const folderThumbProps = await getPropertiesPromise({
          path: folderTmbPath,
          bucketName: eentry.bucketName,
        });
        if (folderThumbProps && folderThumbProps.isFile) {
          eentry.thumbPath = getURLforPath(
            {
              path: folderTmbPath,
              bucketName: eentry.bucketName,
            },
            604800
          ); // 60 * 60 * 24 * 7 = 1 week ;
        }
        // }
        // if (!eentry.path.endsWith(AppConfig.metaFolder + '/')) { // Skip the /.ts folder
        const folderMetaPath =
          entryPath +
          "/" +
          AppConfig.metaFolder +
          "/" +
          AppConfig.metaFolderFile;
        const folderProps = await getPropertiesPromise({
          path: folderMetaPath,
          bucketName: eentry.bucketName,
        });
        if (folderProps && folderProps.isFile) {
          const metaFileContent = await loadTextFilePromise({
            path: folderMetaPath,
            bucketName: eentry.bucketName,
          });
          eentry.meta = JSON.parse(metaFileContent.trim());
          // console.log('Folder meta for ' + eentry.path + ' - ' + JSON.stringify(eentry.meta));
        }
      }
      resolve(eentry);
    }
  });
  const result = await promise;
  return result;
};

/**
 * @param param
 * @returns {Promise<{path: *, lmdt: S3.LastModified, isFile: boolean, size: S3.ContentLength, name: (*|string)} | boolean>}
 */
function getPropertiesPromise(param) {
  const path = normalizeRootPath(param.path);
  const bucketName = param.bucketName;
  if (path) {
    const params = {
      Bucket: bucketName,
      Key: path,
    };
    return s3()
      .headObject(params)
      .promise()
      .then((data) => {
        /*
                                data = {
                                  "AcceptRanges":"bytes",
                                  "LastModified":"2018-10-22T12:57:16.000Z",
                                  "ContentLength":101003,
                                  "ETag":"\"02cb1c856f4fdcde6b39062a29b95030\"",
                                  "ContentType":"image/png",
                                  "ServerSideEncryption":"AES256",
                                  "Metadata":{}
                                }
                                */

        const isFile = !path.endsWith("/");
        return {
          name: isFile
            ? tsPaths.extractFileName(path)
            : tsPaths.extractDirectoryName(path),
          isFile: !path.endsWith("/"),
          size: data.ContentLength,
          lmdt: data.LastModified, // Date.parse(data.LastModified),
          path,
        };
      })
      .catch((err) => {
        // workaround for checking if a folder exists on s3
        // console.log("getPropertiesPromise " + path, err);
        const listParams = {
          Bucket: bucketName,
          Prefix: path,
          MaxKeys: 1,
          Delimiter: "/",
        };
        return s3().listObjectsV2(listParams, (listError, listData) => {
          if (listError) {
            return false;
          }
          const folderExists =
            (listData && listData.KeyCount && listData.KeyCount > 0) || // supported on aws s3
            (listData &&
              listData.CommonPrefixes &&
              listData.CommonPrefixes.length > 0); // needed for DO
          if (folderExists) {
            return {
              name: tsPaths.extractDirectoryName(path),
              isFile: false,
              size: 0,
              lmdt: undefined,
              path: path,
            };
          } else {
            return false;
          }
        });
      });
  } else {
    // root folder
    return Promise.resolve({
      name: bucketName,
      isFile: false,
      size: 0,
      lmdt: undefined,
      path: "/",
    });
  }
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
  const path = normalizeRootPath(param.path);
  const bucketName = param.bucketName;
  const params = {
    Bucket: bucketName,
    Key: path,
    Range: isPreview ? "bytes=0-10000" : "",
  };
  // console.info("getFileContentPromise:" + JSON.stringify(params));
  return s3()
    .getObject(params)
    .promise()
    .then((data) => {
      // data: {
      // "AcceptRanges":"bytes",
      // "LastModified":"2018-10-22T16:24:42.000Z",
      // "ContentLength":99,
      // "ETag":"\"407a96716a09a2cf36ca32759cf15497\"",
      // "ContentType":"application/json",
      // "ServerSideEncryption":"AES256",
      // "Metadata":{},
      // "Body":{"type":"Buffer","data":[123,....,10,125]}}
      if (type === "text") {
        return data.Body.toString("utf8");
      }
      return data.Body;
    })
    .catch((e) => {
      console.error("Error getObject " + path, e);
      return ""; //Promise.resolve("");
    });
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
        uuid: data.ETag,
        name: data.Key ? data.Key : tsPaths.extractFileName(filePath, "/"),
        url: data.Location,
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
    const filePath = tsPaths.normalizePath(normalizeRootPath(param.path));
    getPropertiesPromise(filePath)
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
      CopySource: encodeURI(param.bucketName + "/" + nFilePath),
      Key: nNewFilePath,
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
        CopySource: encodeURI(param.bucketName + "/" + nFilePath), // this.encodeS3URI(nFilePath),
        Key: nNewFilePath,
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

      return s3().deleteObjects(deleteParams).promise();
    }
    return s3()
      .deleteObject({
        Bucket: param.bucketName,
        Key: path,
      })
      .promise();
  });
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
    Prefix: normalizeRootPath(param.path),
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

module.exports = {
  s3,
  config,
  configure,
  listDirectoryPromise,
  getURLforPath,
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
};
