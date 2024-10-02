const {
  S3Client,
  GetObjectCommand,
  ListObjectsV2Command,
  HeadObjectCommand,
  PutObjectCommand,
  CopyObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
} = require("@aws-sdk/client-s3");
const { Upload } = require("@aws-sdk/lib-storage");
//const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
/*const { formatUrl } = require("@aws-sdk/util-format-url");
const { createRequest } = require("@aws-sdk/util-create-request");*/
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const CryptoJS = require("crypto-js");
// const pathJS = require("path"); DONT use it add for windows platform delimiter \
const { v1: uuidv1 } = require("uuid");
const tsPaths = require("@tagspaces/tagspaces-common/paths");
const AppConfig = require("@tagspaces/tagspaces-common/AppConfig");
const picomatch = require("picomatch/posix");
const {
  runPromisesSynchronously,
} = require("@tagspaces/tagspaces-common/utils-io");

const locationsCache = [];
const awsRegions = [
  "us-central-1",
  "us-east-1",
  "us-east-2",
  "us-west-1",
  "us-west-2",
  "af-south-1",
  "ap-east-1",
  "ap-south-1",
  "ap-northeast-1",
  "ap-northeast-2",
  "ap-northeast-3",
  "ap-southeast-1",
  "ap-southeast-2",
  "ca-central-1",
  "eu-central-1",
  "eu-central-2",
  "eu-west-1",
  "eu-west-2",
  "eu-west-3",
  "eu-north-1",
  "eu-south-1",
  "me-south-1",
  "sa-east-1",
];

function s3(location) {
  if (location) {
    if (locationsCache[location.uuid]) {
      if (
        locationsCache[location.uuid].lastEditedDate === location.lastEditedDate
      ) {
        return locationsCache[location.uuid];
      }
    }
    const advancedMode =
      location.endpointURL && location.endpointURL.length > 7;
    if (advancedMode) {
      const region =
        location.region && location.region.length > 0
          ? location.region
          : awsRegions.find((reg) => location.endpointURL.indexOf(reg) > -1);
      const config = {
        endpoint: location.endpointURL,
        region: region || "auto",
        credentials: {
          accessKeyId: location.accessKeyId,
          secretAccessKey: location.secretAccessKey,
          sessionToken: location.sessionToken,
        },
        forcePathStyle: true, // needed for minio
        signatureVersion: "v4", // needed for signed url of encrypted file
        //logger: console, todo enable logging in dev build
      };
      locationsCache[location.uuid] = new S3Client(config);
    } else {
      const config = {
        region: location.region,
        credentials: {
          accessKeyId: location.accessKeyId,
          secretAccessKey: location.secretAccessKey,
        },
        signatureVersion: "v4",
      };
      locationsCache[location.uuid] = new S3Client(config);
    }
    return locationsCache[location.uuid];
  }
}

function getEncryptionHeaders(ENCRYPTION_KEY) {
  if (ENCRYPTION_KEY.length !== 32) {
    // throw new Error('The encryption key must be 32 characters long.');
    return {};
  }
  const encoder = new TextEncoder();
  const ENCRYPTION_KEY_UINT8ARRAY = encoder.encode(ENCRYPTION_KEY);

  const ENCRYPTION_KEY_MD5 = CryptoJS.MD5(ENCRYPTION_KEY).toString(
    CryptoJS.enc.Base64
  );
  return {
    SSECustomerAlgorithm: "AES256",
    SSECustomerKey: ENCRYPTION_KEY_UINT8ARRAY,
    SSECustomerKeyMD5: ENCRYPTION_KEY_MD5,
  };
}

/**
 * @param param param.path - needs to be not encoded s3().getSignedUrl - this will double encode it
 * @param expirationInSeconds
 * @returns {Promise<string>}
 */
