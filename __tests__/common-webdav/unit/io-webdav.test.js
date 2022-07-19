const pathLib = require("path");
const fs = require("fs-extra");
const AppConfig = require("../../../common/AppConfig");
const { clean } = require("../../../scripts/webdav/webdavserver-v2");
const {
  configure,
  listMetaDirectoryPromise,
  listDirectoryPromise,
  saveTextFilePromise,
  saveBinaryFilePromise,
  getPropertiesPromise,
  isDirectory,
  loadTextFilePromise,
  getFileContentPromise,
  createDirectoryPromise,
  copyFilePromise,
  renameFilePromise,
  renameDirectoryPromise,
  deleteFilePromise,
  deleteDirectoryPromise,
} = require("../../../common-webdav/io-webdav");

const {
  PASSWORD,
  PORT,
  USERNAME,
} = require("webdav/test/server/credentials.js");

describe("Webdav unit tests", () => {
  beforeAll(() => {
    configure({
      authType: "password",
      username: USERNAME, // "webdav",
      password: PASSWORD, // "1234",
      port: PORT, //8000,
    });

    try {
      clean(
        pathLib.resolve(
          __dirname,
          "../../../scripts/testdata/file-structure/supported-filestypes"
        )
      );
    } catch (ex) {
      console.error("clean failed:" + ex.message);
    }
  });

  afterAll(() => {
    try {
      clean(
        pathLib.resolve(
          __dirname,
          "../../../scripts/testdata/file-structure/supported-filestypes"
        )
      );
    } catch (ex) {
      console.error("clean failed:" + ex.message);
    }
  });

  /*beforeEach(function () {
    try {
      clean(
        pathLib.resolve(
          __dirname,
          "../../../scripts/testdata/file-structure/supported-filestypes"
        )
      );
    } catch (ex) {
      console.error("clean failed:" + ex.message);
    }
  });*/

  test("listMetaDirectoryPromise", async () => {
    const list = await listMetaDirectoryPromise("/empty_folder");
    console.log(JSON.stringify(list));
  });

  test("listDirectoryPromise", async () => {
    const list = await listDirectoryPromise("/empty_folder");
    // console.log(JSON.stringify(list));
    expect(list[0].name).toEqual(".gitkeep");
  });

  test("saveTextFilePromise", async () => {
    const filePath = "/empty_folder/test.txt";
    const file = await saveTextFilePromise(filePath, "test");
    expect(file.path).toEqual(filePath);
  });

  test("saveBinaryFilePromise", async () => {
    const filePath = "empty_folder/img.jpg";
    const file = await saveBinaryFilePromise(
      filePath,
      fs.createReadStream(pathLib.resolve(__dirname, "../../img.jpg"))
    );
    expect(file.path).toEqual(filePath);
  });

  test("isDirectory", async () => {
    const isDir = await isDirectory("/empty_folder");
    expect(isDir).toBe(true);
    const isFile = await isDirectory("/empty_folder/.gitkeep");
    expect(isFile).toBe(false);
  });

  test("getPropertiesPromise", async () => {
    let props = await getPropertiesPromise("/empty_folder");
    expect(props.isFile).toBe(false);
    props = await getPropertiesPromise("/empty_folder/.gitkeep");
    expect(props.isFile).toBe(true);
  });

  test("loadTextFilePromise", async () => {
    const txt = await loadTextFilePromise("sample.json");
    expect(txt).toEqual(
      fs
        .readFileSync(
          pathLib.join(__dirname, "../../../scripts/testContents/sample.json"),
          "utf8"
        )
        .substr(1)
    );
  });

  test("getFileContentPromise", async () => {
    const js = await getFileContentPromise("sample.js");
    expect(js).toEqual(
      fs
        .readFileSync(
          pathLib.join(__dirname, "../../../scripts/testContents/sample.js"),
          "utf8"
        )
        .substr(1)
    );
  });

  test("createDirectoryPromise", async () => {
    const dirPath = await createDirectoryPromise("/test_dir");
    expect(dirPath).toEqual("/test_dir");
    /*  // TODO
    const dPath = pathLib.resolve(
        __dirname,
        "../../../scripts/testContents/test_dir"
    );
    expect(await isDirectory(dPath)).toBe(true);
    */
  });

  test("copyFilePromise", async () => {
    const [sourceFilePath, targetFilePath] = await copyFilePromise(
      "/sample.txt",
      "/empty_folder/sample.txt"
    );
    expect(sourceFilePath).toEqual("/sample.txt");
    expect(targetFilePath).toEqual("/empty_folder/sample.txt");

    const targetFile = fs.lstatSync(
      pathLib.resolve(
        __dirname,
        "../../../scripts/testContents/empty_folder/sample.txt"
      )
    );
    expect(targetFile.size).toBeGreaterThan(0);
  });

  test("renameFilePromise", async () => {
    const [sourceFilePath, targetFilePath] = await renameFilePromise(
      "sample.txt",
      "sample-renamed.txt"
    );
    expect(sourceFilePath).toEqual("sample.txt");
    expect(targetFilePath).toEqual("sample-renamed.txt");

    const targetFile = fs.lstatSync(
      pathLib.resolve(
        __dirname,
        "../../../scripts/testContents/sample-renamed.txt"
      )
    );
    expect(targetFile.size).toBeGreaterThan(0);
  });

  test("renameDirectoryPromise", async () => {
    const newDirPath = await renameDirectoryPromise(
      "empty_folder",
      "empty_folder_renamed"
    );
    expect(newDirPath).toEqual(AppConfig.dirSeparator + "empty_folder_renamed");

    const originDirPath = await renameDirectoryPromise(
      "empty_folder_renamed",
      "empty_folder"
    );
    expect(originDirPath).toEqual(AppConfig.dirSeparator + "empty_folder");
  });

  test("deleteFilePromise", async () => {
    const filePath = await deleteFilePromise("sample.bmp");
    expect(filePath).toEqual("sample.bmp");
  });

  test("deleteDirectoryPromise", async () => {
    const dirPath = await deleteDirectoryPromise("empty_folder");
    expect(dirPath).toEqual("empty_folder");
  });
});
