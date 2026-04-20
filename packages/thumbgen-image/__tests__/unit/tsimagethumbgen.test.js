"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const AppConfig = require("@tagspaces/tagspaces-common/AppConfig");
const tsThumb = require("../../tsimagethumbgen");
const { getVips } = require("../../wasmvips");

const FIXTURES = path.resolve(
  __dirname,
  "../../../../scripts/testdata/file-structure/supported-filestypes"
);

function writeUpload(outPath) {
  return (_imagePath, data, next) => {
    fs.writeFileSync(outPath, data);
    if (next) next();
  };
}

function isJpegMagic(buf) {
  return (
    buf.length > 4 &&
    buf[0] === 0xff &&
    buf[1] === 0xd8 &&
    buf[buf.length - 2] === 0xff &&
    buf[buf.length - 1] === 0xd9
  );
}

// JPEG EXIF lives in an APP1 segment starting with the ASCII bytes "Exif\0\0".
// Scanning for that substring is a cheap, dependency-free presence check.
const EXIF_SIGNATURE = Buffer.from("Exif\0\0", "binary");

function hasExif(buf) {
  return buf.indexOf(EXIF_SIGNATURE) !== -1;
}

let vips;
let tmpDir;

beforeAll(async () => {
  vips = await getVips();
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "thumbgen-test-"));
});

afterAll(() => {
  if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("generateImageThumbnail (wasm-vips)", () => {
  const supported = [
    ["jpg", "sample.jpg"],
    ["jpeg", "sample.jpeg"],
    ["png", "sample.png"],
    ["webp", "sample.webp"],
    ["gif", "sample.gif"],
    ["tiff", "sample.tiff"],
    ["tif", "sample.tif"],
    ["svg", "sample.svg"],
  ];

  test.each(supported)(
    "produces a valid JPEG thumbnail for %s",
    async (ext, fixture) => {
      const src = path.join(FIXTURES, fixture);
      const input = fs.readFileSync(src);
      const outPath = path.join(tmpDir, fixture + ".jpg");

      const ok = await tsThumb.generateImageThumbnail(
        input,
        ext,
        outPath,
        writeUpload(outPath)
      );

      expect(ok).toBe(true);
      expect(fs.existsSync(outPath)).toBe(true);

      const out = fs.readFileSync(outPath);
      expect(out.length).toBeGreaterThan(0);
      expect(isJpegMagic(out)).toBe(true);
      // No source-image metadata should leak into thumbnails (PII, GPS, etc.)
      expect(hasExif(out)).toBe(false);

      const srcImg = vips.Image.newFromBuffer(input);
      const outImg = vips.Image.newFromBuffer(out);
      try {
        // Width never exceeds configured ceiling.
        expect(outImg.width).toBeLessThanOrEqual(AppConfig.maxThumbSize);

        // Aspect ratio preserved within 1 %. (Skip for SVG: librsvg may snap
        // to integer pixel boxes that drift >1 % on tiny fixtures.)
        if (ext !== "svg") {
          const srcRatio = srcImg.width / srcImg.height;
          const outRatio = outImg.width / outImg.height;
          expect(Math.abs(srcRatio - outRatio) / srcRatio).toBeLessThan(0.01);
        }
      } finally {
        srcImg.delete();
        outImg.delete();
      }
    }
  );

  test.each([
    ["avif", "sample.avif"],
    ["heic", "sample.jpg"], // synthetic: .heic ext, jpg bytes — ext-skip fires first
  ])("skips %s without writing output (HEVC patent guard)", async (ext, fixture) => {
    const src = path.join(FIXTURES, fixture);
    const input = fs.readFileSync(src);
    const outPath = path.join(tmpDir, `skip-${ext}.jpg`);

    const ok = await tsThumb.generateImageThumbnail(
      input,
      ext,
      outPath,
      writeUpload(outPath)
    );

    expect(ok).toBe(false);
    expect(fs.existsSync(outPath)).toBe(false);
  });

  test("strips EXIF from a source that actually has it", async () => {
    // This fixture carries an EXIF segment (TIFF orientation etc). The
    // positive tests above also assert no-EXIF on outputs, but the scripts
    // testdata samples happen to be metadata-free, so this adds the case
    // where the input definitely has EXIF to strip.
    const src = path.resolve(__dirname, "../../../../__tests__/img.jpg");
    const input = fs.readFileSync(src);
    expect(hasExif(input)).toBe(true); // sanity: the fixture has EXIF

    const outPath = path.join(tmpDir, "exif-source.jpg");
    const ok = await tsThumb.generateImageThumbnail(
      input,
      "jpg",
      outPath,
      writeUpload(outPath)
    );

    expect(ok).toBe(true);
    expect(hasExif(fs.readFileSync(outPath))).toBe(false);
  });

  test("getFileType extracts extension lowercase", () => {
    expect(tsThumb.getFileType("/a/b/PHOTO.JPG")).toBe("jpg");
    expect(tsThumb.getFileType("/a/b/noext")).toBeUndefined();
  });
});