const getURLforPath = (param, expirationInSeconds = 900) => {
  const path = normalizeRootPath(param.path);
  const bucketName = param.bucketName;
  if (!path || path.length < 1) {
    console.warn("Wrong path param for getURLforPath");
    return Promise.resolve("");
  }
  const params = {
    Bucket: bucketName,
    Key: path,
    //...(param.isEncrypted && {SSECustomerAlgorithm: "AES256"}),
  };
  try {
    const s3Client = s3(param.location);
    /*const signer = new S3RequestPresigner({ ...s3Client.config });
    return createRequest(s3Client, new GetObjectCommand(params))
      .then((request) =>
        signer.presign(request, { expiresIn: expirationInSeconds })
      )
      .then((url) => formatUrl(url));*/

    const command = new GetObjectCommand(params);
    return getSignedUrl(s3Client, command, {
      expiresIn: expirationInSeconds,
    });
  } catch (e) {
    console.error("Error by getSignedUrl: ", e);
    return Promise.resolve("");
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
    ...(param.encryptionKey && getEncryptionHeaders(param.encryptionKey)),
  };

  try {
    const s3Client = s3(param.location);
    const command = new ListObjectsV2Command(params);
    const data = await s3Client.send(command);

    const contents = data.Contents || [];
    // Handling files
    contents.forEach((file) => {
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
  } catch (err) {
    console.warn("Error listing meta directory " + path, err);
    return entries; // returning results even if any promise fails
  }
};

/**
 * @param param
 * @param mode = ['extractTextContent', 'extractThumbPath', 'extractThumbURL']
 * @param ignorePatterns
 * @param resultsLimit = {maxLoops: number, IsTruncated: boolean}
 * @returns {Promise<>}
 */
const listDirectoryPromise = (
  param,
  mode = ["extractThumbPath"],
  ignorePatterns = [],
  resultsLimit = {}
) =>
  new Promise(async (resolve, reject) => {
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
    listDirectoryAll(params, param.location, resultsLimit.maxLoops)
      .then(async (data) => {
        const metaPromises = [];

        if (data.IsTruncated) {
          resultsLimit.IsTruncated = data.IsTruncated;
        }

        const commonPrefixes = data.CommonPrefixes || [];
        // Handling "directories"
        commonPrefixes.forEach((dir) => {
          // console.warn(JSON.stringify(dir));
          const prefix = dir.Prefix; // normalizePath(normalizeRootPath(dir.Prefix));
          eentry = {};
          const prefixArray = prefix.replace(/\/$/, "").split("/");
          eentry.name = prefixArray[prefixArray.length - 1]; // dir.Prefix.substring(0, dir.Prefix.length - 1);
          eentry.path = prefix;
          eentry.bucketName = bucketName;
          eentry.tags = [];
          eentry.meta = {};
          eentry.isFile = false;
          eentry.size = 0;
          eentry.lmdt = 0;

          if (eentry.path !== params.Prefix) {
            // skipping the current directory
            let ignored = false;
            if (ignorePatterns.length > 0) {
              const isMatch = picomatch(ignorePatterns);
              ignored = isMatch(eentry.path) || isMatch(eentry.name);
            }
            if (!ignored) {
              enhancedEntries.push(eentry);
              if (loadMeta) {
                metaPromises.push(
                  getEntryMeta(
                    eentry,
                    param.location,
                    param.location.encryptionKey
                  )
                );
              }
            }
          }

          // if (window.walkCanceled) {
          //     resolve(enhancedEntries);
          // }
        });

        const contents = data.Contents || [];
        // Handling files
        for (const file of contents) {
          eentry = {};
          eentry.name = tsPaths.extractFileName(file.Key);
          eentry.path = file.Key;
          eentry.bucketName = bucketName;
          eentry.tags = [];

          let ignored = false;
          if (ignorePatterns.length > 0) {
            const isMatch = picomatch(ignorePatterns);
            ignored = isMatch(eentry.path) || isMatch(eentry.name);
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
                  thumbPath = await getURLforPath(
                    {
                      path: thumbPath,
                      bucketName: bucketName,
                      location: param.location,
                    },
                    604800
                  ); // 60 * 60 * 24 * 7 = 1 week
                }
              } else {
                thumbPath = undefined;
              }
            }

            eentry.meta = thumbPath ? { thumbPath } : {};
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
                  metaPromises.push(
                    getEntryMeta(
                      eentry,
                      param.location,
                      param.location.encryptionKey
                    )
                  );
                }
              }
            }
          }
        }

        if (metaPromises.length > 0) {
          Promise.all(metaPromises)
            .then((entriesMeta) => {
              const entriesMetaMap = new Map(
                entriesMeta.map((e) => [e.path, e])
              );

              const updatedEntries = enhancedEntries.map((enhancedEntry) => {
                const entryMeta = entriesMetaMap.get(enhancedEntry.path);
                if (entryMeta) {
                  return {
                    ...enhancedEntry,
                    meta: { ...enhancedEntry.meta, ...entryMeta },
                  };
                }
                return enhancedEntry;
              });
              /*entriesMeta.forEach((entryMeta) => {
                enhancedEntries.some((enhancedEntry) => {
                  if (enhancedEntry.path === entryMeta.path) {
                    enhancedEntry.meta = {...enhancedEntry.meta,...entryMeta.meta};
                    return true;
                  }
                  return false;
                });
              });*/
              resolve(updatedEntries);
              return true;
            })
            .catch(() => {
              resolve(enhancedEntries);
            });
        } else {
          resolve(enhancedEntries);
        }
      })
      .catch((error) => {
        console.error(
          "Error listing directory " +
            params.Prefix +
            " bucketName:" +
            bucketName,
          error
        );
        // resolve(enhancedEntries);
        reject(error);
      });
  });

