/* globals cordova */
const AppConfig = require("@tagspaces/tagspaces-common/AppConfig");
const { b64toBlob } = require("@tagspaces/tagspaces-common/misc");
const {
  extractParentDirectoryPath,
  cleanTrailingDirSeparator,
  extractFileName,
  extractFileExtension,
  getMetaFileLocationForDir,
  getThumbFileLocationForDirectory,
} = require("@tagspaces/tagspaces-common/paths");

const appSettingFile = "settings.json";
const appSettingTagsFile = "settingsTags.json";
// let anotatedTree;
// let pendingCallbacks = 0;

// declare let cordova;
// declare let navigator;

// Redefining the back button
document.addEventListener("backbutton", onDeviceBackButton, false);
document.addEventListener("deviceready", onDeviceReady, false);
document.addEventListener("resume", onDeviceResume, false);
document.addEventListener("initApp", onApplicationLoad, false);

let fsRoot;
let urlFromIntent;
// widgetAction;
let loadedSettings;
let loadedSettingsTags;

const cordovaFileError = {
  1: "NOT_FOUND_ERR",
  2: "SECURITY_ERR",
  3: "ABORT_ERR",
  4: "NOT_READABLE_ERR",
  5: "ENCODING_ERR",
  6: "NO_MODIFICATION_ALLOWED_ERR",
  7: "INVALID_STATE_ERR",
  8: "SYNTAX_ERR",
  9: "INVALID_MODIFICATION_ERR",
  10: "QUOTA_EXCEEDED_ERR",
  11: "TYPE_MISMATCH_ERR",
  12: "PATH_EXISTS_ERR",
};

function onDeviceReady() {
  console.log(
    "Device Ready: " + window.device.platform + " - " + window.device.version
  );

  // attachFastClick(document.body);
  getFileSystem();

  // enabling the cordova-plugin-background-mode
  if (window.plugins.backgroundMode) {
    window.plugins.backgroundMode.enable();
  }

  // iOS specific initialization
  if (AppConfig.isCordovaiOS) {
    window.plugins = window.plugins || {};
    // TODO: use fileOpener2 plugin on all platforms
    // https://build.phonegap.com/plugins/1117
    window.plugins.fileOpener = cordova.plugins.fileOpener2;
  }

  window.plugins.intentShim.onIntent(function (intent) {
    /**
       * intent:
       action: "android.intent.action.VIEW"
       component: "ComponentInfo{org.tagspaces.mobile/org.tagspaces.mobileapp.MainActivity}"
       data: "file:///storage/emulated/0/Download/%D0%B4%D0%B5%D0%BA%D0%BB%D0%B0%D1%80%D0%B0%D1%86%D0%B8%D1%8F%20%D0%B7%D0%B0%20%D1%86%D0%BB%D1%80.pdf"
       flags: 306184195
       type: "application/pdf"
       */
    console.debug("Received Intent: " + JSON.stringify(intent));
    const protocol = window.location.protocol,
      host = "//" + window.location.host,
      path = window.location.pathname;
    // query = window.location.search;

    const newUrl =
      protocol +
      host +
      path +
      // query +
      // (query ? '&' : '?') +
      "?cmdopen=" +
      intent.data.replace("file:///storage/emulated/0", "file:///sdcard");
    // encodeURIComponent(intent.data);

    // window.history.pushState({ path: newUrl }, '', newUrl);
    // TODO use event
    window.location.replace(newUrl);
  });

  /* if (window.plugins.webintent) {
      window.plugins.webintent.getUri(
        url => {
          if (url) {
            if (url === 'createTXTFile' || url.indexOf('TagSpaces') > 0) {
              widgetAction = url;
            } else {
              urlFromIntent = url;
            }
          }
        }
      );
      window.plugins.webintent.onNewIntent(url => {
        widgetAction = url;
        widgetActionHandler();
      });
    } */

  if (AppConfig.isCordovaiOS) {
    setTimeout(() => {
      navigator.splashscreen.hide();
    }, 1000);

    // Enable TestFairy if available
    /* if (PRODUCTION != 'true' && TestFairy) {
        TestFairy.begin('ef5d3fd8bfa17164b8068e71ccb32e1beea25f2f');
      } */
  }
}

function onDeviceBackButton(e) {
  e.preventDefault();
  // send event to main app
}

// Register ios file open handler
function handleOpenURL(url) {
  // const fileName = url.substring(url.lastIndexOf('/') + 1, url.length);
  /* showConfirmDialog('File copied', 'File ' + fileName + ' is copied in inbox folder. Would you like to open it ?', () => {
      FileOpener.openFile(url);
    }); */
}

// Platform specific functions

function normalizePath(path) {
  // we set absolute path because some extensions didn't recognize cdvfile
  // but in cordova.api implementation we didn't need absolute path so we strip nativeURL
  if (path.indexOf(fsRoot.nativeURL) === 0) {
    path = path.replace(fsRoot.nativeURL, "/");
  }
  if (path.indexOf(fsRoot.fullPath) === 0) {
    path = path.substring(fsRoot.fullPath.length, path.length);
  }
  return path;
}

function onDeviceResume() {
  // TODO: reload curtent dir after background operation
}

// widgetActionHandler = () => {
/* if (currentPath === null) {
      showAlertDialog('Please set location folder to use widget');
      return;
    }

    if (widgetAction === 'createTXTFile') {
      createTXTFile();
    } else {
      const fileName = widgetAction.substring(widgetAction.lastIndexOf('/'), widgetAction.length);
      const newFileName = currentPath + fileName;
      const newFileFullPath = fsRoot.nativeURL + '/' + newFileName;
      renameFile(widgetAction, newFileName);
      FileOpener.openFile(newFileFullPath);
    }

    widgetAction = undefined; */
