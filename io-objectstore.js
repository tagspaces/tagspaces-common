const AWS = require("aws-sdk");
const pathJS = require("path");
const paths = require("./paths");
const AppConfig = require("./AppConfig");
// get reference to S3 client
const s3 = new AWS.S3();

/**
 * TODO not in use for AWS
 * @param param
 * @returns {Promise<{path: *, lmdt: number, isFile: boolean, size: S3.ContentLength, name: (*|string)} | boolean>}
 */
function getPropertiesPromise(param) {
  const path = param.path;
  const bucketName = param.bucketName;
  const params = {
    Bucket: bucketName,
    Key: path,
  };
  const headObjectPromise = s3.headObject(params).promise();
  return headObjectPromise
    .then((data) =>
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
      ({
        name: path.substring(path.lastIndexOf("/") + 1, path.length),
        isFile: !path.endsWith("/"),
        size: data.ContentLength,
        lmdt: data.LastModified, // Date.parse(data.LastModified),
        path,
      })
    )
    .catch((err) => {
      console.log(err);
      return false;
    });
}

/**
 * Persists a given content(binary supported) to a specified filepath (tested)
 */
const saveFilePromise = (param, content, overWrite, mode) => {
  const path = param.path;
  const bucketName = param.bucketName;
  let isNewFile = false;
  // eslint-disable-next-line no-param-reassign
  const filePath = pathJS.normalize(path); // normalizePath(this.normalizeRootPath(filePath));
  return getPropertiesPromise({
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
        );
        // || mode === 'text') {
        const fileExt = paths.extractFileExtension(filePath);

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
        return s3
          .putObject(params, (err) => {
            if (err) {
              console.log("Error upload " + filePath); // an error occurred
              console.log(err, err.stack); // an error occurred
              return false;
            }
          })
          .promise();
      }
    }
  });
};

/**
 * Persists a given text content to a specified filepath (tested)
 */
function saveTextFilePromise(param, content, overWrite) {
  // filePath = pathJS.normalize(filePath);
  console.log("Saving text file: " + param.path);
  return saveFilePromise(param, content, overWrite, "text");
}

const listDirectoryPromise = (param, lite = true) =>
  new Promise(async (resolve) => {
    const path = param.path;
    const bucketName = param.bucketName;
    const enhancedEntries = [];
    let eentry;

    const metaContent = await listMetaDirectoryPromise(param);
    // console.log('Meta folder content: ' + JSON.stringify(metaContent));

    const params = {
      Delimiter: "/", // '/',
      Prefix:
        path.length > 0 && path !== "/" ? pathJS.normalize(path + "/") : "",
      // MaxKeys: 10000, // It returns actually up to 1000
      Bucket: bucketName,
    };
    s3.listObjectsV2(params, (error, data) => {
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
        let thumbPath = paths.getThumbFileLocationForFile(file.Key, "/");
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
        eentry.name = paths.extractFileName(file.Key);
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
          const metaFilePath = paths.getMetaFileLocationForFile(file.Key, "/");
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
  return s3.getSignedUrl("getObject", params);
};

const getEntryMeta = async (eentry) => {
  const promise = new Promise(async (resolve) => {
    if (eentry.isFile) {
      const metaFilePath = paths.getMetaFileLocationForFile(eentry.path, "/");
      const metaFileContent = await loadTextFilePromise({
        path: metaFilePath,
        bucketName: eentry.bucketName,
      });
      eentry.meta = JSON.parse(metaFileContent.trim());
      resolve(eentry);
      // resolve({ ...eentry, meta: JSON.parse(metaFileContent.trim()) });
    } else {
      if (
        !eentry.path.includes("/" + AppConfig.metaFolder) &&
        !eentry.path.includes(AppConfig.metaFolder + "/")
      ) {
        // skipping meta folder
        const folderTmbPath =
          eentry.path + AppConfig.metaFolder + "/" + AppConfig.folderThumbFile;
        const folderThumbProps = await getPropertiesPromise({
          path: folderTmbPath,
          bucketName: eentry.bucketName,
        });
        if (folderThumbProps.isFile) {
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
          eentry.path +
          "/" +
          AppConfig.metaFolder +
          "/" +
          AppConfig.metaFolderFile;
        const folderProps = await getPropertiesPromise({
          path: folderMetaPath,
          bucketName: eentry.bucketName,
        });
        if (folderProps.isFile) {
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

loadTextFilePromise = (param) => getFileContentPromise(param);

/**
 * Use only for files (will not work for dirs)
 * @param filePath
 * @param bucketName
 * @returns {Promise<any>}
 */
const getFileContentPromise = async (param) => {
  const path = param.path;
  const bucketName = param.bucketName;
  try {
    const params = {
      Bucket: bucketName,
      Key: path,
    };
    return s3
      .getObject(params)
      .promise()
      .then((data) => {
        return data.Body.toString("utf8");
      });
  } catch (e) {
    console.log("Error getObject " + path, e);
    return Promise.resolve("");
  }
};

const listMetaDirectoryPromise = async (param) => {
  const path = param.path;
  const bucketName = param.bucketName;
  const entries = [];
  let entry;

  /* const metaDirPath =  pathJS.format({
            root: path,
            base: metaFolder,
            ext: 'ignored'
        }); */
  const params = {
    Delimiter: "/",
    Prefix:
      path !== "/" && path.length > 0
        ? pathJS.normalize(path + "/" + AppConfig.metaFolder + "/")
        : AppConfig.metaFolder + "/",
    Bucket: bucketName,
  };
  const results = await s3
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

module.exports = {
  listDirectoryPromise,
  saveTextFilePromise,
  getPropertiesPromise,
  loadTextFilePromise,
};
