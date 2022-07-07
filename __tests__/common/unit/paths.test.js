const pathLib = require("path");
const paths = require("../../../common/paths");
const AppConfig = require("../../../common/AppConfig");

test("paths getThumbFileLocationForFile", async () => {
  const filePath = pathLib.join(__dirname, "..", "..", "img.jpg");
  const thumbPath = paths.getThumbFileLocationForFile(
    filePath,
    AppConfig.dirSeparator,
    false
  );
  const containingFolder = paths.extractContainingDirectoryPath(
    filePath,
    AppConfig.dirSeparator
  );
  expect(thumbPath).toBe(
    containingFolder +
      AppConfig.dirSeparator +
      ".ts" +
      AppConfig.dirSeparator +
      "img.jpg.jpg"
  );
});
