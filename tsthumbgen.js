"use strict";

// dependencies
const async = require("async");
const sharp = require("sharp");
const pdf = require("pdf-thumbnail");
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

module.exports.isSupportedImageType = function (type) {
  const supportedTypes = [
    "jpeg",
    "jpg",
    "png",
    "webp",
    "avif",
    "tiff",
    "gif",
    "svg",
  ];
  return supportedTypes.includes(type);
};

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
  // Download the image from S3, transform, and upload to a different S3 bucket.
  async.waterfall(
    [
      function transform(next) {
        // set thumbnail width. Resize will set height automatically
        // to maintain aspect ratio.

        // Transform the image buffer in memory.
        sharp(image)
          .rotate()
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
        return Promise.resolve(false);
      } else {
        console.log(
          "Successfully resized" //+ srcBucket + '/' + srcKey +
          //' and uploaded to ' + dstBucket + '/' + dstKey
        );
        return Promise.resolve(true);
      }
    }
  );
};

module.exports.generatePDFThumbnail = function (
  data,
  imagePath,
  contentType,
  fnUpload
) {
  console.log("generatePDFThumbnail:" + contentType);
  // const pdfBuffer = require('fs').readFileSync('/some/path/example.pdf');
  // const buff = Buffer.from(pdfString, 'utf-8');
  return pdf(data, {
    resize: {
      width: tmbMaxWidth, //200 default
      // height: 200,  //default
    },
  })
    .then((inputStream) => {
      console.log("Successfully resized upload..");
      return fnUpload(imagePath, inputStream);
    })
    .catch((err) => {
      console.log(err);
      // next(err);
    });
};

/*const pdfString =
  '%PDF-1.1\n' +
  '%¥±ë\n' +
  '\n' +
  '1 0 obj\n' +
  '  << /Type /Catalog\n' +
  '     /Pages 2 0 R\n' +
  '  >>\n' +
  'endobj\n' +
  '\n' +
  '2 0 obj\n' +
  '  << /Type /Pages\n' +
  '     /Kids [3 0 R]\n' +
  '     /Count 1\n' +
  '     /MediaBox [0 0 300 144]\n' +
  '  >>\n' +
  'endobj\n' +
  '\n' +
  '3 0 obj\n' +
  '  <<  /Type /Page\n' +
  '      /Parent 2 0 R\n' +
  '      /Resources\n' +
  '       << /Font\n' +
  '           << /F1\n' +
  '               << /Type /Font\n' +
  '                  /Subtype /Type1\n' +
  '                  /BaseFont /Times-Roman\n' +
  '               >>\n' +
  '           >>\n' +
  '       >>\n' +
  '      /Contents 4 0 R\n' +
  '  >>\n' +
  'endobj\n' +
  '\n' +
  '4 0 obj\n' +
  '  << /Length 55 >>\n' +
  'stream\n' +
  '  BT\n' +
  '    /F1 18 Tf\n' +
  '    0 0 Td\n' +
  '    (Hello World) Tj\n' +
  '  ET\n' +
  'endstream\n' +
  'endobj\n' +
  '\n' +
  'xref\n' +
  '0 5\n' +
  '0000000000 65535 f \n' +
  '0000000018 00000 n \n' +
  '0000000077 00000 n \n' +
  '0000000178 00000 n \n' +
  '0000000457 00000 n \n' +
  'trailer\n' +
  '  <<  /Root 1 0 R\n' +
  '      /Size 5\n' +
  '  >>\n' +
  'startxref\n' +
  '565\n' +
  '%%EOF';*/
