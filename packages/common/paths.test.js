const pathLib = require("path");
const paths = require("@tagspaces/tagspaces-common/paths");
const AppConfig = require("@tagspaces/tagspaces-common/AppConfig");

describe("Common Paths unit tests", () => {
  test("paths baseName", async () => {
    const filePath = pathLib.join(__dirname, "img.jpg");
    const baseName = paths.baseName(filePath, AppConfig.dirSeparator);
    expect(baseName).toBe("img.jpg");
  });

  test("paths extractFileExtension", async () => {
    let filePath = pathLib.join(__dirname, "img[1star].jpg");
    let fileExt = paths.extractFileExtension(filePath, AppConfig.dirSeparator);
    expect(fileExt).toBe("jpg");

    filePath = pathLib.join(__dirname, "archive.tar.gz");
    fileExt = paths.extractFileExtension(filePath, AppConfig.dirSeparator);
    expect(fileExt).toBe("tar.gz");

    filePath = pathLib.join(__dirname, ".filename.zip");
    fileExt = paths.extractFileExtension(filePath, AppConfig.dirSeparator);
    expect(fileExt).toBe("zip");

    filePath = pathLib.join(__dirname, ".gitignore");
    fileExt = paths.extractFileExtension(filePath, AppConfig.dirSeparator);
    expect(fileExt).toBe("");
  });

  test("paths generateFileName", async () => {
    const fileName = paths.generateFileName(
      "archive.tar.gz",
      ["1star"],
      AppConfig.tagDelimiter
    );
    expect(fileName).toBe("archive[1star].tar.gz");
  });

  test("paths getMetaDirectoryPath", async () => {
    const filePath = pathLib.join(__dirname, "img.jpg");
    const metaDirectoryPath = paths.getMetaDirectoryPath(
      filePath,
      AppConfig.dirSeparator
    );
    expect(metaDirectoryPath).toBe(
      filePath + AppConfig.dirSeparator + AppConfig.metaFolder
    );
  });

  test("paths getThumbFileLocationForFile", async () => {
    const filePath = pathLib.join(__dirname, "img.jpg");
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

  test("paths getThumbFileLocationForFile video", async () => {
    const filePath =
      "video:///Users/sytolk/Movies/file_example_AVI_480_750kB.avi";
    const thumbPath = paths.getThumbFileLocationForFile(
      filePath,
      undefined,
      false
    );
    const containingFolder = paths.extractContainingDirectoryPath(filePath);
    expect(thumbPath).toBe(
      containingFolder + "/.ts/file_example_AVI_480_750kB.avi.jpg"
    );
  });

  test("paths getThumbFileLocationForDirectory", async () => {
    const dirPath = __dirname;
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
      rootContainingFolder + "image-thumb.jpg"
    );
  });
  test("paths getMetaFileLocationForDir", async () => {
    const dirPath = __dirname;
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
    const dirPath = pathLib.join(__dirname, "img.jpg");
    const fileName = paths.extractFileName(dirPath, AppConfig.dirSeparator);
    expect(fileName).toBe("img.jpg");
  });

  test("paths encodeFileName", async () => {
    const fileName = paths.encodeFileName(
      __dirname + AppConfig.dirSeparator + "img img.jpg",
      AppConfig.dirSeparator
    );
    expect(fileName).toBe(__dirname + AppConfig.dirSeparator + "img%20img.jpg");
  });

  test("paths cleanTrailingDirSeparator", async () => {
    const clenPath = paths.cleanTrailingDirSeparator(
      __dirname + AppConfig.dirSeparator + AppConfig.dirSeparator
    );
    expect(clenPath).toBe(__dirname);
  });

  test("paths normalizePath", async () => {
    const clenPath = paths.normalizePath(__dirname + AppConfig.dirSeparator);
    expect(clenPath).toBe(__dirname);
  });

  test("paths extractFileNameWithoutExt - regular case", async () => {
    const dirPath = pathLib.join(__dirname, "image.jpg");
    const fileName = paths.extractFileNameWithoutExt(
      dirPath,
      AppConfig.dirSeparator
    );
    expect(fileName).toBe("image");
  });

  test("paths extractFileNameWithoutExt - unix hidden files", async () => {
    const dirPath = pathLib.join(__dirname, ".bashrc");
    const fileName = paths.extractFileNameWithoutExt(
      dirPath,
      AppConfig.dirSeparator
    );
    expect(fileName).toBe(".bashrc");
  });

  test("paths extractFileNameWithoutExt - without extension", async () => {
    const dirPath = pathLib.join(__dirname, "LICENSE");
    const fileName = paths.extractFileNameWithoutExt(
      dirPath,
      AppConfig.dirSeparator
    );
    expect(fileName).toBe("LICENSE");
  });

  test("paths extractFileNameWithoutExt - containing only tags", async () => {
    let dirPath = pathLib.join(__dirname, "[tag1 tag3].jpg");
    let fileName = paths.extractFileNameWithoutExt(
      dirPath,
      AppConfig.dirSeparator
    );
    expect(fileName).toBe("[tag1 tag3]");

    dirPath = pathLib.join(__dirname, "[tag1 tag.4].jpg");
    fileName = paths.extractFileNameWithoutExt(dirPath, AppConfig.dirSeparator);
    expect(fileName).toBe("[tag1 tag.4]");

    dirPath = pathLib.join(__dirname, "[tag1 tag2]");
    fileName = paths.extractFileNameWithoutExt(dirPath, AppConfig.dirSeparator);
    expect(fileName).toBe("[tag1 tag2]");
  });

  test("paths extractContainingDirectoryPath", async () => {
    const containingFolder = paths.extractContainingDirectoryPath(
      __dirname + AppConfig.dirSeparator + "img.jpg",
      AppConfig.dirSeparator
    );
    expect(containingFolder).toBe(__dirname);
  });

  test("paths extractParentDirectoryPath", async () => {
    const parentDirectoryPath = paths.extractParentDirectoryPath(
      __dirname + AppConfig.dirSeparator,
      AppConfig.dirSeparator
    );
    expect(parentDirectoryPath).toBe(pathLib.join(__dirname, ".."));
  });

  test("paths extractDirectoryName", async () => {
    const directoryName = paths.extractDirectoryName(
      __dirname + AppConfig.dirSeparator,
      AppConfig.dirSeparator
    );
    expect(directoryName).toBe("common");
  });
  test("paths extractShortDirectoryName", async () => {
    const dirPath = pathLib.join(
      __dirname,
      "LONG_DIRECTORY_NAME_OVER_20_CHARS"
    );
    const directoryName = paths.extractShortDirectoryName(
      dirPath + AppConfig.dirSeparator,
      AppConfig.dirSeparator
    );
    expect(directoryName).toBe("LONG_DIRECTORY_NAME_...");
  });
  test("paths extractContainingDirectoryName", async () => {
    const dirPath = pathLib.join(__dirname, "img.jpg");
    const containingDirectoryName = paths.extractContainingDirectoryName(
      dirPath,
      AppConfig.dirSeparator
    );
    expect(containingDirectoryName).toBe("common");
  });

  test("paths extractTitle", async () => {
    const dirPath = pathLib.join(__dirname, "img%20img.jpg");
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
    let tags = paths.extractTags("img[Tag1].jpg");
    expect(tags).toEqual(["Tag1"]);

    tags = paths.extractTags("img[tag1 tag2].jpg", " ");
    expect(tags).toEqual(["tag1", "tag2"]);

    tags = paths.extractTags("img[tag1 tag2.4].jpg", " ");
    expect(tags).toEqual(["tag1", "tag2.4"]);

    tags = paths.extractTags("img[tag1 tag5]", " ");
    expect(tags).toEqual(["tag1", "tag5"]);
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
      __dirname,
      "img.jpg"
    );
    expect(path).toBe(pathLib.join(__dirname, "img.jpg"));

    const rootPath = AppConfig.isWin
      ? "\\\\DESKTOP-07OE903\\Users\\smari\\OneDrive\\Картини\\test\\"
      : "/Users/sytolk/Downloads/Yarndings_20/";
    const path1 = paths.joinPaths(AppConfig.dirSeparator, rootPath, "new_dir");
    expect(path1).toBe(pathLib.join(rootPath, "new_dir"));
  });

  test("paths cleanRootPath - strips matching root prefix", () => {
    const result = paths.cleanRootPath(
      "/Users/na/folder/memory/MEMORY.md",
      "/Users/na/folder/memory"
    );
    expect(result).toBe("MEMORY.md");
  });

  test("paths cleanRootPath - strips matching root with trailing slash", () => {
    const result = paths.cleanRootPath(
      "/Users/na/folder/memory/MEMORY.md",
      "/Users/na/folder/memory/"
    );
    expect(result).toBe("MEMORY.md");
  });

  test("paths cleanRootPath - handles subdirectories", () => {
    const result = paths.cleanRootPath(
      "/Users/na/folder/memory/sub/file.txt",
      "/Users/na/folder/memory"
    );
    expect(result).toBe("sub/file.txt");
  });

  test("paths cleanRootPath - returns full path when root does not match", () => {
    const result = paths.cleanRootPath(
      "/totally/different/path/file.txt",
      "/Users/na/folder"
    );
    expect(result).toBe("totally/different/path/file.txt");
  });

  test("paths cleanRootPath - returns cleaned path when root is empty", () => {
    const result = paths.cleanRootPath(
      "/Users/na/folder/MEMORY.md",
      ""
    );
    expect(result).toBe("Users/na/folder/MEMORY.md");
  });

  test("paths cleanRootPath - returns cleaned path when root is null", () => {
    const result = paths.cleanRootPath(
      "/Users/na/folder/MEMORY.md",
      null
    );
    expect(result).toBe("Users/na/folder/MEMORY.md");
  });

  test("paths cleanRootPath - handles sdcard paths", () => {
    const result = paths.cleanRootPath(
      "/sdcard/Downloads/////DSCN1.jpg",
      "sdcard/Downloads"
    );
    expect(result).toBe("DSCN1.jpg");
  });

  test("paths generateSharingLink", async () => {
    const locationID = "locationID";
    const entryPath = pathLib.join(__dirname, "img.jpg");
    const directoryPath = __dirname;
    const entryID = "entryID";
    const link = paths.generateSharingLink(
      locationID,
      entryPath,
      directoryPath,
      entryID
    );
    expect(link).toBe(
      "ts://?tslid=" +
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
