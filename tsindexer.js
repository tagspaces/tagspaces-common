const pathJS = require('path');

const metaFolder = '.ts';
const bTagContainer = '[';
const eTagContainer = ']';
const tagDelimiter = ' ';
const metaFileExt = '.json';
const thumbFileExt = '.jpg';
const folderThumbFile = 'tst.jpg';
const folderIndexFile = 'tsi.json';
const metaFolderFile = 'tsm.json';
/*
 * @param path
 * @param bucketName
 * @returns {Promise<[]>}
 */
module.exports.indexer = function (path) {
  console.log(
    'createDirectoryIndex started in AWS Lambda:' +
      path +
      ' bucketName:' +
      bucketName
  );
  console.time('createDirectoryIndex');
  const directoryIndex = [];
  let counter = 0;
  return walkDirectory(
    path,

    {
      recursive: true,
      skipMetaFolder: true,
      skipDotHiddenFolder: true,
      extractText: false,
    },
    (fileEntry) => {
      counter += 1;
      // if (counter > AppConfig.indexerLimit) { TODO set index limit
      //     console.warn('Walk canceled by ' + AppConfig.indexerLimit);
      //     window.walkCanceled = true;
      // }
      directoryIndex.push(enhanceEntry(fileEntry));
    },
    (directoryEntry) => {
      if (directoryEntry.name !== metaFolder) {
        counter += 1;
        directoryIndex.push(enhanceEntry(directoryEntry));
      }
    }
  )
    .then(() => {
      // entries - can be used for further processing
      // window.walkCanceled = false;
      console.log(
        'Directory index created ' +
          path +
          ' containing ' +
          directoryIndex.length
      );
      console.timeEnd('createDirectoryIndex');
      return directoryIndex;
    })
    .catch((err) => {
      // window.walkCanceled = false;
      console.timeEnd('createDirectoryIndex');
      console.warn('Error creating index: ' + err);
    });
};

module.exports.addToIndex = function (
  key,
  size,
  LastModified,
  thumbPath,
  bucketName
) {
  if (key.indexOf(metaFolder + '/') !== -1) {
    console.info('addToIndex skip meta folder' + key);
    return Promise.resolve(true);
  }
  const dirPath = extractContainingDirectoryPath(key);
  const metaFilePath = getMetaIndexFilePath(dirPath);
  return loadTextFilePromise(metaFilePath, bucketName).then(
    (metaFileContent) => {
      let tsi = [];
      if (metaFileContent) {
        tsi = JSON.parse(metaFileContent.trim());
      }

      const eentry = {};
      eentry.name = extractFileName(key);
      eentry.path = key;
      eentry.bucketName = bucketName;
      eentry.tags = [];
      eentry.thumbPath = thumbPath;
      eentry.meta = {};
      eentry.isFile = true;
      eentry.size = size;
      eentry.lmdt = Date.parse(LastModified);

      tsi.push(eentry);

      return persistIndex(dirPath, tsi, bucketName);
    }
  );
};

module.exports.removeFromIndex = function (key, bucketName) {
  if (key.indexOf(metaFolder + '/') !== -1) {
    console.info('removeFromIndex skip meta folder' + key);
    return Promise.resolve(true);
  }
  const dirPath = extractContainingDirectoryPath(key);
  const metaFilePath = getMetaIndexFilePath(dirPath);
  return loadTextFilePromise(metaFilePath, bucketName).then(
    (metaFileContent) => {
      if (metaFileContent) {
        const tsi = JSON.parse(metaFileContent.trim());
        const newTsi = tsi.filter((item) => item.path !== key);
        if (tsi.size !== newTsi.size) {
          return persistIndex(dirPath, newTsi, bucketName);
        }
      }
    }
  );
};

