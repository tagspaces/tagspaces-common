"use strict";

const fs = require("fs-extra");
const path = require("path");
const fsWin = require("fswin");
const tsThumb = require("@tagspaces/tagspaces-thumbgen-image/tsimagethumbgen");
const {
  isDirectory,
  listDirectoryPromise,
  getPropertiesPromise,
  extractAndSavePdf,
} = require("@tagspaces/tagspaces-common-node");
const {
  walkDirectory,
  isThumbGenSupportedFileType,
} = require("@tagspaces/tagspaces-common/utils-io");
const {
  extractFileName,
  getMetaDirectoryPath,
  extractContainingDirectoryPath,
} = require("@tagspaces/tagspaces-common/paths");
const AppConfig = require("@tagspaces/tagspaces-common/AppConfig");

module.exports.processAllThumbnails = async function (
  entryPath,
  generatePdf = false,
  extractPDFcontent = undefined
) {
  if (
    entryPath.endsWith(AppConfig.dirSeparator + AppConfig.metaFolder) ||
    entryPath.endsWith(
      AppConfig.dirSeparator + AppConfig.metaFolder + AppConfig.dirSeparator
    )
  ) {
    return Promise.resolve(false); // dont generate thumbnails for .ts folder
  }
  const upload = (imagePath, data, next) => {
    const pathParts = path.parse(imagePath);
    const dirName =
      (pathParts.dir ? pathParts.dir + "/" : "") + AppConfig.metaFolder + "/";
    if (!fs.existsSync(dirName)) {
      fs.mkdirSync(dirName, { recursive: true });
      if (AppConfig.isWin) {
        fsWin.setAttributesSync(dirName, { IS_HIDDEN: true });
      }
    }
    const thumbName = dirName + pathParts.base + AppConfig.thumbFileExt;

    if (tsThumb.isReadableStream(data)) {
      // if(data.readable===true) { //data._readableState.ended === false) { //data.readable===true) {
      const ws = fs.createWriteStream(thumbName);
      data.pipe(ws);
      data.on("end", () => console.log("done write " + thumbName));
      //  data.on("data", () => console.log("date write " + thumbName));
      /*} else {

      }*/
    } else {
      fs.writeFileSync(thumbName, data);
    }
    if (next) {
      next();
    }
  };

  const generateThumbnail = (fsEntry) => {
    const thumbGenResults = (success) => {
      if (success) {
        return {
          filePath: fsEntry.path,
          tmbPath: getThumbFileLocation(fsEntry.path),
        };
      }
      return undefined;
    };

    return checkThumbUpToDate(fsEntry).then((upToDate) => {
      if (!upToDate) {
        const fileType = tsThumb.getFileType(fsEntry.path);
        console.log("Generating thumbnail for: " + fsEntry.path);
        if (isThumbGenSupportedFileType(fileType, "image")) {
          const image = fs.readFileSync(fsEntry.path);
          return tsThumb
            .generateImageThumbnail(image, fileType, fsEntry.path, upload)
            .then(thumbGenResults)
            .catch((error) => {
              console.error(
                "Generating thumbnail failed: " + fsEntry.path,
                error
              );
            });
        } else if (fileType === "pdf" && generatePdf) {
          console.info(
            fsEntry.path + ": PDF thumbs generation not supported from WS!"
          );
          return Promise.resolve(true);
          /*const pdf = fs.readFileSync(filePath);
          return generatePDFThumbnail(pdf, 400).then((buffer) => {
            if (buffer) {
              upload(filePath, buffer);
              return thumbGenResults(true);
            }
            return undefined;
          });*/
          /* const pdfFile = fs.readFileSync(filePath);
          return tsThumb
            .generatePDFThumbnail(pdfFile, filePath, "application/pdf", upload)
            .then(thumbGenResults); */
        } else {
          console.info("unsupported thumb format:" + fileType);
          return Promise.resolve(true);
        }
      } else {
        console.log("Thumbnail is up to Date: " + fsEntry.path);
        return Promise.resolve(thumbGenResults(true));
      }
    });
  };

  let isDir = false;
  try {
    isDir = await isDirectory(entryPath);
  } catch (e) {
    console.error(e);
  }
  if (isDir) {
    return walkDirectory(
      { path: entryPath },
      listDirectoryPromise,
      {
        recursive: true,
        skipMetaFolder: true,
        skipDotHiddenFolder: true,
        mode: extractPDFcontent ? ["extractTextContent"] : [],
        ...(extractPDFcontent && { extractText: extractPDFcontent }),
      },
      (fileEntry) => generateThumbnail(fileEntry),

      /*return fs.readFile(fileEntry.path, function (err, data) {
                        if (err) {
                            console.log('Error read image:' + fileEntry.path, err);
                        }
                        tsThumb.generateImageThumbnail(data, fileEntry.type, upload);
                    })*/
      (directoryEntry) => {
        if (directoryEntry.name !== AppConfig.metaFolder) {
        }
      }
    )
      .then((results) => {
        // entries - can be used for further processing
        // window.walkCanceled = false;
        if (results.length > 0) {
          console.log("Directory thumbnails created " + entryPath);
          return true;
        }
        return false;
      })
      .catch((err) => {
        console.warn("Error creating thumbnails: ", err);
      });
  } else {
    return getPropertiesPromise(entryPath).then((fsEntry) => {
      if (extractPDFcontent) {
        extractAndSavePdf(fsEntry, extractPDFcontent);
      }
      return generateThumbnail(fsEntry);
    });
  }
};

function getThumbFileLocation(filePath) {
  const containingFolder = extractContainingDirectoryPath(filePath, path.sep);
  const metaFolder = getMetaDirectoryPath(containingFolder, path.sep);
  return (
    metaFolder +
    path.sep +
    extractFileName(filePath, path.sep) +
    AppConfig.thumbFileExt
  );
}

const checkThumbUpToDate = (fsEntry) => {
  const thumbFilePath = getThumbFileLocation(fsEntry.path);
  return getPropertiesPromise(thumbFilePath).then((stats) => {
    if (stats) {
      // Thumbnail exists
      return fsEntry.lmdt <= stats.lmdt;
    } else {
      // Thumbnail does not exists
    }
    return false;
  });
};

module.exports.removeThumbnail = function (srcBucket, key) {
  //TODO
  /*const srcKey = decodeURIComponent(key.replace(/\+/g, " "));
    const srcPath = path.parse(srcKey);
    const dstKey = (srcPath.dir ? srcPath.dir + '/' : '') + metaFolder + '/' + srcPath.base + '.jpg';

    if (srcKey.indexOf(metaFolder + '/') !== -1) {
        console.info('removeThumbnail skip meta folder' + srcKey);
        return Promise.resolve(true);
    }

    return s3.deleteObject({
        Bucket: srcBucket,
        Key: dstKey
    }).promise();*/
};