// };

function onApplicationLoad() {
  /* if (widgetAction) {
      widgetActionHandler();
    } */
}

function getDirSystemPromise(dirPath) {
  console.log("getDirSystemPromise: " + dirPath);
  /*if (
    dirPath &&
    (dirPath.indexOf(cordova.file.applicationDirectory) === 0 ||
      dirPath.startsWith("file:///"))
  ) {
  } else if (AppConfig.isCordovaiOS) {
    dirPath = (cordova.file.documentsDirectory + "/" + dirPath).replace(
      ":/",
      ":///"
    );
  } else {
    dirPath = (dirPath.startsWith("/") ? "file://" : "file:///") + dirPath;
  }
  dirPath = encodeURI(dirPath) + (dirPath.endsWith("/") ? "" : "/");*/
  return new Promise((resolve, reject) => {
    fsRoot.getDirectory(
      dirPath,
      {
        create: false,
        exclusive: false,
      },
      (dirEntry) => {
        resolve(dirEntry);
        /*window.resolveLocalFileSystemURL(dirPath, resolve, (error) => {
            console.error(
                "Error getting FileSystem " +
                dirPath +
                ": " +
                cordovaFileError[error.code]
            ); //JSON.stringify(error));
            resolve(false); // reject(error);
          });*/
      },
      (error) => {
        reject(
          "getDirectory failed: " +
            dirPath +
            " failed with error code: " +
            error.code
        );
      }
    );
  });
}

function resolveFullPath(localURL) {
  // Cordova file plugin didn't set fullpath so we set fullpath as absolute
  // this solve problem with extensions which can't use the cdvfile
  let URL = "cdvfile://localhost/persistent/";
  let fullPath = decodeURIComponent(localURL);
  if (fullPath.indexOf("cdvfile://localhost/root/") === 0) {
    URL = "cdvfile://localhost/root/";
  }

  fullPath = fsRoot.nativeURL + fullPath.substring(URL.length, fullPath.length);
  return fullPath;
}

function getAppStorageFileSystem(fileName, fileCallback, fail) {
  const dataFolderPath = AppConfig.isCordovaiOS
    ? cordova.file.dataDirectory
    : cordova.file.externalApplicationStorageDirectory;

  window.resolveLocalFileSystemURL(
    dataFolderPath,
    (fs) => {
      fs.getFile(fileName, { create: true }, fileCallback, fail);
    },
    (error) => {
      console.error("Error getSettingsFileSystem: " + JSON.stringify(error));
    }
  );
}

/*function onFileSystemSuccess(fileSystem) {
  // Get a reference to the root directory
  fsRoot = fileSystem.root;

  handleStartParameters();

  loadSettingsFile(appSettingFile, (settings) => {
    loadedSettings = settings;
    loadSettingsFile(appSettingTagsFile, (settingsTags) => {
      loadedSettingsTags = settingsTags;
    });
  });
}*/

function getFileSystem() {
  // Request access to the file system
  /*window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, onFileSystemSuccess, (error) => {
    console.log("Failed to access file system: " + error.code);
  });*/

  // on android cordova.file.externalRootDirectory points to sdcard0
  const fsURL = AppConfig.isCordovaiOS
    ? cordova.file.documentsDirectory
    : "file:///";
  window.resolveLocalFileSystemURL(
    fsURL,
    (fileSystem) => {
      fsRoot = fileSystem;
      // console.log("Filesystem Details: " + JSON.stringify(fsRoot));
      handleStartParameters();

      loadSettingsFile(appSettingFile, (settings) => {
        loadedSettings = settings;
        loadSettingsFile(appSettingTagsFile, (settingsTags) => {
          loadedSettingsTags = settingsTags;
        });
      });
    },
    (err) => {
      console.error(
        "Error resolving local file system url: " + JSON.stringify(err)
      );
    }
  );
}

/**
 * Creates recursively a tree structure for a given directory path
 */
/* function generateDirectoryTree(entries) {
    var tree = {};
    var i;
    for (i = 0; i < entries.length; i++) {
      if (entries[i].isFile) {
        console.log("File: " + entries[i].name);
        tree.children.push({
          "name": entries[i].name,
          "isFile": entries[i].isFile,
          "size": "", // TODO size and lmtd
          "lmdt": "", //
          "path": entries[i].fullPath
        });
      } else {
        var directoryReader = entries[i].createReader();
        pendingCallbacks++;
        directoryReader.readEntries(
          generateDirectoryTree,
          function(error) {
            console.error("Error reading dir entries: " + error.code);
          }); // jshint ignore:line
      }
    }
    pendingCallbacks--;
    console.log("Pending recursions: " + pendingCallbacks);
    if (pendingCallbacks <= 0) {
      // .createDirectoryTree(anotatedTree);
    }
  } */

function saveSettingsFile(fileName, data) {
  getAppStorageFileSystem(
    fileName,
    (fileEntry) => {
      fileEntry.createWriter(
        (writer) => {
          writer.write(data);
        },
        (error) => {
          console.error("Error creating writter: " + JSON.stringify(error));
        }
      );
    },
    (error) => {
      console.error(
        "Error getting app storage file system: " + JSON.stringify(error)
      );
    }
  );
}

