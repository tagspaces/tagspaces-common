const fs = require("fs-extra");
const path = require("path");
const filepath = require("./filepath");
const AppConfig = require("@tagspaces/tagspaces-common/AppConfig");
const { walkDirectory } = require("@tagspaces/tagspaces-common/utils-io");
const {
  listDirectoryPromise,
} = require("@tagspaces/tagspaces-common-node/io-node");

function isMeta(pathParts) {
  const metaFolderIndex = pathParts.indexOf(AppConfig.metaFolder);
  if (metaFolderIndex !== -1) {
    const fileName = pathParts[pathParts.length - 1];
    return (
      fileName !== AppConfig.metaFolderFile &&
      fileName !== AppConfig.folderLocationsFile &&
      fileName !== AppConfig.folderIndexFile &&
      fileName !== AppConfig.folderThumbFile &&
      fileName !== AppConfig.folderBgndFile
    );
  }
  return false;
}

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
      if (isMeta(parts)) {
        const fileName = parts[parts.length - 1];
        // console.debug(fileName);
        const fileExtension = pathObj.extname();
        // console.debug(fileExtension);
        const metaFolderIndex = parts.indexOf(AppConfig.metaFolder);
        const originPathParts = parts.slice(0, metaFolderIndex);
        originPathParts.push(
          fileName.substring(0, fileName.length - fileExtension.length)
        );
        const relativeFilePath = path.relative(
          __dirname.replace(/^\//, ""),
          path.join(...originPathParts)
        );
        const originFilePath = path.join(__dirname, relativeFilePath);
        // this works on Windows only
        // const originFilePath = path.resolve(...originPathParts);

        if (
          options.considerMetaJSON &&
          fileExtension === AppConfig.metaFileExt
        ) {
          checkExist(originFilePath, fileEntry.path, analyze, callback);
        } else if (
          options.considerThumb &&
          fileExtension === AppConfig.thumbFileExt
        ) {
          checkExist(originFilePath, fileEntry.path, analyze, callback);
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
