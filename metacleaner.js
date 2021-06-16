const fs = require("fs-extra");
const filepath = require("filepath");
const AppConfig = require("./AppConfig");
const { listDirectoryPromise } = require("./io-node");
const { walkDirectory } = require("./utils-io");

const cleanMeta = (
  dirPath,
  callback,
  analyze = true,
  options = { considerMetaJSON: true, considerThumb: true }
) => {
  return walkDirectory(
    dirPath,
    listDirectoryPromise,
    {
      recursive: true,
      skipMetaFolder: false,
      skipDotHiddenFolder: false,
      loadMetaData: false,
      extractText: false,
      lite: true,
    },
    (fileEntry) => {
      const pathObj = filepath.create(fileEntry.path);
      const parts = pathObj.split();
      const metaFolderIndex = parts.indexOf(AppConfig.metaFolder);
      if (metaFolderIndex !== -1) {
        const fileName = parts[parts.length - 1];
        // console.debug(fileName);
        const fileExtension = pathObj.extname();
        // console.debug(fileExtension);
        const originPath = parts.slice(0, metaFolderIndex);
        originPath.push(
          fileName.substring(0, fileName.length - fileExtension.length)
        );
        const originFile = filepath.create(originPath);

        if (fileName === AppConfig.folderThumbFile) {
        } else if (fileName === AppConfig.folderIndexFile) {
        } else if (fileName === AppConfig.metaFolderFile) {
        } else if (fileExtension === AppConfig.metaFileExt) {
          if (options.considerMetaJSON) {
            checkExist(
              originFile.sep + originFile.path,
              fileEntry.path,
              analyze,
              callback
            );
          }
        } else if (fileExtension === AppConfig.thumbFileExt) {
          if (options.considerThumb) {
            checkExist(
              originFile.sep + originFile.path,
              fileEntry.path,
              analyze,
              callback
            );
          }
        }
      }
    }
  )
    .then(() => {
      //console.debug("Directory cleaned " + dirPath);
      return true;
    })
    .catch((err) => {
      console.debug("Error clean dir " + path + ": ", err);
    });
};

const checkExist = (filePath, thumbPath, analyze, callback) => {
  if (!fs.existsSync(filePath)) {
    // console.log("Thumb not exist:" + thumbPath);
    if (!analyze) {
      try {
        fs.unlinkSync(thumbPath);
        //file removed
      } catch (err) {
        console.error(err);
      }
    }
    callback(thumbPath);
  }
};

module.exports = {
  cleanMeta,
};