function loadSettingsFile(fileName, ready) {
  getAppStorageFileSystem(
    fileName,
    (fileEntry) => {
      fileEntry.file(
        (file) => {
          const reader = new FileReader();
          reader.onloadend = (evt) => {
            let content = null;
            if (evt.target.result.length > 0) {
              content = evt.target.result;
            }
            ready(content);
          };
          reader.readAsText(file);
        },
        (error) => {
          console.error("Error reading file: " + JSON.stringify(error));
        }
      );
    },
    (error) => {
      console.log(
        "Error getting app storage file system: " + JSON.stringify(error)
      );
    }
  );
}

// Platform specific API calls

function saveSettings(settings) {
  saveSettingsFile(appSettingFile, settings);
}

function loadSettings() {
  return loadedSettings;
}

// saveSettingsTags = (tagGroups: Object) => {
//   // TODO use js objects
//   const jsonFormat =
//     '{ "appName": "' +
//     Config.DefaultSettings.appName +
//     '", "appVersion": "' +
//     Config.DefaultSettings.appVersion +
//     '", "appBuild": "' +
//     Config.DefaultSettings.appBuild +
//     '", "settingsVersion": ' +
//     Config.DefaultSettings.settingsVersion +
//     ', "tagGroups": ' +
//     tagGroups +
//     ' }';
//   saveSettingsFile(appSettingTagsFile, jsonFormat);
// };

function loadSettingsTags() {
  return loadedSettingsTags;
}

function sendFile(filePath) {
  console.log("Sending file: " + filePath);
  if (filePath.indexOf("file://") === 0) {
    window.plugins.fileOpener.send(filePath);
  } else {
    window.plugins.fileOpener.send("file://" + filePath);
  }
}

// Platform API

function getDevicePaths() {
  let paths;
  if (AppConfig.isCordovaiOS) {
    paths = {
      Documents: "/",
      iCloud: cordova.file.syncedDataDirectory,
    };
  } else {
    paths = {
      Photos: "sdcard/DCIM/",
      Pictures: "sdcard/Pictures/",
      Download: "sdcard/Download/",
      Music: "sdcard/Music/",
      Movies: "sdcard/Movies/",
      SDCard: "sdcard/", // cordova.file.externalRootDirectory
    };
  }
  return Promise.resolve(paths);
}

/* getUserHomePath = (): string => '/';

  getAppDataPath = () => {
    // const appDataPath = ipcRenderer.sendSync('app-data-path-request', 'notNeededArgument');
    // return appDataPath;
  }; */

function handleStartParameters() {
  if (urlFromIntent !== undefined && urlFromIntent.length > 0) {
    console.log("Intent URL: " + urlFromIntent);
    // const filePath = decodeURIComponent(urlFromIntent);
    // TODO FileOpener.openFileOnStartup(filePath);
  }
}

function quitApp() {
  navigator.app.exitApp();
}

/**
 * Creates recursively a tree structure for a given directory path
 */
/*function createDirectoryTree(dirPath) {
  console.warn("Creating directory tree is not supported in Cordova yet.");
}*/

function listMetaDirectoryPromise(path) {
  const entries = [];
  const metaDirPath =
    cleanTrailingDirSeparator(path) +
    AppConfig.dirSeparator +
    AppConfig.metaFolder +
    AppConfig.dirSeparator;

  return getDirSystemPromise(metaDirPath)
    .then((fileSystem) => {
      if (fileSystem) {
        const reader = fileSystem.createReader();
        return new Promise((resolve) => {
          reader.readEntries(
            (entr) => {
              entr.forEach((entry) => {
                const entryPath = entry.fullPath;
                if (entryPath.toLowerCase() === metaDirPath.toLowerCase()) {
                  console.log("Skipping current folder");
                } else {
                  const ee = {};
                  ee.name = entry.name;
                  ee.path = decodeURI(entryPath);
                  ee.isFile = true;
                  entries.push(ee);
                }
              });
              resolve(entries);
            },
            (err) => {
              console.log(err);
              resolve(entries);
            }
          );
        });
      } else {
        return entries;
      }
    })
    .catch((err) => {
      console.error("Error getting listMetaDirectoryPromise:", err);
      return entries; // returning results even if any promise fails
    });
}

function getFileMetadata(entry) {
  return new Promise(function (resolve, reject) {
    entry.file(resolve, reject);
  });
}

/**
 * Creates a list with containing the files and the sub directories of a given directory
 */