const getMetaIndexFilePath = (directoryPath, dirSeparator = '/') => {
  return directoryPath.length > 0 && directoryPath !== '/'
    ? pathJS.normalize(
        directoryPath +
          dirSeparator +
          metaFolder +
          dirSeparator +
          folderIndexFile
      )
    : pathJS.normalize(metaFolder + dirSeparator + folderIndexFile);
};

const getPropertiesPromise = (path, bucketName) => {
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
        name: path.substring(path.lastIndexOf('/') + 1, path.length),
        isFile: !path.endsWith('/'),
        size: data.ContentLength,
        lmdt: Date.parse(data.LastModified),
        path,
      })
    )
    .catch((err) => {
      console.log(err);
      return false;
    });
};

/**
 * Persists a given content(binary supported) to a specified filepath (tested)
 */
const saveFilePromise = (filePath, content, overWrite, bucketName, mode) => {
  let isNewFile = false;
  // eslint-disable-next-line no-param-reassign
  filePath = pathJS.normalize(filePath); // normalizePath(this.normalizeRootPath(filePath));
  return getPropertiesPromise(filePath, bucketName).then((result) => {
    if (result === false) {
      isNewFile = true;
    }
    if (isNewFile || overWrite === true) {
      if (result.size !== content.length) {
        console.log(
          'Update index size:' +
            result.size +
            ' old index size:' +
            content.length
        );
        // || mode === 'text') {
        const fileExt = extractFileExtension(filePath);

        let mimeType;
        if (fileExt === 'md') {
          mimeType = 'text/markdown';
        } else if (fileExt === 'txt') {
          mimeType = 'text/plain';
        } else if (fileExt === 'html') {
          mimeType = 'text/html';
        } else {
          // default type
          mimeType = 'text/plain';
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
              console.log('Error upload ' + filePath); // an error occurred
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
function saveTextFilePromise(filePath, content, overWrite, bucketName) {
  // filePath = pathJS.normalize(filePath);
  console.log('Saving text file: ' + filePath);
  return saveFilePromise(filePath, content, overWrite, bucketName, 'text');
}

module.exports.persistIndex = function (
  directoryPath,
  directoryIndex,
  bucketName,
  dirSeparator = '/'
) {
  const folderIndexPath = getMetaIndexFilePath(directoryPath);
  // const normalizedPath = pathJS.normalize(directoryPath);
  // const folderIndexPath = normalizedPath + dirSeparator + metaFolder + dirSeparator + folderIndexFile;
  /* const relativeIndex = [];
      const clipRange = normalizedPath.length + 1;
      directoryIndex.forEach((entry) => {
          if (entry.thumbPath) {
              relativeIndex.push({
                  ...entry,
                  path: entry.path.substr(clipRange),
                  thumbPath: entry.thumbPath // PlatformIO.haveObjectStoreSupport() ? entry.thumbPath : entry.thumbPath.substr(clipRange)
              });
          } else {
              relativeIndex.push({
                  ...entry,
                  path: entry.path.substr(clipRange)
              });
          }
      }); */
  // zip.file(AppConfig.folderIndexFile, JSON.stringify(relativeIndex));
  // zip.generateAsync({type:"base64"}).then(content => {
  // const b64data = 'data:application/zip;base64,' + content;
  return saveTextFilePromise(
    folderIndexPath,
    JSON.stringify(directoryIndex), // relativeIndex),
    true,
    bucketName
  )
    .then(() => {
      console.log(
        'Index persisted for: ' + directoryPath + ' to ' + folderIndexPath
      );
      // zip.loadAsync(atob(content)).then((archive) => {
      //   const files = Object.keys(archive.files);
      //   // for(let i=0; i< files.length; i++){
      //   //     console.log(files[i] + " " + zip.files[files[i]].date);
      //   // }
      //   archive.file(AppConfig.folderIndexFile).async("string").then(data => {
      //     console.log(data);
      //   });
      // });
      return true;
    })
    .catch(() => {
      console.warn('Error saving the index for ' + directoryPath);
    });
  // });

  // PlatformIO.saveTextFilePromise(
  //   folderIndexPath,
  //   JSON.stringify(relativeIndex),
  //   true
  // ).then(() => {
  //   console.log('Index persisted for: ' + directoryPath + ' to ' + folderIndexPath);
  //   return true;
  // }).catch(() => {
  //   console.warn('Error saving the index for ' + directoryPath);
  // });
};

function walkDirectory(
  path,

  options = {},
  fileCallback,
  dirCallback
) {
  const mergedOptions = {
    recursive: false,
    skipMetaFolder: true,
    skipDotHiddenFolder: false,
    loadMetaDate: true,
    extractText: false,
    ...options,
  };
  return (
    listDirectoryPromise(path, false, mergedOptions.extractText)
      // @ts-ignore
      .then((entries) =>
        // if (window.walkCanceled) {
        //     return false;
        // }
        Promise.all(
          entries.map((entry) => {
            // if (window.walkCanceled) {
            //     return false;
            // }

            if (entry.isFile) {
              if (fileCallback) {
                fileCallback(entry);
              }
              return entry;
            }

            if (dirCallback) {
              dirCallback(entry);
            }

            if (mergedOptions.recursive) {
              if (
                mergedOptions.skipDotHiddenFolder &&
                entry.name.startsWith('.') &&
                entry.name !== metaFolder
              ) {
                return entry;
              }
              if (mergedOptions.skipMetaFolder && entry.name === metaFolder) {
                return entry;
              }
              return walkDirectory(
                entry.path,

                mergedOptions,
                fileCallback,
                dirCallback
              );
            }
            return entry;
          })
        )
      )
      .catch((err) => {
        console.warn('Error walking directory ' + err);
        return err;
      })
  );
}

function enhanceEntry(entry) {
  let fileNameTags = [];
  if (entry.isFile) {
    fileNameTags = extractTagsAsObjects(entry.name);
  }
  let sidecarDescription = '';
  let sidecarColor = '';
  let sidecarTags = [];
  if (entry.meta) {
    sidecarDescription = entry.meta.description || '';
    sidecarColor = entry.meta.color || '';
    sidecarTags = entry.meta.tags || [];
    sidecarTags.map((tag) => {
      tag.type = 'sidecar';
      return true;
    });
  }
  const enhancedEntry = {
    name: entry.name,
    isFile: entry.isFile,
    extension: entry.isFile ? extractFileExtension(entry.name) : '',
    tags: [...sidecarTags, ...fileNameTags],
    size: entry.size,
    lmdt: entry.lmdt,
    path: entry.path,
  };
  if (sidecarDescription) {
    enhancedEntry.description = sidecarDescription;
  }
  // enhancedEntry.description = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Etiam vitae magna rhoncus, rutrum dolor id, vestibulum arcu. Maecenas scelerisque nisl quis sollicitudin dapibus. Ut pulvinar est sed nunc finibus cursus. Nam semper felis eu ex auctor, nec semper lectus sagittis. Donec dictum volutpat lorem, in mollis turpis scelerisque in. Morbi pulvinar egestas turpis, euismod suscipit leo egestas eget. Nullam ac mollis sem. \n Quisque luctus dapibus elit, sed molestie ipsum tempor quis. Sed urna turpis, mattis quis orci ac, placerat lacinia est. Pellentesque quis arcu malesuada, consequat magna ut, tincidunt eros. Aenean sodales nisl finibus pharetra blandit. Pellentesque egestas magna et lectus tempor ultricies. Phasellus sed ornare leo. Vivamus sed massa erat. \n Mauris eu dignissim justo, eget luctus nisi. Ut nec arcu quis ligula tempor porttitor. Pellentesque in pharetra quam. Nulla nec ornare magna. Phasellus interdum dictum mauris eget laoreet. In vulputate massa sem, a mattis elit turpis duis.';
  if (entry && entry.thumbPath) {
    enhancedEntry.thumbPath = entry.thumbPath;
  }
  if (entry && entry.textContent) {
    enhancedEntry.textContent = entry.textContent;
  }
  if (sidecarColor) {
    enhancedEntry.color = sidecarColor;
  }
  // console.log('Enhancing ' + entry.path); console.log(enhancedEntry);
  return enhancedEntry;
}

function extractFileExtension(filePath) {
  const lastindexDirSeparator = filePath.lastIndexOf('/');
  const lastIndexEndTagContainer = filePath.lastIndexOf(eTagContainer);
  const lastindexDot = filePath.lastIndexOf('.');
  if (lastindexDot < 0) {
    return '';
  }
  if (lastindexDot < lastindexDirSeparator) {
    // case: "../remote.php/webdav/somefilename"
    return '';
  }
  if (lastindexDot < lastIndexEndTagContainer) {
    // case: "[20120125 89.4kg 19.5% 60.5% 39.8% 2.6kg]"
    return '';
  }
  let extension = filePath
    .substring(lastindexDot + 1, filePath.length)
    .toLowerCase()
    .trim();
  const lastindexQuestionMark = extension.lastIndexOf('?');
  if (lastindexQuestionMark > 0) {
    // Removing everything after ? in URLs .png?queryParam1=2342
    extension = extension.substring(0, lastindexQuestionMark);
  }
  return extension;

  /* alternative implementation
        const ext = fileURL.split('.').pop();
        return (ext === fileURL) ? '' : ext; */
}

function extractTagsAsObjects(filePath) {
  const tagsInFileName = extractTags(filePath);
  const tagArray = [];
  tagsInFileName.map((tag) => {
    tagArray.push({
      title: '' + tag,
      type: 'plain',
    });
    return true;
  });
  return tagArray;
}

function extractTags(filePath) {
  // console.log('Extracting tags from: ' + filePath);
  const fileName = extractFileName(filePath);
  // WithoutExt
  let tags = [];
  const beginTagContainer = fileName.indexOf(bTagContainer);
  const endTagContainer = fileName.indexOf(eTagContainer);
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

const listDirectoryPromise = (path, lite = true) =>
  new Promise(async (resolve) => {
    const enhancedEntries = [];
    let eentry;

    const metaContent = await listMetaDirectoryPromise(path, bucketName);
    // console.log('Meta folder content: ' + JSON.stringify(metaContent));

    const params = {
      Delimiter: '/', // '/',
      Prefix:
        path.length > 0 && path !== '/' ? pathJS.normalize(path + '/') : '',
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
          'Error listing directory ' +
            params.Prefix +
            ' bucketName:' +
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
        const prefixArray = prefix.replace(/\/$/, '').split('/');
        eentry.name = prefixArray[prefixArray.length - 1]; // dir.Prefix.substring(0, dir.Prefix.length - 1);
        eentry.path = prefix;
        eentry.bucketName = bucketName;
        eentry.tags = [];
        eentry.thumbPath = '';
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
        let thumbPath = getThumbFileLocationForFile(file.Key, '/');
        const thumbAvailable = metaContent.find(
          (obj) => obj.path === thumbPath
        );
        if (thumbAvailable) {
          thumbPath = getURLforPath(thumbPath, bucketName, 604800); // 60 * 60 * 24 * 7 = 1 week
        } else {
          thumbPath = '';
        }

        eentry = {};
        eentry.name = extractFileName(file.Key);
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
          const metaFilePath = getMetaFileLocationForFile(file.Key);
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

const getURLforPath = (path, bucketName, expirationInSeconds = 900) => {
  if (!path || path.length < 1) {
    console.warn('Wrong path param for getURLforPath');
    return '';
  }
  const params = {
    Bucket: bucketName,
    Key: path,
    Expires: expirationInSeconds,
  };
  return s3.getSignedUrl('getObject', params);
};

function getThumbFileLocationForFile(entryPath, dirSeparator = '/') {
  const containingFolder = extractContainingDirectoryPath(
    entryPath,
    dirSeparator
  );
  const mFolder = getMetaDirectoryPath(containingFolder, dirSeparator);
  return mFolder + dirSeparator + extractFileName(entryPath) + thumbFileExt;
}

const getEntryMeta = async (eentry) => {
  const promise = new Promise(async (resolve) => {
    if (eentry.isFile) {
      const metaFilePath = getMetaFileLocationForFile(eentry.path);
      const metaFileContent = await loadTextFilePromise(
        metaFilePath,
        eentry.bucketName
      );
      eentry.meta = JSON.parse(metaFileContent.trim());
      resolve(eentry);
      // resolve({ ...eentry, meta: JSON.parse(metaFileContent.trim()) });
    } else {
      if (
        !eentry.path.includes('/' + metaFolder) &&
        !eentry.path.includes(metaFolder + '/')
      ) {
        // skipping meta folder
        const folderTmbPath = eentry.path + metaFolder + '/' + folderThumbFile;
        const folderThumbProps = await getPropertiesPromise(
          folderTmbPath,
          eentry.bucketName
        );
        if (folderThumbProps.isFile) {
          eentry.thumbPath = getURLforPath(
            folderTmbPath,
            eentry.bucketName,
            604800
          ); // 60 * 60 * 24 * 7 = 1 week ;
        }
        // }
        // if (!eentry.path.endsWith(AppConfig.metaFolder + '/')) { // Skip the /.ts folder
        const folderMetaPath =
          eentry.path + '/' + metaFolder + '/' + metaFolderFile;
        const folderProps = await getPropertiesPromise(
          folderMetaPath,
          eentry.bucketName
        );
        if (folderProps.isFile) {
          const metaFileContent = await loadTextFilePromise(
            folderMetaPath,
            eentry.bucketName
          );
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

const loadTextFilePromise = (filePath, bucketName) =>
  getFileContentPromise(filePath, bucketName);

/**
 * Use only for files (will not work for dirs)
 * @param filePath
 * @param bucketName
 * @returns {Promise<any>}
 */
const getFileContentPromise = async (filePath, bucketName) => {
  try {
    const params = {
      Bucket: bucketName,
      Key: filePath,
    };
    return s3
      .getObject(params)
      .promise()
      .then((data) => {
        return data.Body.toString('utf8');
      });
  } catch (e) {
    console.log('Error getObject ' + filePath, e);
    return Promise.resolve('');
  }
};

function getMetaFileLocationForFile(entryPath, dirSeparator = '/') {
  const containingFolder = extractContainingDirectoryPath(
    entryPath,
    dirSeparator
  );
  const mFolder = getMetaDirectoryPath(containingFolder, dirSeparator);
  return mFolder + dirSeparator + extractFileName(entryPath) + metaFileExt;
}

function extractFileName(filePath) {
  return filePath.substring(filePath.lastIndexOf('/') + 1, filePath.length);
}

function getMetaDirectoryPath(directoryPath, dirSeparator = '/') {
  return (directoryPath ? directoryPath + dirSeparator : '') + metaFolder;
}

function extractContainingDirectoryPath(filePath, dirSeparator = '/') {
  if (filePath.indexOf(dirSeparator) === -1) {
    return dirSeparator;
  }
  return filePath.substring(0, filePath.lastIndexOf(dirSeparator));
}

const listMetaDirectoryPromise = async (path, bucketName) => {
  const entries = [];
  let entry;

  /* const metaDirPath =  pathJS.format({
          root: path,
          base: metaFolder,
          ext: 'ignored'
      }); */
  const params = {
    Delimiter: '/',
    Prefix:
      path !== '/' && path.length > 0
        ? pathJS.normalize(path + '/' + metaFolder + '/')
        : metaFolder + '/',
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
      console.warn('Error listing meta directory ' + path, err);
      return entries; // returning results even if any promise fails
    });
  return results;
};