/**
 * @param param
 * @param location
 * @param maxLoops
 * @returns {Promise<data>}
 */
function listDirectoryAll(param, location, maxLoops = 5) {
  return new Promise((resolve, reject) => {
    let allObjects = {
      CommonPrefixes: [],
      Contents: [],
      IsTruncated: false,
    };
    let loop = 0;
    let token = undefined;

    const s3Client = s3(location);

    function listObjects() {
      const params = {
        ...param,
        ContinuationToken: token,
      };

      const command = new ListObjectsV2Command(params);

      s3Client
        .send(command)
        .then((data) => {
          const commonPrefixes = data.CommonPrefixes || [];
          allObjects.CommonPrefixes = [
            ...allObjects.CommonPrefixes,
            ...commonPrefixes,
          ];
          const contents = data.Contents || [];
          allObjects.Contents = [...allObjects.Contents, ...contents];
          allObjects.IsTruncated = data.IsTruncated;

          if (data.IsTruncated && loop < maxLoops) {
            loop += 1;
            token = data.NextContinuationToken;
            listObjects(token);
          } else {
            resolve(allObjects);
          }
        })
        .catch((err) => {
          reject(`Error listing directory: ${err.message}`);
        });
    }

    listObjects();
  });
}

/**
 * @param eentry
 * @param location
 * @param encryptionKey
 * @returns {Promise<TS>FileSystemEntryMeta>}
 */
const getEntryMeta = async (eentry, location, encryptionKey) => {
  const entryPath = tsPaths.normalizePath(eentry.path);
  if (eentry.isFile) {
    try {
      const metaFilePath = tsPaths.getMetaFileLocationForFile(entryPath, "/");
      const metaFileContent = await loadTextFilePromise({
        path: metaFilePath,
        bucketName: eentry.bucketName,
        location,
        encryptionKey,
      });
      return JSON.parse(metaFileContent.trim());
    } catch (ex) {
      console.warn("Error getEntryMeta for " + entryPath, ex);
      return {};
    }
  } else {
    if (
      !entryPath.includes("/" + AppConfig.metaFolder) &&
      !entryPath.includes(AppConfig.metaFolder + "/")
    ) {
      // skipping meta folder
      let meta = {};
      const folderTmbPath =
        entryPath +
        "/" +
        AppConfig.metaFolder +
        "/" +
        AppConfig.folderThumbFile;
      const folderThumbProps = await getPropertiesPromise({
        path: folderTmbPath,
        bucketName: eentry.bucketName,
        location,
        encryptionKey,
      });
      if (folderThumbProps && folderThumbProps.isFile) {
        const thumb = await getURLforPath(
          {
            path: folderTmbPath,
            bucketName: eentry.bucketName,
            location,
          },
          604800
        ); // 60 * 60 * 24 * 7 = 1 week ;

        meta = { thumbPath: thumb };
      }
      // }
      // if (!eentry.path.endsWith(AppConfig.metaFolder + '/')) { // Skip the /.ts folder
      const folderMetaPath =
        entryPath + "/" + AppConfig.metaFolder + "/" + AppConfig.metaFolderFile;
      const folderProps = await getPropertiesPromise({
        path: folderMetaPath,
        bucketName: eentry.bucketName,
        location,
        encryptionKey,
      });
      if (folderProps && folderProps.isFile) {
        try {
          const metaFileContent = await loadTextFilePromise({
            path: folderMetaPath,
            bucketName: eentry.bucketName,
            location,
            encryptionKey,
          });
          if (metaFileContent) {
            meta = { ...meta, ...JSON.parse(metaFileContent.trim()) };
          }
        } catch (ex) {
          console.warn("Error getEntryMeta for " + folderMetaPath, ex);
        }
        // console.log('Folder meta for ' + eentry.path + ' - ' + JSON.stringify(eentry.meta));
      }
      return meta;
    }
    return {};
  }
};