function listDirectoryPromise(param, mode = ["extractThumbPath"]) {
  let path;
  if (typeof param === "object" && param !== null) {
    path = param.path;
  } else {
    path = param;
  }
  return new Promise(async (resolve, reject) => {
    console.time("listDirectoryPromise");
    const metaContent = mode.includes("extractThumbPath")
      ? await listMetaDirectoryPromise(path)
      : [];

    const enhancedEntries = [];
    const metaPromises = [];
    getDirSystemPromise(path)
      .then(
        (fileSystem) => {
          const reader = fileSystem.createReader();
          reader.readEntries(
            async (entries) => {
              for (const entry of entries) {
                const eentry = {};
                eentry.name = entry.name;
                eentry.path = entry.fullPath;
                eentry.tags = [];
                eentry.isFile = entry.isFile;
                if (entry.isFile) {
                  try {
                    const metadata = await getFileMetadata(entry);
                    eentry.size = metadata.size;
                    eentry.lmdt = metadata.lastModifiedDate;
                  } catch (error) {
                    console.log(
                      "Failed to get metadata for file: " + entry.name,
                      error
                    );
                  }
                  /*entry.file((fileEntry) => {
                    eentry.size = fileEntry.size;
                    eentry.lmdt = fileEntry.lastModifiedDate;
                  });*/
                } else {
                  eentry.meta = {
                    thumbPath: getThumbFileLocationForDirectory(
                      eentry.path,
                      AppConfig.dirSeparator
                    ),
                  };
                }

                if (mode.includes("extractThumbPath")) {
                  if (entry.isDirectory) {
                    // Read tsm.json from subfolders
                    if (
                      !eentry.path.includes(
                        AppConfig.dirSeparator + AppConfig.metaFolder
                      )
                    ) {
                      const folderMetaPath = getMetaFileLocationForDir(
                        eentry.path,
                        AppConfig.dirSeparator
                      );
                      metaPromises.push(getEntryMeta(eentry, folderMetaPath));
                    }
                  } else {
                    const metaFileAvailable = metaContent.find(
                      (obj) => obj.name === entry.name + AppConfig.metaFileExt
                    );
                    if (metaFileAvailable && metaFileAvailable.path) {
                      metaPromises.push(
                        getEntryMeta(eentry, metaFileAvailable.path)
                      );
                    }

                    // Finding if thumbnail available
                    const metaThumbAvailable = metaContent.find(
                      (obj) => obj.name === entry.name + AppConfig.thumbFileExt
                    );
                    if (metaThumbAvailable && metaThumbAvailable.path) {
                      eentry.meta = eentry.meta || {};
                      eentry.meta.thumbPath = metaThumbAvailable.path;
                    }
                  }
                }

                enhancedEntries.push(eentry);

                /* if (entry.isDirectory) {
                      anotatedDirList.push({
                        name: entry.name,
                        path: entry.fullPath,
                        isFile: false,
                        size: '',
                        lmdt: ''
                      });
                    } else if (entry.isFile) {
                      if (lite) {
                        anotatedDirList.push({
                          name: entry.name,
                          path: entry.fullPath,
                          isFile: true,
                          size: '',
                          lmdt: ''
                        });
                      } else {
                        const filePromise = Promise.resolve({
                          then: (onFulfill, onReject) => {
                            entry.file(
                              fileEntry => {
                                if (!fileEntry.fullPath) {
                                  fileEntry.fullPath = resolveFullPath(
                                    fileEntry.localURL
                                  );
                                }
                                anotatedDirList.push();
                                onFulfill({
                                  name: fileEntry.name,
                                  isFile: true,
                                  size: fileEntry.size,
                                  lmdt: fileEntry.lastModifiedDate,
                                  path: fileEntry.fullPath
                                });
                              },
                              err => {
                                onReject('Error reading entry ' + path);
                              }
                            );
                          }
                        }); // jshint ignore:line
                        fileWorkers.push(filePromise);
                      }
                    } */
              }

              Promise.all(metaPromises)
                .then(() => {
                  resolve(enhancedEntries);
                  return true;
                })
                .catch(() => {
                  resolve(enhancedEntries);
                });
              /* Promise.all(fileWorkers).then(
                    entries => {
                      entries.forEach(entry => {
                        anotatedDirList.push(entry);
                      });
                      console.timeEnd('listDirectoryPromise');
                      resolve(anotatedDirList);
                    },
                    err => {
                      console.warn(
                        'At least one file worker failed for ' +
                            path +
                            'err ' +
                            JSON.stringify(err)
                      );
                      console.timeEnd('listDirectoryPromise');
                      resolve(anotatedDirList); // returning results even if any promise fails
                    }
                  ); */
            },
            (err) => {
              console.warn(
                "Error reading entries promise from " +
                  path +
                  "err " +
                  JSON.stringify(err)
              );
              resolve(enhancedEntries); // returning results even if any promise fails
            }
          );
          return true;
        },
        () => {
          console.warn("Error getting file system promise");
          resolve(enhancedEntries); // returning results even if any promise fails
        }
      )
      .catch((err) => {
        console.error("Error getting listDirectoryPromise:", err);
        // resolve(enhancedEntries); // returning results even if any promise fails
        reject(err);
      });
  });
}

function getEntryMeta(eentry, metaPath) {
  if (eentry.isFile) {
    // const metaFilePath = getMetaFileLocationForFile(eentry.path);
    return loadTextFilePromise(metaPath).then((result) => {
      try {
        // eslint-disable-next-line no-param-reassign
        eentry.meta = JSON.parse(result.trim());
      } catch (ex) {
        console.warn("Error getEntryMeta for " + metaPath, ex);
      }
      return eentry;
    });
  }
  // const folderMetaPath = normalizePath(eentry.path) + AppConfig.dirSeparator + AppConfig.metaFolderFile; // getMetaFileLocationForDir(eentry.path);
  if (!eentry.path.endsWith(AppConfig.metaFolder + "/")) {
    // Skip the /.ts folder
    return loadTextFilePromise(metaPath).then((result) => {
      try {
        // eslint-disable-next-line no-param-reassign
        eentry.meta = JSON.parse(result.trim());
      } catch (ex) {
        console.warn("Error getEntryMeta for " + metaPath, ex);
      }
      return eentry;
    });
  }

  return new Promise((resolve) => {
    resolve(eentry);
  });
}

/**
 * Finds out the properties of a file or directory such last modification date or file size
 */
