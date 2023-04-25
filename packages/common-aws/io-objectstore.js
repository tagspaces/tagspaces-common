const AWS = require("aws-sdk");
// const pathJS = require("path"); DONT use it add for windows platform delimiter \
const { v1: uuidv1 } = require("uuid");
const tsPaths = require("@tagspaces/tagspaces-common/paths");
const AppConfig = require("@tagspaces/tagspaces-common/AppConfig");
const micromatch = require("micromatch");
// const encodeS3URI = require("./encodeS3URI");
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

/**
 * @param param param.path - needs to be not encoded s3().getSignedUrl - this will double encode it
 * @param expirationInSeconds
 * @returns {string}
 */
const getURLforPath = (param, expirationInSeconds = 900) => {
  const path = normalizeRootPath(param.path);
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

/**
 *
 * @param param
 * @param mode = ['extractTextContent', 'extractThumbPath', 'extractThumbURL']
 * @param ignorePatterns
 * @returns {Promise<unknown>}
 */
const listDirectoryPromise = (
  param,
  mode = ["extractThumbPath"],
  ignorePatterns = []
) =>
  new Promise(async (resolve) => {
    const path = param.path;
    const bucketName = param.bucketName;
    const enhancedEntries = [];
    let eentry;

    const loadMeta = mode.some(
      (el) => el === "extractThumbURL" || el === "extractThumbPath"
    );

    let metaContent;
    if (loadMeta) {
      metaContent = await listMetaDirectoryPromise(param);
    }
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
          let ignored = false;
          if (ignorePatterns.length > 0) {
            const isIgnored = micromatch(
              [eentry.path, eentry.name],
              ignorePatterns
            );
            if (isIgnored.length !== 0) {
              ignored = true;
            }
          }
          if (!ignored) {
            enhancedEntries.push(eentry);
            if (loadMeta) {
              metaPromises.push(getEntryMeta(eentry));
            }
          }
        }

        // if (window.walkCanceled) {
        //     resolve(enhancedEntries);
        // }
      });

      // Handling files
      data.Contents.forEach((file) => {
        eentry = {};
        eentry.name = tsPaths.extractFileName(file.Key);
        eentry.path = file.Key;
        eentry.bucketName = bucketName;
        eentry.tags = [];

        let ignored = false;
        if (ignorePatterns.length > 0) {
          const isIgnored = micromatch(
            [eentry.path, eentry.name],
            ignorePatterns
          );
          if (isIgnored.length !== 0) {
            ignored = true;
          }
        }
        if (!ignored) {
          let thumbPath;
          if (loadMeta) {
            thumbPath = tsPaths.getThumbFileLocationForFile(
              file.Key,
              "/",
              false
            );
            if (thumbPath && thumbPath.startsWith("/")) {
              thumbPath = thumbPath.substring(1);
            }
            const thumbAvailable = metaContent.find(
              (obj) => obj.path === thumbPath
            );
            if (thumbAvailable) {
              if (mode.includes("extractThumbURL")) {
                thumbPath = getURLforPath(
                  {
                    path: thumbPath,
                    bucketName: bucketName,
                  },
                  604800
                ); // 60 * 60 * 24 * 7 = 1 week
              }
            } /*else {
            thumbPath = "";
          }*/
          }

          if (thumbPath) {
            eentry.thumbPath = thumbPath;
          }
          eentry.meta = {};
          eentry.isFile = true;
          eentry.size = file.Size;
          eentry.lmdt = Date.parse(file.LastModified);
          if (file.Key !== params.Prefix) {
            // skipping the current folder
            enhancedEntries.push(eentry);
            if (loadMeta) {
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
          }
        }
      });

      if (metaPromises.length > 0) {
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
      } else {
        resolve(enhancedEntries);
      }
    });
  });

