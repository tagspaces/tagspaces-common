const pathLib = require("path");
const paths = require("../../../common/paths");
const AppConfig = require("../../../common/AppConfig");

describe("Common Paths unit tests", () => {
  test("paths baseName", async () => {
    const filePath = pathLib.join(__dirname, "..", "..", "img.jpg");
    const baseName = paths.baseName(filePath, AppConfig.dirSeparator);
    expect(baseName).toBe("img.jpg");
  });

  test("paths extractFileExtension", async () => {
    const filePath = pathLib.join(__dirname, "..", "..", "img.jpg");
    const fileExtension = paths.extractFileExtension(
      filePath,
      AppConfig.dirSeparator
    );
    expect(fileExtension).toBe("jpg");
  });

  test("paths getMetaDirectoryPath", async () => {
    const filePath = pathLib.join(__dirname, "..", "..", "img.jpg");
    const metaDirectoryPath = paths.getMetaDirectoryPath(
      filePath,
      AppConfig.dirSeparator
    );
    expect(metaDirectoryPath).toBe(
      filePath + AppConfig.dirSeparator + AppConfig.metaFolder
    );
  });

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

  test("paths getThumbFileLocationForDirectory", async () => {
    const dirPath = pathLib.join(__dirname, "..", "..");
    const thumbPath = paths.getThumbFileLocationForDirectory(
      dirPath,
      AppConfig.dirSeparator
    );
    expect(thumbPath).toBe(
      dirPath +
        AppConfig.dirSeparator +
        AppConfig.metaFolder +
        AppConfig.dirSeparator +
        AppConfig.folderThumbFile
    );
  });
  test("paths getFileLocationFromMetaFile", async () => {
    const filePath = pathLib.join(
      __dirname,
      "..",
      "..",
      AppConfig.metaFolder,
      "image-thumb.jpg.jpg"
    );
    const fileLocationFromMetaFile = paths.getFileLocationFromMetaFile(
      filePath,
      AppConfig.dirSeparator
    );
    const containingFolder = paths.extractContainingDirectoryPath(
      filePath,
      AppConfig.dirSeparator
    );
    const rootContainingFolder = containingFolder.substring(
      0,
      containingFolder.length - AppConfig.metaFolder.length
    );
    expect(fileLocationFromMetaFile).toBe(
      rootContainingFolder + "image-thumb.jpg.jpg"
    );
  });
  test("paths getMetaFileLocationForDir", async () => {
    const dirPath = pathLib.join(__dirname, "..", "..");
    const fileLocationFromMetaFile = paths.getMetaFileLocationForDir(
      dirPath,
      AppConfig.dirSeparator
    );
    expect(fileLocationFromMetaFile).toBe(
      dirPath +
        AppConfig.dirSeparator +
        AppConfig.metaFolder +
        AppConfig.dirSeparator +
        AppConfig.metaFolderFile
    );
  });

  test("paths extractFileName", async () => {
    const dirPath = pathLib.join(__dirname, "..", "..", "img.jpg");
    const fileName = paths.extractFileName(dirPath, AppConfig.dirSeparator);
    expect(fileName).toBe("img.jpg");
  });

  test("paths encodeFileName", async () => {
    const dirPath = pathLib.join(__dirname, "..", "..");
    const fileName = paths.encodeFileName(
      dirPath + AppConfig.dirSeparator + "img img.jpg",
      AppConfig.dirSeparator
    );
    expect(fileName).toBe(dirPath + AppConfig.dirSeparator + "img%20img.jpg");
  });

  test("paths cleanTrailingDirSeparator", async () => {
    const dirPath = pathLib.join(__dirname, "..", "..");
    const clenPath = paths.cleanTrailingDirSeparator(
      dirPath + AppConfig.dirSeparator
    );
    expect(clenPath).toBe(dirPath);
  });

  test("paths normalizePath", async () => {
    const dirPath = pathLib.join(__dirname, "..", "..");
    const clenPath = paths.normalizePath(dirPath + AppConfig.dirSeparator);
    expect(clenPath).toBe(dirPath);
  });

  test("paths extractFileNameWithoutExt", async () => {
    const dirPath = pathLib.join(__dirname, "..", "..", "img.jpg");
    const fileName = paths.extractFileNameWithoutExt(
      dirPath,
      AppConfig.dirSeparator
    );
    expect(fileName).toBe("img");
  });

  test("paths extractContainingDirectoryPath", async () => {
    const dirPath = pathLib.join(__dirname, "..", "..");
    const containingFolder = paths.extractContainingDirectoryPath(
      dirPath + AppConfig.dirSeparator + "img.jpg",
      AppConfig.dirSeparator
    );
    expect(containingFolder).toBe(dirPath);
  });

  test("paths extractParentDirectoryPath", async () => {
    const dirPath = pathLib.join(__dirname, "..", "..");
    const parentDirectoryPath = paths.extractParentDirectoryPath(
      dirPath + AppConfig.dirSeparator,
      AppConfig.dirSeparator
    );
    expect(parentDirectoryPath).toBe(pathLib.join(__dirname, "..", "..", ".."));
  });

  test("paths extractDirectoryName", async () => {
    const dirPath = pathLib.join(__dirname, "..", "..");
    const directoryName = paths.extractDirectoryName(
      dirPath + AppConfig.dirSeparator,
      AppConfig.dirSeparator
    );
    expect(directoryName).toBe("__tests__");
  });
  test("paths extractShortDirectoryName", async () => {
    const dirPath = pathLib.join(
      __dirname,
      "..",
      "..",
      "LONG_DIRECTORY_NAME_OVER_20_CHARS"
    );
    const directoryName = paths.extractShortDirectoryName(
      dirPath + AppConfig.dirSeparator,
      AppConfig.dirSeparator
    );
    expect(directoryName).toBe("LONG_DIRECTORY_NAME_...");
  });
  test("paths extractContainingDirectoryName", async () => {
    const dirPath = pathLib.join(__dirname, "..", "..", "img.jpg");
    const containingDirectoryName = paths.extractContainingDirectoryName(
      dirPath,
      AppConfig.dirSeparator
    );
    expect(containingDirectoryName).toBe("__tests__");
  });

  test("paths extractTitle", async () => {
    const dirPath = pathLib.join(__dirname, "..", "..", "img%20img.jpg");
    const title = paths.extractTitle(dirPath, false, AppConfig.dirSeparator);
    expect(title).toBe("img img");
  });

  test("paths cleanFileName", async () => {
    const title = paths.cleanFileName("img[tag1].jpg");
    expect(title).toBe("img.jpg");
  });

  test("paths cleanFileName", async () => {
    const title = paths.cleanFileName("img[tag1].jpg");
    expect(title).toBe("img.jpg");
  });

  test("paths extractTagsAsObjects", async () => {
    const tags = paths.extractTagsAsObjects("img[tag1].jpg");
    expect(tags).toEqual([
      {
        title: "tag1",
        type: "plain",
      },
    ]);
  });

  test("paths extractTags", async () => {
    const tags = paths.extractTags("img[tag1].jpg");
    expect(tags).toEqual(["tag1"]);
  });

  test("paths tagsAsObjects", async () => {
    const tags = paths.tagsAsObjects(["tag1", "tag2"]);
    expect(tags).toEqual([
      {
        title: "tag1",
        type: "plain",
      },
      {
        title: "tag2",
        type: "plain",
      },
    ]);
  });

  test("paths joinPaths", async () => {
    const path = paths.joinPaths(
      AppConfig.dirSeparator,
      pathLib.join(__dirname, "..", ".."),
      "img.jpg"
    );
    expect(path).toBe(pathLib.join(__dirname, "..", "..", "img.jpg"));
  });

  test("paths generateSharingLink", async () => {
    const locationID = "locationID";
    const entryPath = pathLib.join(__dirname, "..", "..", "img.jpg");
    const directoryPath = pathLib.join(__dirname, "..", "..");
    const entryID = "entryID";
    const link = paths.generateSharingLink(
      locationID,
      entryPath,
      directoryPath,
      entryID
    );
    expect(link).toBe(
      "ts:?tslid=" +
        locationID +
        "&tsepath=" +
        encodeURIComponent(entryPath) +
        "&tsdpath=" +
        encodeURIComponent(directoryPath) +
        "&tseid=" +
        entryID
    );
  });
});