function getPropertiesPromise(param) {
  let path;
  if (typeof param === "object" && param !== null) {
    path = param.path;
  } else {
    path = param;
  }
  return new Promise((resolve, reject) => {
    const entryPath = normalizePath(path);
    // getFileSystemPromise(dir).then(function(fileSystem) {
    const fileProperties = {};
    fsRoot.getFile(
      entryPath,
      {
        create: false,
        exclusive: false,
      },
      (entry) => {
        if (entry.isFile) {
          entry.file(
            (file) => {
              fileProperties.path = entry.fullPath;
              fileProperties.size = file.size;
              fileProperties.lmdt = file.lastModifiedDate;
              fileProperties.mimetype = file.type;
              fileProperties.isFile = entry.isFile;
              fileProperties.name = file.name;
              resolve(fileProperties);
            },
            () => {
              console.log(
                "getPropertiesPromise: Error retrieving file properties of " +
                  entryPath
              );
              resolve(false);
            }
          );
        } else {
          console.log(
            "getPropertiesPromise: Error getting file properties. " +
              entryPath +
              " is directory"
          );
          resolve(false);
        }
      },
      (err) => {
        getDirSystemPromise(entryPath)
          .then((dirEntry) => {
            if (!dirEntry) {
              resolve(false);
              return false;
            }
            console.log(
              "getPropertiesPromise: It's not file " + entryPath,
              err
            );
            resolve({
              path: dirEntry.fullPath,
              isFile: dirEntry.isFile,
              name: dirEntry.name,
            });
          })
          .catch((err) => {
            console.log("getPropertiesPromise: not exist " + entryPath, err);
            resolve(false);
          });
      }
    );
  });
}

/**
 * Load the content of a text file
 */
function loadTextFilePromise(param, isPreview = false) {
  return getFileContentPromise(param, "text", isPreview);
}
/**
 * Gets the content of file, useful for binary files
 */
function getFileContentPromise(
  param,
  type,
  isPreview
  // resolvePath?: string
) {
  let filePath;
  if (typeof param === "object" && param !== null) {
    filePath = param.path;
  } else {
    filePath = param;
  }
  // TODO refactor
  const getFilePromise = (filePath, resolvePath) => {
    const getFile = (fullPath, result, fail) => {
      const filePath = normalizePath(fullPath);

      fsRoot.getFile(
        filePath,
        { create: false },
        (fileEntry) => {
          fileEntry.file((file) => {
            result(file);
          }, fail);
        },
        fail
      );
    };

    return new Promise((resolve, reject) => {
      if (resolvePath) {
        getDirSystemPromise(resolvePath)
          .then((resfs) => {
            resfs.getFile(
              filePath,
              { create: false },
              (fileEntry) => {
                fileEntry.file(resolve, reject);
              },
              reject
            );
          })
          .catch(reject);
      } else {
        getFile(filePath, resolve, reject);
      }
    });
  };

  if (isPreview) {
    return new Promise((resolve) =>
      resolve("Previewing files is not supported on this platform")
    );
  }

  return new Promise((resolve, reject) => {
    getFilePromise(filePath, undefined).then((file) => {
      const reader = new FileReader();
      reader.onerror = function () {
        reject(reader.error);
      };
      reader.onload = function () {
        resolve(reader.result);
      };
      if (type === "text") {
        reader.readAsText(file);
      } else {
        reader.readAsArrayBuffer(file);
      }
    }, reject);
  });
}

function createDirIfNotExists(dirPath, successCallback, failureCallback) {
  window.resolveLocalFileSystemURL(
    dirPath,
    function (dirEntry) {
      successCallback(dirEntry);
    },
    function (error) {
      if (error.code === FileError.NOT_FOUND_ERR || error.code === 5) {
        //FileError.ENCODING_ERR = 5
        // Directory does not exist, create it
        fsRoot.getDirectory(
          dirPath,
          {
            create: true,
            exclusive: false,
          },
          (dirEntry) => {
            successCallback(dirEntry);
          },
          (error) => {
            failureCallback(error);
          }
        );
      } else {
        failureCallback(error);
      }
    }
  );
}
/**
 * Persists a given content(binary supported) to a specified filepath
 */
function saveFilePromise(param, content, overWrite, isRaw) {
  let filePath;
  if (typeof param === "object" && param !== null) {
    filePath = param.path;
  } else {
    filePath = param;
  }
  // eslint-disable-next-line no-param-reassign
  filePath = normalizePath(filePath);
  console.log("Saving file: " + filePath);
  return new Promise((resolve, reject) => {
    // Checks if the file already exists
    checkFileExist(filePath).then((exist) => {
      if (!exist || overWrite) {
        const parentDir = extractParentDirectoryPath(filePath, "/");
        createDirIfNotExists(
          parentDir,
          (dirEntry) => {
            fsRoot.getFile(
              filePath,
              {
                create: true,
                exclusive: false,
              },
              (entry) => {
                entry.createWriter(
                  (writer) => {
                    writer.onwriteend = function (evt) {
                      // resolve(fsRoot.fullPath + "/" + filePath);
                      resolve({
                        name: extractFileName(filePath, AppConfig.dirSeparator),
                        isFile: true,
                        path: filePath,
                        extension: extractFileExtension(
                          filePath,
                          AppConfig.dirSeparator
                        ),
                        size: 0, // TODO debug evt and set size
                        lmdt: new Date().getTime(),
                        isNewFile: true,
                        tags: [],
                      });
                    };
                    if (isRaw) {
                      writer.write(content);
                    } else if (
                      typeof content === "string" &&
                      content.indexOf(";base64,") > 0
                    ) {
                      const contentArray = content.split(";base64,");
                      const type =
                        contentArray.length > 1
                          ? contentArray[0].split(":")[1]
                          : "";
                      const newContent =
                        contentArray.length > 1
                          ? contentArray[1]
                          : contentArray[0];
                      const data = b64toBlob(newContent, type, 512);
                      writer.write(data);
                    } else {
                      writer.write(content);
                    }
                  },
                  (err) => {
                    reject("Error creating file: " + filePath + " " + err);
                  }
                );
              },
              (error) => {
                reject({
                  error,
                  message: "Error getting file entry: " + filePath,
                });
              }
            );
          },
          (err) => {
            reject({ error: err, message: "Error create dir: " + parentDir });
          }
        );
      } else {
        const errMsg = "File already exists: " + filePath; // i18n.t('ns.common:fileExists', { fileName: filePath });
        // showAlertDialog(errMsg);
        reject(errMsg);
      }
    });
  });
}