const getEntryMeta = async (eentry) => {
  const promise = new Promise(async (resolve) => {
    const entryPath = tsPaths.normalizePath(eentry.path);
    if (eentry.isFile) {
      try {
        const metaFilePath = tsPaths.getMetaFileLocationForFile(entryPath, "/");
        const metaFileContent = await loadTextFilePromise({
          path: metaFilePath,
          bucketName: eentry.bucketName,
        });
        eentry.meta = JSON.parse(metaFileContent.trim());
      } catch (ex) {
        console.warn("Error getEntryMeta for " + entryPath, ex);
      }
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
          try {
            const metaFileContent = await loadTextFilePromise({
              path: folderMetaPath,
              bucketName: eentry.bucketName,
            });
            eentry.meta = JSON.parse(metaFileContent.trim());
          } catch (ex) {
            console.warn("Error getEntryMeta for " + folderMetaPath, ex);
          }
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
 * @returns {Promise<boolean>}
 */
function isFileExist(param) {
  try {
    return s3()
      .headObject({
        Bucket: param.bucketName,
        Key: normalizeRootPath(param.path),
      })
      .promise()
      .then(
        () => true,
        (err) => {
          if (err.code === "NotFound") {
            return false;
          }
          throw err;
        }
      );
  } catch (error) {
    return Promise.resolve(false);
  }
}
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
    return new Promise((resolve) => {
      s3().headObject(params, (err, data) => {
        if (err) {
          // workaround for checking if a folder exists on s3
          // console.log("getPropertiesPromise " + path, err);
          const listParams = {
            Bucket: bucketName,
            Prefix: path,
            MaxKeys: 1,
            Delimiter: "/",
          };
          s3().listObjectsV2(listParams, (listError, listData) => {
            if (listError) {
              resolve(false);
            }
            const folderExists =
              (listData && listData.KeyCount && listData.KeyCount > 0) || // supported on aws s3
              (listData &&
                listData.CommonPrefixes &&
                listData.CommonPrefixes.length > 0); // needed for DO
            if (folderExists) {
              resolve({
                name: tsPaths.extractDirectoryName(path),
                isFile: false,
                size: 0,
                lmdt: undefined,
                path: path,
              });
            } else {
              resolve(false);
            }
          });
        } else {
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
          resolve({
            name: isFile
              ? tsPaths.extractFileName(path)
              : tsPaths.extractDirectoryName(path),
            isFile: !path.endsWith("/"),
            size: data.ContentLength,
            lmdt: data.LastModified, // Date.parse(data.LastModified),
            path,
          });
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
      // console.error("Error getObject " + path + " " + e.message);
      return ""; //Promise.resolve("");
    });
};

/**
 * Persists a given content(binary supported) to a specified filepath (tested)
 * @param param
 * @param content string if undefined reject error
 * @param overWrite
 * @param mode
 * @returns {Promise<{path: *, lmdt: S3.LastModified, isFile: boolean, size: S3.ContentLength, name: (*|string)} | boolean>}
 */
const saveFilePromise = (param, content, overWrite, mode) =>
  new Promise(async (resolve, reject) => {
    if (content === undefined) {
      reject(new Error("content is undefined"));
    } else {
      const path = param.path;
      const bucketName = param.bucketName;
      const lmdt = param.lmdt;
      // let isNewFile = false;
      // eslint-disable-next-line no-param-reassign
      const filePath = normalizeRootPath(path);

      if (lmdt) {
        const fileProps = await getPropertiesPromise({
          path: filePath,
          bucketName: bucketName,
        });
        if (fileProps && fileProps.lmdt.getTime() !== lmdt.getTime()) {
          reject(new Error("File was modified externally"));
          return false;
        }
      }
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
            data && data.Key
              ? data.Key
              : tsPaths.extractFileName(filePath, "/"),
          url: data ? data.Location : filePath,
          isFile: true,
          path: filePath,
          extension: tsPaths.extractFileExtension(filePath, "/"),
          size: content.length,
          lmdt: new Date().getTime(),
          // isNewFile,
        });
      });
    }
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
    isFileExist(param)
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
 * @param param
 * @param file
 * @param overWrite
 * @param onUploadProgress
 * @param onAbort
 * @returns {Promise<TS.FileSystemEntry>}
 */
function uploadFileByMultiPart(
  param,
  file,
  overWrite,
  onUploadProgress,
  onAbort
) {
  return new Promise(async (resolve, reject) => {
    let isNewFile = (await isFileExist(param)) === false;
    if (isNewFile || overWrite === true) {
      createMultipartUpload(param).then(async (uploadId) => {
        onUploadProgress({ key: param.path, loaded: 0, total: file.size }, () =>
          abortMultipartUpload(param, uploadId)
        );
        let partNumber = 0;
        const completedParts = [];
        const chunkSize = 5 * 1024 * 1024; // https://docs.aws.amazon.com/AmazonS3/latest/userguide/qfacts.html
        let offset = 0;
        // const reader = file.stream().getReader(); //{mode: "byob"}); TODO create 5MB limit of chunks with stream
        while (offset < file.size) {
          const chunkFile = await file.slice(offset, offset + chunkSize);
          const chunk = await chunkFile.arrayBuffer();
          onUploadProgress(
            { key: param.path, loaded: offset, total: file.size },
            () => {
              offset = file.size;
              abortMultipartUpload(param, uploadId);
              reject(new Error("stopped:" + file.name));
            }
          );
          /* const { done, value } = await reader.read();
          console.debug(value.length);
          if (done) {
            break;
          } */
          partNumber++;
          completedParts.push(
            uploadPart(
              param,
              new Uint8Array(chunk), // value.toString(),
              partNumber,
              uploadId
            )
          );
          offset += chunkSize;
        }
        Promise.all(completedParts).then((parts) => {
          completeMultipartUpload(param, uploadId, parts).then((fsEntry) => {
            onUploadProgress(
              { key: param.path, loaded: file.size, total: file.size },
              () => abortMultipartUpload(param, uploadId)
            );
            resolve({ ...fsEntry, size: file.size, isNewFile });
          });
        });
      });
    } else {
      reject(new Error("file exist:" + file.name));
    }
  });
}

/**
 * @param param
 * @param chunk: string
 * @param partNumber: number
 * @param uploadId: string
 * @returns {Promise<unknown>}
 */
function uploadPart(param, chunk, partNumber, uploadId) {
  return new Promise((resolve, reject) => {
    const params = {
      Body: chunk,
      Bucket: param.bucketName,
      Key: param.path,
      PartNumber: partNumber,
      UploadId: uploadId,
    };
    s3().uploadPart(params, function (err, data) {
      if (err) {
        reject(err);
      } else {
        resolve({
          ETag: data.ETag,
          PartNumber: partNumber,
        });
      }
    });
  });
}

/**
 * @param param
 * @returns {Promise<string>}
 */
function createMultipartUpload(param) {
  const params = {
    Bucket: param.bucketName,
    Key: param.path,
  };
  return new Promise((resolve, reject) => {
    s3().createMultipartUpload(params, function (err, data) {
      if (err) {
        reject(err);
      } else {
        resolve(data.UploadId);
      }
    });
  });
}

/**
 * @param param
 * @param uploadId: string
 * @param parts: CompletedPart[]
 * @returns {Promise<TS.FileSystemEntry>}
 */
function completeMultipartUpload(param, uploadId, parts) {
  const filePath = normalizeRootPath(param.path);
  if (Array.isArray(parts) && parts.length > 0) {
    const params = {
      Bucket: param.bucketName,
      Key: param.path,
      UploadId: uploadId,
      MultipartUpload: {
        Parts: parts,
      },
    };
    return s3()
      .completeMultipartUpload(params)
      .promise()
      .then((data) => ({
        uuid: uuidv1(), // data.ETag,
        name: data.Key ? data.Key : tsPaths.extractFileName(filePath, "/"),
        url: data.Location,
        isFile: true,
        path: filePath,
        extension: tsPaths.extractFileExtension(filePath, "/"),
        lmdt: new Date().getTime(),
        tags: [],
      }));
  }
  return abortMultipartUpload(param, uploadId);
}

function abortMultipartUpload(param, uploadId) {
  return s3()
    .abortMultipartUpload({
      Bucket: param.bucketName,
      Key: param.path,
      UploadId: uploadId,
    })
    .promise();
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
        return dirPath;
      }
      const metaFilePath = tsPaths.getMetaFileLocationForDir(dirPath, "/");
      const metaContent = '{"id":"' + uuidv1() + '"}';
      // create meta file with id -> empty folders cannot be shown on S3
      return saveTextFilePromise(
        { ...param, path: metaFilePath },
        metaContent,
        false
      ).then(() => dirPath);
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
function renameFilePromise(param, newFilePath, onProgress = undefined) {
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

function renameDirectoryPromise(param, newDirName) {
  const parenDirPath = tsPaths.extractParentDirectoryPath(param.path, "/");
  const newDirPath = normalizeRootPath(parenDirPath + "/" + newDirName);
  if (param.path === newDirPath) {
    return Promise.reject(
      "Renaming directory failed, directories have the same path"
    );
  }
  return moveDirectoryPromise(param, newDirPath);
}
/**
 * Rename a directory
 */
function moveDirectoryPromise(param, newDirectoryPath) {
  // const dirName = tsPaths.extractDirectoryName(param.path, "/");
  //const parenDirPath = tsPaths.extractParentDirectoryPath(param.path, "/");
  //const newDirPath = normalizeRootPath(parenDirPath + "/" + newDirectoryPath);
  console.log("Move directory: " + param.path + " to " + newDirectoryPath);
  return copyDirectoryPromise(param, newDirectoryPath).then(() =>
    deleteDirectoryPromise(param).then(() => newDirectoryPath)
  );
  /*
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
              createDirectoryPromise({
                ...param,
                path:
                  tsPaths.cleanTrailingDirSeparator(newDirectoryPath) +
                  "/" +
                  dirName,
              })
            );
          } else {
            const newFilePath =
              tsPaths.cleanTrailingDirSeparator(newDirectoryPath) +
              "/" +
              dirName +
              "/" +
              tsPaths.extractFileName(Key, "/");
            promises.push(
              copyFilePromise({ ...param, path: Key }, newFilePath)
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
    });*/
}

function copyDirectoryPromise(param, newDirPath, onProgress = undefined) {
  return getDirectoryPrefixes(param).then((prefixes) => {
    if (prefixes.length > 0) {
      const files = prefixes.filter((file) => !file.Key.endsWith("/"));
      const copyParams = {
        Bucket: param.bucketName,
        CopySource: files.map((file) => param.bucketName + "/" + file.Key),
        Key: files.map((file) => {
          return (
            tsPaths.cleanTrailingDirSeparator(newDirPath) +
            "/" +
            tsPaths.extractDirectoryName(param.path) +
            "/" +
            tsPaths.extractFileName(file.Key)
          );
        }),
      };
      /*const copyParams = prefixes
        .filter((file) => !file.Key.endsWith("/"))
        .map((file) => {
          const filePath = file.Key;
          const destFile =
            tsPaths.cleanTrailingDirSeparator(newDirPath) +
            "/" +
            tsPaths.extractDirectoryName(param.path) +
            "/" +
            tsPaths.extractFileName(filePath);
          return {
            Bucket: param.bucketName,
            CopySource: {
              Bucket: param.bucketName,
              Key: filePath,
            },
            Key: destFile,
          };
        });*/
      return new Promise((resolve, reject) => {
        s3().copyObjects(copyParams, function (err, data) {
          if (err) {
            console.log("Error copying objects: ", err);
            reject(err);
          } else {
            console.log("Objects copied successfully: ", data);
            resolve(newDirPath);
          }
        });
      });
    }
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
      addPrefix(prefixes, { Key });
    });

    listedObjects.CommonPrefixes.forEach(({ Prefix }) => {
      addPrefix(prefixes, { Key: Prefix });
      promises.push(getDirectoryPrefixes({ ...param, path: Prefix }));
    });
    // if (listedObjects.IsTruncated) await this.deleteDirectoryPromise(path);
  }
  const subPrefixes = await Promise.all(promises);
  subPrefixes.map((arrPrefixes) => {
    arrPrefixes.map((prefix) => {
      addPrefix(prefixes, prefix);
    });
  });
  return prefixes;
}

function addPrefix(prefixes, prefix) {
  if (!prefixes.some((obj) => obj.Key === prefix.Key)) {
    prefixes.push(prefix);
  }
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
  s3,
  config,
  configure,
  listDirectoryPromise,
  listMetaDirectoryPromise,
  getURLforPath,
  saveFilePromise,
  saveTextFilePromise,
  getPropertiesPromise,
  loadTextFilePromise,
  getFileContentPromise,
  saveBinaryFilePromise,
  uploadFileByMultiPart,
  createDirectoryPromise,
  copyFilePromise,
  renameFilePromise,
  renameDirectoryPromise,
  moveDirectoryPromise,
  copyDirectoryPromise,
  deleteFilePromise,
  deleteDirectoryPromise,
  openUrl,
  openFile,
};