/**
 * @param param
 * @returns {Promise<boolean>}
 */
function isFileExist(param) {
  return new Promise((resolve, reject) => {
    try {
      const s3Client = s3(param.location);
      const command = new HeadObjectCommand({
        Bucket: param.bucketName,
        Key: normalizeRootPath(param.path),
        ...(param.encryptionKey && getEncryptionHeaders(param.encryptionKey)),
      });

      s3Client.send(command).then(
        () => resolve(true),
        (err) => {
          if (err.name === "NotFound") {
            resolve(false);
          } else {
            reject(err);
          }
        }
      );
    } catch (error) {
      resolve(false);
    }
  });
}
/**
 * @param param
 * @returns {Promise<{path: *, lmdt: S3.LastModified, isFile: boolean, size: S3.ContentLength, name: (*|string)} | boolean>} true - encryption error
 */
function getPropertiesPromise(param) {
  const path = normalizeRootPath(param.path);
  const bucketName = param.bucketName;
  if (path) {
    const params = {
      Bucket: bucketName,
      Key: path,
      ...(param.encryptionKey && getEncryptionHeaders(param.encryptionKey)),
    };
    return new Promise((resolve) => {
      const s3Client = s3(param.location);
      const headCommand = new HeadObjectCommand(params);

      s3Client
        .send(headCommand)
        .then((data) => {
          const isFile = !path.endsWith("/");
          resolve({
            name: isFile
              ? tsPaths.extractFileName(path)
              : tsPaths.extractDirectoryName(path),
            isFile: !path.endsWith("/"),
            size: data.ContentLength,
            isEncrypted: !!param.encryptionKey, //data.SSECustomerAlgorithm === 'AES256',
            lmdt:
              data.LastModified instanceof Date
                ? data.LastModified.getTime()
                : data.LastModified,
            path,
          });
        })
        .catch((err) => {
          if (err && err.name === "400") {
            // encryption error
            resolve(true);
          } else {
            // Workaround for checking if a folder exists on S3
            const listParams = {
              Bucket: bucketName,
              Prefix: path,
              MaxKeys: 1,
              Delimiter: "/",
            };
            const listCommand = new ListObjectsV2Command(listParams);

            s3Client
              .send(listCommand)
              .then((listData) => {
                const folderExists =
                  (listData && listData.KeyCount && listData.KeyCount > 0) ||
                  (listData &&
                    listData.CommonPrefixes &&
                    listData.CommonPrefixes.length > 0);

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
              })
              .catch((e) => {
                console.error(e);
                resolve(false);
              });
          }
        });
    });
  } else {
    // Root folder
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
 * @returns {Promise<string | undefined>}
 */
function getFileContentPromise(param, type = "text", isPreview = false) {
  const path = normalizeRootPath(param.path);
  const bucketName = param.bucketName;
  const params = {
    Bucket: bucketName,
    Key: path,
    Range: isPreview ? "bytes=0-10000" : "",
    ResponseCacheControl: "no-cache",
    ...(param.encryptionKey && getEncryptionHeaders(param.encryptionKey)),
  };

  return new Promise((resolve, reject) => {
    const s3Client = s3(param.location);
    const command = new GetObjectCommand(params);

    s3Client
      .send(command)
      .then((data) => {
        if (data.Body) {
          if (type === "text") {
            resolve(data.Body.transformToString("utf-8")); //streamToString(data.Body).then(resolve).catch(reject);
          } else if (type === "arraybuffer") {
            resolve(data.Body.transformToByteArray());
          } else {
            resolve(data.Body.transformToWebStream());
          }
        } else {
          resolve("");
        }
      })
      .catch((e) => {
        console.log(e);
        if(e.message && e.message.indexOf("The object was stored using a form of Server Side Encryption") !== -1){
          resolve(undefined);
        } else {
          resolve(""); // Return an empty string on error
        }
      });
  });
}

/**
 * Persists a given content(binary supported) to a specified filepath (tested)
 * @param param
 * @param content string if undefined reject error
 * @param overWrite
 * @param mode
 * @returns {Promise<{path: *, lmdt: S3.LastModified, isFile: boolean, size: S3.ContentLength, name: (*|string)} | boolean>}
 */
const saveFilePromise = (param, content, overWrite, mode) =>
  new Promise((resolve, reject) => {
    if (content === undefined) {
      reject(new Error("content is undefined"));
      return;
    }

    const path = param.path;
    const bucketName = param.bucketName;
    const lmdt = param.lmdt;
    const filePath = normalizeRootPath(path);

    const handleSave = () => {
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
        ...(param.encryptionKey && getEncryptionHeaders(param.encryptionKey)),
      };

      const s3Client = s3(param.location);
      const command = new PutObjectCommand(params);

      s3Client
        .send(command)
        .then((data) => {
          return getPropertiesPromise({
            path: filePath,
            bucketName: bucketName,
            location: param.location,
            ...(param.encryptionKey && { encryptionKey: param.encryptionKey }),
          }).then((entry) => {
            resolve({
              ...entry,
              uuid: data ? data.ETag : uuidv1(),
              url: data ? data.Location : filePath,
              isFile: true,
              extension: tsPaths.extractFileExtension(filePath, "/"),
            });
          });
        })
        .catch((err) => {
          console.error("Error upload " + filePath, err);
          resolve(false);
        });
    };

    if (lmdt) {
      getPropertiesPromise({
        path: filePath,
        bucketName: bucketName,
        location: param.location,
        ...(param.encryptionKey && { encryptionKey: param.encryptionKey }),
      })
        .then((fileProps) => {
          if (fileProps && fileProps.lmdt !== lmdt) {
            reject(new Error("File was modified externally"));
          } else {
            handleSave();
          }
        })
        .catch(reject);
    } else {
      handleSave();
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
  try {
    return decodeURIComponent(filePath);
  } catch (e) {
    console.error("Failed to decode URI component:", e);
    return filePath; // Return the original path if decoding fails
  }
}

/**
 * Persists a given binary content to a specified filepath (tested)
 * return : Promise<TS.FileSystemEntry>
 */
async function saveBinaryFilePromise(
  param,
  content,
  overWrite,
  onUploadProgress,
  onAbort
) {
  if (content === undefined) {
    throw new Error("content is undefined");
  }

  const filePath = tsPaths.normalizePath(normalizeRootPath(param.path));
  const bucketName = param.bucketName;
  const lmdt = param.lmdt;

  // Check if file exists and handle overwrite logic if needed
  if (lmdt && !overWrite) {
    const fileProps = await getPropertiesPromise(param);
    if (fileProps && fileProps.lmdt !== lmdt) {
      return Promise.reject("File was modified externally");
    }
  }

  const params = {
    Bucket: bucketName,
    Key: filePath,
    Body: content,
    ...(param.encryptionKey && getEncryptionHeaders(param.encryptionKey)),
  };

  const parallelUploads = new Upload({
    client: s3(param.location),
    params: params,
    leavePartsOnError: false, // optional manually handle dropped parts
  });
  if (onUploadProgress) {
    parallelUploads.on("httpUploadProgress", (progress) => {
      if (onUploadProgress) {
        onUploadProgress(
          { key: progress.Key, loaded: progress.loaded, total: progress.total },
          () => parallelUploads.abort()
        );
      }
    });
  }
  if (onAbort) {
    onAbort = () => parallelUploads.abort();
  }
  try {
    return parallelUploads.done().then((uploadObj) => {
      return {
        uuid: uuidv1(),
        name: tsPaths.extractFileName(filePath),
        path: filePath,
        url: uploadObj.Location,
        isFile: true,
        extension: tsPaths.extractFileExtension(filePath),
        size: content.length,
        lmdt: new Date().getTime(),
      };
    });
  } catch (err) {
    // console.error("Error upload " + filePath, err);
    throw new Error("saveBinaryFilePromise " + filePath, err);
  }
  /*const putObjectCommand = new PutObjectCommand(params);
    return s3(param.location).send(
      putObjectCommand
    )*/
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
  return new Promise((resolve, reject) => {
    isFileExist(param)
      .then((isFileExists) => {
        const isNewFile = !isFileExists;
        if (isNewFile || overWrite === true) {
          createMultipartUpload(param)
            .then((uploadId) => {
              onUploadProgress(
                { key: param.path, loaded: 0, total: file.size },
                () => abortMultipartUpload(param, uploadId)
              );

              let partNumber = 0;
              const completedParts = [];
              const chunkSize = 5 * 1024 * 1024; // 5 MB
              let offset = 0;

              const uploadNextPart = () => {
                if (offset < file.size) {
                  const chunkFile = file.slice(offset, offset + chunkSize);
                  chunkFile
                    .arrayBuffer()
                    .then((chunk) => {
                      onUploadProgress(
                        { key: param.path, loaded: offset, total: file.size },
                        () => {
                          offset = file.size;
                          abortMultipartUpload(param, uploadId);
                          reject(new Error("stopped:" + file.name));
                        }
                      );

                      partNumber++;
                      uploadPart(
                        param,
                        new Uint8Array(chunk),
                        partNumber,
                        uploadId
                      )
                        .then((part) => {
                          completedParts.push(part);
                          offset += chunkSize;
                          uploadNextPart();
                        })
                        .catch(reject);
                    })
                    .catch(reject);
                } else {
                  completeMultipartUpload(param, uploadId, completedParts)
                    .then((fsEntry) => {
                      onUploadProgress(
                        {
                          key: param.path,
                          loaded: file.size,
                          total: file.size,
                        },
                        () => abortMultipartUpload(param, uploadId)
                      );
                      resolve({ ...fsEntry, size: file.size, isNewFile });
                    })
                    .catch(reject);
                }
              };

              uploadNextPart();
            })
            .catch(reject);
        } else {
          reject(new Error("file exists: " + file.name));
        }
      })
      .catch(reject);
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
    const command = new UploadPartCommand(params);
    s3(param.location)
      .send(command)
      .then((data) => {
        resolve({
          ETag: data.ETag,
          PartNumber: partNumber,
        });
      })
      .catch(reject);
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
  const command = new CreateMultipartUploadCommand(params);
  return s3(param.location)
    .send(command)
    .then((data) => data.UploadId)
    .catch((err) => Promise.reject(err));
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
    const command = new CompleteMultipartUploadCommand(params);
    return s3(param.location)
      .send(command)
      .then((data) => ({
        uuid: uuidv1(), // data.ETag,
        name: data.Key ? data.Key : tsPaths.extractFileName(filePath, "/"),
        url: data.Location,
        isFile: true,
        path: filePath,
        extension: tsPaths.extractFileExtension(filePath, "/"),
        lmdt: new Date().getTime(),
        tags: [],
      }))
      .catch((err) => Promise.reject(err));
  }
  return abortMultipartUpload(param, uploadId);
}

function abortMultipartUpload(param, uploadId) {
  const params = {
    Bucket: param.bucketName,
    Key: param.path,
    UploadId: uploadId,
  };
  const command = new AbortMultipartUploadCommand(params);
  return s3(param.location)
    .send(command)
    .catch((err) => Promise.reject(err));
}

/**
 * Creates a directory. S3 does not have folders or files; it has buckets and objects. Buckets are used to store objects (tested)
 * @param param = { path: newDirectory/ }
 * @returns {Promise<>}
 */
function createDirectoryPromise(param) {
  const dirPath = tsPaths.normalizePath(normalizeRootPath(param.path)) + "/";
  console.log("Creating directory: " + dirPath);

  const params = {
    Bucket: param.bucketName,
    Key: dirPath,
  };
  const command = new PutObjectCommand(params);

  return s3(param.location)
    .send(command)
    .then((result) => {
      if (dirPath.endsWith(AppConfig.metaFolder + "/")) {
        return dirPath;
      }
      const metaFilePath = tsPaths.getMetaFileLocationForDir(dirPath, "/");
      const metaContent = '{"id":"' + uuidv1() + '"}';

      // Create meta file with id -> empty folders cannot be shown on S3
      return saveTextFilePromise(
        { ...param, path: metaFilePath },
        metaContent,
        false
      ).then(() => dirPath);
    })
    .catch((err) => {
      console.error("Error creating directory: " + dirPath, err);
      return undefined;
      //throw err;
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
    return Promise.reject("Copying file failed, files have the same path");
  }

  let encryptionParams;
  if (param.encryptionKey) {
    const headerParams = getEncryptionHeaders(param.encryptionKey);
    const copySourcesParam = {
      CopySourceSSECustomerAlgorithm: headerParams.SSECustomerAlgorithm,
      CopySourceSSECustomerKey: headerParams.SSECustomerKey,
      CopySourceSSECustomerKeyMD5: headerParams.SSECustomerKeyMD5,
    };
    encryptionParams = { ...headerParams, ...copySourcesParam };
  }
  const copyParams = {
    Bucket: param.bucketName,
    CopySource: encodeURI(param.bucketName + "/" + nFilePath), //encodeS3URI
    Key: nNewFilePath, //encodeS3URI
    ...encryptionParams,
  };
  const command = new CopyObjectCommand(copyParams);

  return s3(param.location).send(command);
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
    return Promise.reject("Renaming file failed, files have the same path");
  }

  // Copy the object to a new location
  let encryptionParams;
  if (param.encryptionKey) {
    const headerParams = getEncryptionHeaders(param.encryptionKey);
    const copySourcesParam = {
      CopySourceSSECustomerAlgorithm: headerParams.SSECustomerAlgorithm,
      CopySourceSSECustomerKey: headerParams.SSECustomerKey,
      CopySourceSSECustomerKeyMD5: headerParams.SSECustomerKeyMD5,
    };
    encryptionParams = { ...headerParams, ...copySourcesParam };
  }
  const copyParams = {
    Bucket: param.bucketName,
    CopySource: encodeURI(param.bucketName + "/" + nFilePath), // encodeS3URI(nFilePath),
    Key: nNewFilePath, //encodeS3URI
    ...encryptionParams,
  };
  const copyCommand = new CopyObjectCommand(copyParams);

  const deleteParams = {
    Bucket: param.bucketName,
    Key: nFilePath,
  };
  const deleteCommand = new DeleteObjectCommand(deleteParams);

  const s3Client = s3(param.location);

  return s3Client
    .send(copyCommand)
    .then(() => s3Client.send(deleteCommand))
    .then(() => [param.path, nNewFilePath])
    .catch((e) => {
      console.log(e);
      return Promise.reject("Renaming file failed: " + e.message);
    });
}

/**
 * @param param param.path = /root/dir1
 * @param newDirName = dir2
 * @returns {Promise<>|Promise<[]>}
 */
function renameDirectoryPromise(param, newDirName, onProgress) {
  const parenDirPath = tsPaths.extractParentDirectoryPath(param.path, "/");
  const newDirPath = normalizeRootPath(parenDirPath + "/" + newDirName);
  if (param.path === newDirPath) {
    return Promise.reject(
      "Renaming directory failed, directories have the same path"
    );
  }
  /**
   *   param.path = /root/dir1
   *   newDirPath = /root/dir2
   */
  return moveDirectoryPromise(param, newDirPath, onProgress);
}

/**
 * Move a directory
 * @param param param.path = /root/dir
 * @param newDirPath = /root2/dir
 * @returns {Promise<*[]>}
 */
function moveDirectoryPromise(param, newDirPath, onProgress) {
  // const dirName = tsPaths.extractDirectoryName(param.path, "/");
  // const newDirPath = tsPaths.cleanTrailingDirSeparator(newDirectoryPath) + "/" + dirName;
  console.log("Move directory: " + param.path + " to " + newDirPath);
  return getDirectoryPrefixes(param).then((prefixes) =>
    copyDirectoryInternal(param, newDirPath, prefixes, onProgress).then(() =>
      deleteDirectoryInternal(param, prefixes).then(() => newDirPath)
    )
  );
}

function copyDirectoryPromise(param, newDirPath, onProgress = undefined) {
  return getDirectoryPrefixes(param).then((prefixes) =>
    copyDirectoryInternal(param, newDirPath, prefixes, onProgress)
  );
}

function copyDirectoryInternal(
  param,
  newDirPath,
  prefixes,
  onProgress = undefined
) {
  let part = 0;
  let running = true;
  function handleProgress(Key) {
    if (onProgress && running) {
      part += 1;
      const progress = {
        loaded: part,
        total: prefixes.length,
        key: newDirPath,
      };
      onProgress(
        progress,
        () => {
          running = false;
        },
        Key
      );
    }
  }
  if (prefixes.length > 0) {
    const promises = [];
    for (const { Key } of prefixes) {
      if (Key.endsWith("/")) {
        promises.push(
          createDirectoryPromise({
            ...param,
            path: Key.replace(
              tsPaths.cleanFrontDirSeparator(tsPaths.normalizePath(param.path)),
              tsPaths.cleanFrontDirSeparator(newDirPath)
            ),
          }).then(() => {
            handleProgress(Key);
          })
        );
      } else {
        promises.push(
          copyFilePromise(
            { ...param, path: Key },
            Key.replace(
              tsPaths.cleanFrontDirSeparator(tsPaths.normalizePath(param.path)),
              tsPaths.cleanFrontDirSeparator(newDirPath)
            )
          ).then(() => {
            handleProgress(Key);
          })
        );
      }
    }
    return runPromisesSynchronously(promises).then(() => newDirPath);
  }
  return Promise.reject(new Error("No dir content in:" + param.path));
}

/**
 * Delete a specified file
 */
function deleteFilePromise(param) {
  try {
    const deleteParams = {
      Bucket: param.bucketName,
      Key: normalizeRootPath(param.path),
    };
    const deleteCommand = new DeleteObjectCommand(deleteParams);

    const s3Client = s3(param.location);
    return s3Client.send(deleteCommand);
  } catch (ex) {
    console.error("Delete error:" + param.path, ex);
    return Promise.resolve(false);
  }
}

/**
 * Delete a specified directory
 * @param param
 * @returns {Promise<*[]>}
 */
function deleteDirectoryPromise(param) {
  return getDirectoryPrefixes(param).then((prefixes) =>
    deleteDirectoryInternal(param, prefixes)
  );
}

async function deleteDirectoryInternal(param, prefixes) {
  if (prefixes.length > 0) {
    const deleteParams = {
      Bucket: param.bucketName,
      Delete: { Objects: prefixes },
    };

    try {
      const deleteCommand = new DeleteObjectsCommand(deleteParams);
      return await s3(param.location).send(deleteCommand);
    } catch (e) {
      console.error(e);
      return Promise.resolve();
    }
  } else {
    const deleteParams = {
      Bucket: param.bucketName,
      Key: param.path,
    };
    const deleteCommand = new DeleteObjectCommand(deleteParams);
    return s3(param.location).send(deleteCommand);
  }
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
    ...(param.ContinuationToken && {
      ContinuationToken: param.ContinuationToken,
    }),
  };
  const listCommand = new ListObjectsV2Command(listParams);
  const listedObjects = await s3(param.location).send(listCommand);

  if (listedObjects.Contents && listedObjects.Contents.length > 0) {
    listedObjects.Contents.forEach(({ Key }) => {
      addPrefix(prefixes, { Key });
    });
  }
  if (listedObjects.CommonPrefixes && listedObjects.CommonPrefixes.length > 0) {
    listedObjects.CommonPrefixes.forEach(({ Prefix }) => {
      addPrefix(prefixes, { Key: Prefix });
      promises.push(getDirectoryPrefixes({ ...param, path: Prefix }));
    });
  }
  if (listedObjects.IsTruncated) {
    if (listedObjects.NextContinuationToken) {
      promises.push(
        getDirectoryPrefixes({
          ...param,
          ContinuationToken: listedObjects.NextContinuationToken,
        })
      );
    }
  }
  const subPrefixes = await Promise.all(promises);
  subPrefixes.forEach((arrPrefixes) => {
    arrPrefixes.forEach((prefix) => {
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
  listDirectoryPromise,
  listMetaDirectoryPromise,
  getURLforPath,
  saveFilePromise,
  saveTextFilePromise,
  isFileExist,
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
