"use strict";

const async = require("async");
const sharp = require("./sharp/index").sharp;
// const sharp = require("sharp");
const stream = require("stream");

const tmbMaxWidth = 400;
// const metaFolder = '.ts';

// todo use path.ext
module.exports.getFileType = function (srcKey) {
  // Infer the image type.
  const typeMatch = srcKey.match(/\.([^.]*)$/);
  if (!typeMatch) {
    console.info("unable to infer file type for " + srcKey);
    return undefined;
  }
  return typeMatch[1].toLowerCase();
};

/*module.exports.isSupportedImageType = function (type) {
  /!*const supportedTypes = [
    "jpeg",
    "jpg",
    "png",
    "webp",
    "avif",
    "tiff",
    "gif",
    "svg",*!/

  const supportedTypes = [
    "jpg",
    "jpeg",
    "jif",
    "jfif",
    "png",
    "gif",
    "svg",
    "tif",
    "tiff",
    "ico",
    "webp",
    // 'psd', // Unable to resize  due to an error:  [Error: Input buffer contains unsupported image format]
    "avif",
  ];
  return supportedTypes.includes(type);
};*/

module.exports.isReadableStream = function (obj) {
  return (
    obj instanceof stream.Stream &&
    typeof (obj._read === "function") &&
    typeof (obj._readableState === "object")
  );
};

module.exports.generateImageThumbnail = function (
  image,
  imageType,
  imagePath,
  fnUpload = (imagePath, data, next) => {
    next();
  }
) {
  return new Promise((resolve) => {
    if (!sharp) {
      console.error("Unable to resize " + imagePath + " sharp not available");
      resolve(false);
    } else {
      // Download the image from S3, transform, and upload to a different S3 bucket.
      async.waterfall(
        [
          function transform(next) {
            // set thumbnail width. Resize will set height automatically
            // to maintain aspect ratio.

            // Transform the image buffer in memory.
            sharp(image)
              .rotate()
              .flatten({ background: "#ededed" })
              .resize(tmbMaxWidth)
              .jpeg()
              .toBuffer(imageType, function (err, buffer) {
                if (err) {
                  next(err);
                } else {
                  next(null, buffer);
                }
              });
          },
          function upload(data, next) {
            fnUpload(imagePath, data, next);
          },
        ],
        function (err) {
          if (err) {
            console.error(
              "Unable to resize " + //+ srcBucket + '/' + srcKey +
                //' and upload to ' + dstBucket + '/' + dstKey +
                " due to an error: ",
              err
            );
            resolve(false);
          } else {
            console.log(
              "Successfully resized" //+ srcBucket + '/' + srcKey +
              //' and uploaded to ' + dstBucket + '/' + dstKey
            );
            resolve(true);
          }
        }
      );
    }
  });
};
