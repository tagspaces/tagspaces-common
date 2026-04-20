"use strict";

const stream = require("stream");
const AppConfig = require("@tagspaces/tagspaces-common/AppConfig");
const { getVips, withVips } = require("./wasmvips");

// HEIF / HEIC / AVIF go through libheif → HEVC decoding. We deliberately do
// not ship vips-heif.wasm. These must be rejected before any call into vips.
const UNSUPPORTED_EXTS = new Set(["heic", "heif", "avif", "avifs"]);

module.exports.getFileType = function (srcKey) {
  const typeMatch = srcKey.match(/\.([^.]*)$/);
  if (!typeMatch) {
    console.info("unable to infer file type for " + srcKey);
    return undefined;
  }
  return typeMatch[1].toLowerCase();
};

module.exports.isReadableStream = function (obj) {
  return (
    obj instanceof stream.Stream &&
    typeof (obj._read === "function") &&
    typeof (obj._readableState === "object")
  );
};

module.exports.generateImageThumbnail = async function (
  image,
  imageType,
  imagePath,
  fnUpload = (imagePath, data, next) => {
    next();
  },
) {
  if (imageType && UNSUPPORTED_EXTS.has(imageType.toLowerCase())) {
    return false;
  }

  const vips = await getVips();
  if (!vips) {
    console.error(
      "Unable to resize " + imagePath + " — wasm-vips not available",
    );
    return false;
  }

  let buffer;
  try {
    buffer = await withVips(() => {
      let img = vips.Image.thumbnailBuffer(image, AppConfig.maxThumbSize, {
        no_rotate: false,
        size: "down",
        fail_on: "none",
      });
      try {
        if (img.hasAlpha()) {
          const flat = img.flatten({ background: [237, 237, 237] });
          img.delete();
          img = flat;
        }
        // keep:'none' strips EXIF / IPTC / XMP / ICC — thumbnails should not
        // carry the source's metadata (PII, GPS, camera info, etc.). The
        // thumbnailBuffer call above already applied any EXIF orientation,
        // so we don't need to keep the tag.
        const out = img.jpegsaveBuffer({ Q: 95, keep: "none" });
        return Buffer.from(out);
      } finally {
        img.delete();
      }
    });
  } catch (err) {
    console.error("Unable to resize " + imagePath + " due to an error: ", err);
    return false;
  }

  return new Promise((resolve) => {
    fnUpload(imagePath, buffer, (err) => {
      if (err) {
        console.error(
          "Unable to persist thumbnail " + imagePath + " due to an error: ",
          err,
        );
        resolve(false);
      } else {
        resolve(true);
      }
    });
  });
};