/**
 * Persists a given text content to a specified filepath
 */
function saveTextFilePromise(param, content, overWrite) {
  console.log("Saving TEXT file: " + param);
  // Handling the UTF8 support for text files
  /* var UTF8_BOM = "\ufeff";
    if (content.indexOf(UTF8_BOM) === 0) {
      console.log("Content beging with a UTF8 bom");
    } else {
      content = UTF8_BOM + content;
    } */
  return saveFilePromise(param, content, overWrite, true);
}

/**
 * Persists a given binary content to a specified filepath
 */
function saveBinaryFilePromise(param, content, overWrite) {
  console.log("Saving binary file: " + param);
  // var dataView = new Int8Array(content);
  // const dataView = content;
  const dataView = new Blob([content], { type: "application/octet-stream" });
  return saveFilePromise(param, dataView, overWrite);
}

/**
 * Creates a directory
 */
function createDirectoryPromise(param) {
  let path;
  if (typeof param === "object" && param !== null) {
    path = param.path;
  } else {
    path = param;
  }
  console.log("Creating directory: " + path);
  return new Promise((resolve, reject) => {
    checkDirExist(path).then((exist) => {
      if (exist) {
        reject("error createDirectory: " + path + " exist!");
        return;
      }
      const dirPath = normalizePath(path);
      fsRoot.getDirectory(
        dirPath,
        {
          create: true,
          exclusive: false,
        },
        (dirEntry) => {
          resolve(dirPath);
        },
        (error) => {
          reject(
            "Creating directory failed: " +
              dirPath +
              " failed with error code: " +
              error.code
          );
        }
      );
    });
  });
}

/**
 * Copies a given file to a specified location
 */
function copyFilePromise(param, newFilePath, override = true) {
  let filePath;
  if (typeof param === "object" && param !== null) {
    filePath = param.path;
  } else {
    filePath = param;
  }
  return new Promise(async (resolve, reject) => {
    if (!override) {
      const exist = await checkFileExist(newFilePath);
      if (exist) {
        reject("error copyFile: " + newFilePath + " exist!");
        return;
      }
    }
    // eslint-disable-next-line no-param-reassign
    filePath = normalizePath(filePath);
    const newFileName = newFilePath.substring(newFilePath.lastIndexOf("/") + 1);
    const newFileParentPath = normalizePath(
      newFilePath.substring(0, newFilePath.lastIndexOf("/"))
    );
    fsRoot.getDirectory(
      newFileParentPath,
      {
        create: true,
        exclusive: false,
      },
      (parentDirEntry) => {
        fsRoot.getFile(
          filePath,
          {
            create: false,
            exclusive: false,
          },
          (entry) => {
            entry.copyTo(
              parentDirEntry,
              newFileName,
              () => {
                console.log(
                  "File copy: target: " +
                    newFilePath +
                    " source: " +
                    entry.fullPath
                );
                resolve(newFilePath);
              },
              () => {
                reject("error copying: " + filePath);
              }
            );
          },
          () => {
            reject("Error getting file: " + filePath);
          }
        );
      },
      (error) => {
        reject(
          "Getting dir: " +
            newFileParentPath +
            " failed with error code: " +
            error.code
        );
      }
    );
  });
}

/**
 * Renames a given file
 */
function renameFilePromise(param, newFilePath, onProgress = undefined) {
  let filePath;
  if (typeof param === "object" && param !== null) {
    filePath = param.path;
  } else {
    filePath = param;
  }
  return new Promise((resolve, reject) => {
    checkFileExist(newFilePath).then((exist) => {
      if (exist) {
        reject("error renaming: " + newFilePath + " exist!");
        return;
      }
      // eslint-disable-next-line no-param-reassign
      filePath = normalizePath(filePath);
      const newFileName = newFilePath.substring(
        newFilePath.lastIndexOf("/") + 1
      );
      const newFileParentPath = normalizePath(
        newFilePath.substring(0, newFilePath.lastIndexOf("/") + 1)
      );
      console.log(
        "renameFile: " + newFileName + " newFilePath: " + newFilePath
      );
      fsRoot.getDirectory(
        newFileParentPath,
        {
          create: false,
          exclusive: false,
        },
        (parentDirEntry) => {
          fsRoot.getFile(
            filePath,
            {
              create: false,
              exclusive: false,
            },
            (entry) => {
              entry.moveTo(
                parentDirEntry,
                newFileName,
                () => {
                  console.log(
                    "File renamed to: " +
                      newFilePath +
                      " Old name: " +
                      entry.fullPath
                  );
                  resolve([filePath, newFilePath]);
                },
                (err) => {
                  reject("error renaming: " + filePath + " " + err);
                }
              );
            },
            (error) => {
              reject("Error getting file: " + filePath + " " + error);
            }
          );
        },
        (error) => {
          console.error(
            "Getting dir: " +
              newFileParentPath +
              " failed with error code: " +
              error.code
          );
          reject(error);
        }
      );
    });
  });
}

function checkFileExist(filePath) {
  return new Promise((resolve) => {
    fsRoot.getFile(
      filePath,
      {
        create: false,
        exclusive: false,
      },
      () => {
        resolve(true);
      },
      () => {
        resolve(false);
      }
    );
  });
}

