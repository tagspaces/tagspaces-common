"use strict";

// dependencies
const AWS = require("aws-sdk");
const path = require("path");
const tsThumbImage = require("@tagspaces/tagspaces-thumbgen-image/tsimagethumbgen");
const tsThumbPdf = require("@tagspaces/tagspaces-thumbgen-pdf/tspdfthumbgen");
const AppConfig = require("@tagspaces/tagspaces-common/AppConfig");
const tsUtils = require("@tagspaces/tagspaces-common/utils-io");

// get reference to S3 client
const s3 = new AWS.S3();

module.exports.generateThumbnail = function (srcBucket, key) {
  return new Promise((resolve) => {
    // Object key may have spaces or unicode non-ASCII characters.
    const srcKey = decodeURIComponent(key.replace(/\+/g, " "));
    const dstBucket = srcBucket;
    const srcPath = path.parse(srcKey);
    const dstKey =
      (srcPath.dir ? srcPath.dir + "/" : "") +
      AppConfig.metaFolder +
      "/" +
      srcPath.base +
      ".jpg";

    //console.log('srcKey:', srcKey);
    if (srcKey.indexOf(AppConfig.metaFolder + "/") !== -1) {
      console.info("generateThumbnail skip meta folder" + srcKey);
      resolve(true);
      return;
    }

    const upload = (contentType, data, next) => {
      /*if (tsThumb.isReadableStream(data)) {
              s3.upload(
                {
                  Bucket: dstBucket,
                  Key: dstKey,
                  Body: data,
                },
                next
              );
            } else {*/
      s3.putObject(
        {
          Bucket: dstBucket,
          Key: dstKey,
          Body: data,
          ContentType: contentType,
        },
        () => resolve(dstKey) // next
      );
      //}
    };

    const fileType = tsThumbImage.getFileType(srcKey);
    console.info("generateThumbnail fileType:" + fileType);

    if (tsUtils.isThumbGenSupportedFileType(fileType, "image")) {
      s3.getObject({
        Bucket: srcBucket,
        Key: srcKey,
      })
        .promise()
        .then((response) => {
          tsThumbImage.generateImageThumbnail(
            response.Body,
            fileType,
            "image/jpg",
            upload
          );
        });
    } else if (fileType === "pdf") {
      const source = s3
        .getObject({
          Bucket: srcBucket,
          Key: srcKey,
        })
        .createReadStream();
      tsThumbPdf.generatePDFThumbnail(
        source,
        fileType,
        "application/pdf",
        upload
      );
    } else {
      console.warn("unsupported file format:" + fileType);
      resolve(true);
    }
  });
};

module.exports.removeThumbnail = function (srcBucket, key) {
  const srcKey = decodeURIComponent(key.replace(/\+/g, " "));

  if (srcKey.indexOf(AppConfig.metaFolder + "/") !== -1) {
    console.info("removeThumbnail from meta folder" + srcKey);

    const params = {
      Bucket: srcBucket,
      Key: srcKey,
    };
    return s3.headObject(params, (err, data) => {
      if (err) {
        return true;
      }
      return s3.deleteObject(params).promise();
    });
  }

  const srcPath = path.parse(srcKey);
  const dstKey =
    (srcPath.dir ? srcPath.dir + "/" : "") +
    AppConfig.metaFolder +
    "/" +
    srcPath.base +
    ".jpg";

  return s3
    .deleteObject({
      Bucket: srcBucket,
      Key: dstKey,
    })
    .promise();
};

module.exports.processAllThumbnails = function (srcBucket) {
  console.log("srcBucket:", srcBucket);
  const dstBucket = srcBucket;

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
    });
};
