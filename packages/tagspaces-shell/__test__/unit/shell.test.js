const { cleanMeta } = require("@tagspaces/tagspaces-metacleaner/metacleaner");
const {
  processAllThumbnails,
} = require("@tagspaces/tagspaces-workers/tsnodethumbgen");
const pathLib = require("path");
const fs = require("fs");

describe("shell unit tests", () => {
  const testingDir = pathLib.resolve(__dirname, "..");

  test("thumbnails.gen", async () => {
    const success = await processAllThumbnails(testingDir, false);
    if (success) {
      console.log("Thumbnails generated in folder: " + testingDir);
    } else {
      console.warn("Thumbnails not generated for folder: " + testingDir);
    }
    const thumbPath = pathLib.resolve(__dirname, "..", ".ts", "test.jpg.jpg");
    expect(fs.existsSync(thumbPath)).toBe(true);
  });

  test("metacleaner.cleanMeta", async () => {
    const testFilePath = pathLib.resolve(
      __dirname,
      "..",
      ".ts",
      "file_for_clean.jpg.jpg"
    );
    fs.writeFileSync(testFilePath, "tests");
    const fileExists = fs.existsSync(testFilePath);
    expect(fileExists).toBe(true);

    await cleanMeta(
      testingDir,
      (filePath) => {
        console.log("File cleaned:" + filePath);
      },
      false,
      { considerMetaJSON: false, considerThumb: true }
    );
    console.log("Dir cleaned:" + testingDir);
    expect(fs.existsSync(testFilePath)).toBe(false);

    const thumbPath = pathLib.resolve(__dirname, "..", ".ts", "test.jpg.jpg");
    expect(fs.existsSync(thumbPath)).toBe(true);
  });
});