function checkDirExist(dirPath) {
  return new Promise((resolve) => {
    window.resolveLocalFileSystemURL(
      (dirPath.startsWith("/") ? "file://" : "file:///") +
        dirPath +
        (dirPath.endsWith("/") ? "" : "/"),
      () => {
        resolve(true);
      },
      () => {
        resolve(false);
      }
    );
  });
}

function renameDirectoryPromise(param, newDirName) {
  let path;
  if (typeof param === "object" && param !== null) {
    path = param.path;
  } else {
    path = param;
  }
  const parentDir = extractParentDirectoryPath(path, "/");
  const newDirPath = parentDir + AppConfig.dirSeparator + newDirName;

  return copyDirectoryPromise(param, newDirPath)
    .then(() => deleteDirectoryPromise(param))
    .then(() => newDirPath);

  //return moveDirectoryPromise(param, normalizePath(newDirPath));
}
/**
 * Move a directory. Do not use for rename
 */
function moveDirectoryPromise(param, newDirPath, onProgress = undefined) {
  let path;
  if (typeof param === "object" && param !== null) {
    path = param.path;
  } else {
    path = param;
  }
  // eslint-disable-next-line no-param-reassign
  const dirPath = normalizePath(path);
  const newDirParentPath = normalizePath(
    newDirPath.substring(0, newDirPath.lastIndexOf("/"))
  );
  return new Promise((resolve, reject) => {
    checkDirExist(newDirPath).then((exist) => {
      if (exist) {
        reject("error renaming: " + newDirPath + " exist!");
        return;
      }

      console.log("renameDirectoryPromise: " + dirPath + " to: " + newDirPath);
      fsRoot.getDirectory(
        newDirParentPath,
        {
          create: false,
          exclusive: false,
        },
        (parentDirEntry) => {
          fsRoot.getDirectory(
            dirPath,
            {
              create: false,
              exclusive: false,
            },
            (entry) => {
              entry.moveTo(
                parentDirEntry,
                newDirPath, //newDirName, todo test this
                () => {
                  console.log(
                    "Directory renamed to: " +
                      newDirPath +
                      " from: " +
                      entry.fullPath
                  );
                  if (onProgress) {
                    const progress = {
                      loaded: 1,
                      total: 1,
                      key: newDirPath,
                    };
                    onProgress(progress, () => {}, entry.fullPath);
                  }
                  resolve("/" + newDirPath);
                },
                (err) => {
                  reject("error renaming directory: " + dirPath + " " + err);
                }
              );
            },
            (error) => {
              reject("Error getting directory: " + dirPath + " " + error);
            }
          );
        },
        (error) => {
          console.error(
            "Getting dir: " +
              newDirParentPath +
              " failed with error code: " +
              error.code
          );
          reject(error);
        }
      );
    });
  });
}

function copyDirectoryPromise(param, targetDir, onProgress = undefined) {
  let sourceDir;
  if (typeof param === "object" && param !== null) {
    sourceDir = param.path;
  } else {
    sourceDir = param;
  }
  return new Promise(function (resolve, reject) {
    // Check if source directory exists
    getDirSystemPromise(normalizePath(sourceDir))
      .then((dirEntry) => {
        createDirectoryPromise(normalizePath(targetDir)).then((newDirPath) => {
          // Get a directory reader to read files in the source directory
          const dirReader = dirEntry.createReader();
          dirReader.readEntries(
            async function (entries) {
              // Recursively copy each file in the source directory
              const fileCount = entries.length;
              let part = 0;
              let running = true;
              for (let i = 0; i < entries.length; i++) {
                if (running) {
                  const entry = entries[i];
                  if (entry.isDirectory) {
                    await copyDirectoryPromise(
                      entry.fullPath,
                      newDirPath + AppConfig.dirSeparator + entry.name
                    );
                  } else {
                    await copyFilePromise(
                      entry.fullPath,
                      newDirPath + AppConfig.dirSeparator + entry.name
                    );
                  }
                  part += 1;
                  if (onProgress && running) {
                    const progress = {
                      loaded: part,
                      total: fileCount,
                      key: newDirPath,
                    };
                    onProgress(
                      progress,
                      () => {
                        running = false;
                      },
                      entry.fullPath
                    );
                  }
                }
              }
              resolve(newDirPath);
            },
            function (error) {
              reject(error);
            }
          );
        });
      })
      .catch(reject);
  });
}

/**
 * Delete a specified file
 */
function deleteFilePromise(param) {
  let filePath;
  if (typeof param === "object" && param !== null) {
    filePath = param.path;
  } else {
    filePath = param;
  }
  console.log("init file deleted: " + filePath);
  return new Promise((resolve, reject) => {
    const path = normalizePath(filePath);
    fsRoot.getFile(
      path,
      {
        create: false,
        exclusive: false,
      },
      (entry) => {
        entry.remove(
          () => {
            console.log("file deleted: " + path);
            resolve(filePath);
          },
          (err) => {
            reject("error deleting: " + filePath + " " + err);
          }
        );
      },
      (error) => {
        reject("error getting file" + path + " " + error);
      }
    );
  });
}

/**
 * Delete a specified directory, the directory should be empty, if the trash can functionality is not enabled
 */
function deleteDirectoryPromise(param) {
  let path;
  if (typeof param === "object" && param !== null) {
    path = param.path;
  } else {
    path = param;
  }
  console.log("Deleting directory: " + path);
  return new Promise((resolve, reject) => {
    const dirPath = normalizePath(path);

    fsRoot.getDirectory(
      dirPath,
      {
        create: false,
        exclusive: false,
      },
      (entry) => {
        entry.removeRecursively(
          () => {
            console.log("dir deleted: " + dirPath);
            resolve(dirPath);
          },
          (err) => {
            reject("error deleting dir: " + dirPath + " " + err);
          }
        );
      },
      (error) => {
        reject("error getting directory " + dirPath + " " + error);
      }
    );
  });
}

