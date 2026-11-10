"use strict";

// const path = require("path");
const tsThumbImage = require("@tagspaces/tagspaces-thumbgen-image/tsimagethumbgen");
const tsThumbPdf = require("@tagspaces/tagspaces-thumbgen-pdf/tspdfthumbgen");
const AppConfig = require("@tagspaces/tagspaces-common/AppConfig");
const tsUtils = require("@tagspaces/tagspaces-common/utils-io");
const tsPaths = require("@tagspaces/tagspaces-common/paths");
const aws3 = require("@tagspaces/tagspaces-common-aws3");

module.exports.generateThumbnail = function (srcBucket, key) {
  const checkThumbUpToDate = (filePath, bucketName) => {
    return aws3
      .getPropertiesPromise({ path: filePath, bucketName: bucketName })
      .then((stats) => {
        if (stats) {
          console.log("Thumbnail exists");
          return true;
        } else {
          console.log("Thumbnail does not exists");
        }
        return false;
      });
  };
  return new Promise(async (resolve) => {
    // Object key may have spaces or unicode non-ASCII characters.
    const srcKey = decodeURIComponent(key.replace(/\+/g, " "));
    const dstBucket = srcBucket;
    //const srcPath = path.parse(srcKey);
    const dstPath = tsPaths.getThumbFileLocationForFile(srcKey, "/", false);
    /*const dstPath = (srcPath.dir ? srcPath.dir + "/" : "") +
      AppConfig.metaFolder +
      "/" +
      srcPath.base +
      ".jpg";*/

    console.log("generateThumbnail srcKey:" + srcKey + " dstPath:" + dstPath);
    if (srcKey.indexOf(AppConfig.metaFolder + "/") !== -1) {
      console.info("generateThumbnail skip meta folder:" + srcKey);
      resolve(true);
      return;
    }
    const uptoDate = await checkThumbUpToDate(dstPath, dstBucket);
    if (uptoDate) {
      console.info("generateThumbnail skip exist:" + dstPath);
      resolve(true);
      return;
    }

    const fileType = tsThumbImage.getFileType(srcKey);
    console.info("generateThumbnail fileType:" + fileType);

    const upload = (contentType, data, next) => {
      aws3
        .saveBinaryFilePromise({ path: dstPath, bucketName: dstBucket }, data)
        .then(() => {
          if (next) {
            next();
          }
        });
    };
    const isImage = tsUtils.isThumbGenSupportedFileType(fileType, "image");
    if (isImage) {
      const fileContent = await aws3.getFileContentPromise(
        { path: srcKey, bucketName: dstBucket },
        "arraybuffer"
      );
      const success = await tsThumbImage.generateImageThumbnail(
        fileContent,
        fileType,
        "image/jpg",
        upload
      );
      if (success) {
        resolve(dstPath);
        return;
      }
    } else if (fileType === "pdf") {
      const fileContent = await aws3.getFileContentPromise({
        srcPath: dstPath,
        bucketName: dstBucket,
      });
      const success = await tsThumbPdf.generatePDFThumbnail(
        fileContent,
        fileType,
        "application/pdf",
        upload
      );
      if (success) {
        resolve(dstPath);
        return;
      }
    } else {
      console.info(
        "generateThumbnail skip file type not supported:" + fileType
      );
    }
    resolve(false);
  });
};

module.exports.removeThumbnail = function (srcBucket, key) {
  const srcKey = decodeURIComponent(key.replace(/\+/g, " "));

  if (srcKey.indexOf(AppConfig.metaFolder + "/") !== -1) {
    console.info("removeThumbnail skip meta folder:" + srcKey);
    return Promise.resolve(false);
  }

  //const srcPath = path.parse(srcKey);
  const dstPath = tsPaths.getThumbFileLocationForFile(srcKey, "/", false);
  /* (srcPath.dir ? srcPath.dir + "/" : "") +
    AppConfig.metaFolder +
    "/" +
    srcPath.base +
    ".jpg";*/

  return aws3.deleteFilePromise({ path: dstPath, bucketName: srcBucket });
};

module.exports.processAllThumbnails = function (srcBucket) {
  console.log("srcBucket:", srcBucket);
  // TODO impl
  /* const dstBucket = srcBucket;

  return s3
    .listObjectsV2({ Bucket: srcBucket })
    .promise()
    .then((data) => {
      const promises = data.Contents.map((object) => {
        console.log(object);
        const srcKey = object.Key;
        if (srcKey.indexOf(AppConfig.metaFolder + "/") === -1) {
          const srcPath = path.parse(srcKey);
          const dstKey =
            (srcPath.dir ? srcPath.dir + "/" : "") +
            AppConfig.metaFolder +
            "/" +
            srcPath.base +
            ".jpg";

          const upload = (contentType, data, next) => {
            if (tsThumbImage.isReadableStream(data)) {
              s3.upload(
                {
                  Bucket: dstBucket,
                  Key: dstKey,
                  Body: data,
                },
                next
              );
            } else {
              s3.putObject(
                {
                  Bucket: dstBucket,
                  Key: dstKey,
                  Body: data,
                  ContentType: contentType,
                },
                next
              );
            }
          };

          if (!srcKey.startsWith(AppConfig.metaFolder)) {
            const fileType = tsThumbImage.getFileType(srcKey);
            if (tsUtils.isThumbGenSupportedFileType(fileType, "image")) {
              return s3
                .getObject({
                  Bucket: srcBucket,
                  Key: srcKey,
                })
                .promise()
                .then((response) => {
                  return tsThumbImage.generateImageThumbnail(
                    response.Body,
                    fileType,
                    "image/jpg",
                    upload
                  );
                });
            } else if (fileType === "pdf") {
              return s3
                .getObject({
                  Bucket: srcBucket,
                  Key: srcKey,
                })
                .promise()
                .then((response) => {
                  return tsThumbPdf.generatePDFThumbnail(
                    response,
                    fileType,
                    "application/pdf",
                    upload
                  );
                });
            } else {
              console.warn("unsupported image format:" + fileType);
            }
          }
        }
        return Promise.resolve(undefined);
      });
      return Promise.all(promises);
    });*/
};