/**
 * Selects a directory with the help of a directory chooser
 */
function selectDirectory() {
  console.log("Open select directory dialog.");
  // showDirectoryBrowserDialog(fsRoot.fullPath);
}

/**
 * Selects a file with the help of a file chooser
 */
function selectFile() {
  console.log("Operation selectFile not supported.");
}

function selectDirectoryDialog() {
  if (AppConfig.isCordovaiOS) {
    console.log("Operation selectDirectoryDialog not supported.");
  } else {
    return new Promise((resolve, reject) => {
      // @ts-ignore
      window.OurCodeWorld.Filebrowser.folderPicker.single({
        success: function (data) {
          if (!data.length) {
            reject("No folders selected");
            return;
          }

          // Array with paths
          // ["file:///storage/emulated/0/360/security", "file:///storage/emulated/0/360/security"]
          // fix https://trello.com/c/vV7D0kGf/500-tsn500-fix-folder-selector-in-create-edit-location-on-android-or-use-native-dialog
          data[0] = data[0].replace(
            "file:///storage/emulated/0", // 'content://org.tagspaces.mobileapp.provider/root/storage/emulated/0', 'file:///storage/emulated/0',
            "sdcard"
          );
          resolve(data);
        },
        error: function (err) {
          reject("Folders selection err:" + err);
        },
      });
    });
  }
}

/**
 * Opens a directory in the operating system's default file manager
 */
function openDirectory(dirPath) {
  console.warn("function openDirectory not supported on cordova");
}

/**
 * Opens a file with the operating system's default program for the type of the file
 */
function openFile(filePath, fileMIMEType) {
  console.log("Opening natively: " + filePath);
  if (filePath.startsWith("http://") || filePath.startsWith("https://")) {
    openUrl(filePath);
  } else if (filePath.startsWith("file://")) {
    cordova.plugins.fileOpener2.open(filePath, fileMIMEType, {
      error: function (e) {
        console.log(
          "Error status: " + e.status + " - Error message: " + e.message
        );
      },
      success: function () {
        console.log("File opened successfully");
      },
    });
  } else {
    cordova.plugins.fileOpener2.open("file://" + filePath, fileMIMEType, {
      error: function (e) {
        console.log(
          "Error status: " + e.status + " - Error message: " + e.message
        );
      },
      success: function () {
        console.log("File opened successfully");
      },
    });
  }
}

function openUrl(url) {
  // window.open(url, "_system");
  const tmpLink = document.createElement("a");
  tmpLink.target = "_blank";
  tmpLink.href = url;
  tmpLink.rel = "noopener noreferrer";
  document.body.appendChild(tmpLink);
  tmpLink.click();
  tmpLink.parentNode.removeChild(tmpLink);
  // Object.assign(anchor, {
  //   target: '_blank',
  //   href: url,
  //   rel: 'noopener noreferrer'
  // }).click();
}

/**
 * Places the application window on top of the other windows
 */
function focusWindow() {
  console.log("Focusing window is not implemented in cordova.");
}

function shareFiles(files) {
  // this is the complete list of currently supported params you can pass to the plugin (all optional)
  const options = {
    // message: 'share file', // not supported on some apps (Facebook, Instagram)
    subject: "File sharing", // fi. for email
    files, //: ['', ''], // an array of filenames either locally or remotely
    // url: 'https://www.website.com/foo/#bar?a=b',
    chooserTitle: "Pick an app", // Android only, you can override the default share sheet title
    //appPackageName: 'com.apple.social.facebook', // Android only, you can provide id of the App you want to share with
    //iPadCoordinates: '0,0,0,0' //IOS only iPadCoordinates for where the popover should be point.  Format with x,y,width,height
  };

  const onSuccess = function (result) {
    console.log("Share completed? " + result.completed); // On Android apps mostly return false even while it's true
    console.log("Shared to app: " + result.app); // On Android result.app since plugin version 5.4.0 this is no longer empty. On iOS it's empty when sharing is cancelled (result.completed=false)
  };

  const onError = function (msg) {
    console.log("Sharing failed with message: " + msg);
  };

  window.plugins.socialsharing.shareWithOptions(options, onSuccess, onError);
}

module.exports = {
  onDeviceReady,
  onDeviceBackButton,
  handleOpenURL,
  normalizePath,
  onDeviceResume,
  onApplicationLoad,
  getDirSystemPromise,
  resolveFullPath,
  getAppStorageFileSystem,
  getFileSystem,
  saveSettingsFile,
  loadSettingsFile,
  saveSettings,
  loadSettings,
  loadSettingsTags,
  sendFile,
  getDevicePaths,
  handleStartParameters,
  quitApp,
  listMetaDirectoryPromise,
  listDirectoryPromise,
  getEntryMeta,
  getPropertiesPromise,
  loadTextFilePromise,
  getFileContentPromise,
  saveFilePromise,
  saveTextFilePromise,
  saveBinaryFilePromise,
  createDirectoryPromise,
  copyFilePromise,
  renameFilePromise,
  checkFileExist,
  checkDirExist,
  renameDirectoryPromise,
  moveDirectoryPromise,
  copyDirectoryPromise,
  deleteFilePromise,
  deleteDirectoryPromise,
  selectDirectory,
  selectFile,
  selectDirectoryDialog,
  openDirectory,
  openFile,
  openUrl,
  focusWindow,
  shareFiles,
};
