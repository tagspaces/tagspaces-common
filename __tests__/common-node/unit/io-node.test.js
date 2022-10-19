const {
  isDirectory,
  extractTextContent,
  listDirectoryPromise,
  saveTextFilePromise,
  saveBinaryFilePromise,
  getPropertiesPromise,
  loadTextFilePromise,
  getFileContentPromise,
  createDirectoryPromise,
  copyFilePromise,
  renameFilePromise,
  renameDirectoryPromise,
  deleteFilePromise,
  deleteDirectoryPromise,
} = require("@tagspaces/tagspaces-common-node/io-node");
const pathLib = require("path");
const fs = require("fs");
const { clean } = require("../../../scripts/webdav/webdavserver-v2");

describe("io-node unit tests", () => {
  beforeAll(() => {
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

  /*test("io-node.extractTextContent", async () => {
    const index = extractTextContent("test.md", "# TEST \n # TEST \n # TEST2");
    expect(index === "test test2").toBe(true);
    const indexHtml = extractTextContent(
      "test.html",
      "<h1>TEST</h1><h1>TEST</h1><h5>TEST2</h5>"
    );
    expect(indexHtml === "test test2").toBe(true);
    const indexTxt = extractTextContent("test.txt", "test test test2 ");
    expect(indexTxt === "test test2").toBe(true);

    const md =
      "[github](http://github.com) not link inline14\n" +
      "\n" +
      "new line nn\n" +
      "\n" +
      "gggggggg125\n" +
      "\n" +
      "*   [ ] hh\n" +
      "\n" +
      "*   [ ] jj2\n" +
      "\n" +
      "mm126\n" +
      "\n" +
      "$$\n" +
      "\\begin{aligned}\n" +
      "T( (v_1 + v_2) \\otimes w) &= T(v_1 \\otimes w) + T(v_2 \\otimes w) \\\\\n" +
      "T( v \\otimes (w_1 + w_2)) &= T(v \\otimes w_1) + T(v \\otimes w_2) \\\\\n" +
      "T( (\\alpha v) \\otimes w ) &= T( \\alpha ( v \\otimes w) ) \\\\\n" +
      "T( v \\otimes (\\alpha w) ) &= T( \\alpha ( v \\otimes w) ) \\\\\n" +
      "\\end{aligned}\n" +
      "$$";
    const indexMd = extractTextContent("test.md", md);
    expect(
      indexMd ===
        "githubhttpgithubcom not link inline14  new line nn gggggggg125 mm126 beginalignedt v1  v2 otimes w  tv1 otimes w  tv2 otimes w t v otimes w1  w2  tv otimes w1  tv otimes w2 t alpha v otimes w   t alpha  v otimes w  t v otimes alpha w   t alpha  v otimes w  endaligned"
    ).toBe(true);
  });*/

  test("io-node.isDirectory", async () => {
    const filePath = pathLib.resolve(
      __dirname,
      "../../../scripts/testContents"
    );
    const isDir = await isDirectory(filePath);
    expect(isDir).toBe(true);
  });

  test("io-node.listDirectoryPromise", async () => {
    const filePath = pathLib.resolve(
      __dirname,
      "../../../scripts/testContents"
    );
    const list = await listDirectoryPromise({ path: filePath });
    expect(list.length).toBe(35);
  });

  test("io-node.saveTextFilePromise", async () => {
    const filePath = pathLib.resolve(
      __dirname,
      "../../../scripts/testContents/empty_folder/test.txt"
    );
    const file = await saveTextFilePromise({ path: filePath }, "test", true);
    expect(file).toEqual({
      extension: "txt",
      isFile: true,
      isNewFile: true,
      lmdt: file.lmdt,
      name: "test.txt",
      path: filePath,
      size: 0,
      tags: [],
    });
  });
  test("io-node.saveBinaryFilePromise", async () => {
    const sourcePath = pathLib.resolve(
      __dirname,
      "../../../scripts/testContents/sample.bmp"
    );
    const targetPath = pathLib.resolve(
      __dirname,
      "../../../scripts/testContents/empty_folder/sample.bmp"
    );
    const file = await saveBinaryFilePromise(
      { path: targetPath },
      fs.createReadStream(sourcePath)
    );
    expect(file).toEqual({
      extension: "bmp",
      isFile: true,
      isNewFile: true,
      lmdt: file.lmdt,
      name: "sample.bmp",
      path: targetPath,
      size: 0,
      tags: [],
    });
  });
  test("io-node.getPropertiesPromise", async () => {
    const filePath = pathLib.resolve(
      __dirname,
      "../../../scripts/testContents/sample.bmp"
    );
    const file = await getPropertiesPromise({ path: filePath });
    expect(file).toEqual({
      name: "sample.bmp",
      isFile: true,
      size: 62262,
      lmdt: file.lmdt,
      path: filePath,
    });
  });
  test("io-node.loadTextFilePromise", async () => {
    const filePath = pathLib.resolve(
      __dirname,
      "../../../scripts/testContents/sample.txt"
    );
    const txt = await loadTextFilePromise({ path: filePath });
    expect(txt).toEqual(fs.readFileSync(filePath, "utf8"));
  });
  test("io-node.getFileContentPromise", async () => {
    const filePath = pathLib.resolve(
      __dirname,
      "../../../scripts/testContents/sample.js"
    );
    const txt = await getFileContentPromise({ path: filePath }, "arraybuffer");
    expect(txt).toEqual(fs.readFileSync(filePath));
  });
  test("io-node.createDirectoryPromise", async () => {
    const filePath = pathLib.resolve(
      __dirname,
      "../../../scripts/testContents/empty_folder/test"
    );
    await createDirectoryPromise(filePath);
    expect(await isDirectory(filePath)).toBe(true);
  });
  test("io-node.copyFilePromise", async () => {
    const sourcePath = pathLib.resolve(
      __dirname,
      "../../../scripts/testContents/sample.jpg"
    );
    const targetPath = pathLib.resolve(
      __dirname,
      "../../../scripts/testContents/empty_folder/sample.jpg"
    );
    await copyFilePromise(sourcePath, targetPath);
    const targetFile = fs.lstatSync(targetPath);
    expect(targetFile.size).toBeGreaterThan(0);
  });
  test("io-node.renameFilePromise", async () => {
    const sourcePath = pathLib.resolve(
      __dirname,
      "../../../scripts/testContents/empty_folder/.gitkeep"
    );
    const targetPath = pathLib.resolve(
      __dirname,
      "../../../scripts/testContents/.gitkeep2"
    );
    await renameFilePromise(sourcePath, targetPath);
    const targetFile = fs.lstatSync(targetPath);
    expect(targetFile.size).toBe(0);
  });
  test("io-node.renameDirectoryPromise", async () => {
    const sourcePath = pathLib.resolve(
      __dirname,
      "../../../scripts/testContents/empty_folder"
    );
    await renameDirectoryPromise(sourcePath, "empty_folder2");
    expect(
      await isDirectory(
        pathLib.resolve(
          __dirname,
          "../../../scripts/testContents/empty_folder2"
        )
      )
    ).toBe(true);
  });
  test("io-node.deleteFilePromise", async () => {
    const filePath = pathLib.resolve(
      __dirname,
      "../../../scripts/testContents/sample.desktop"
    );
    await deleteFilePromise(filePath);
    const targetFile = fs.existsSync(filePath);
    expect(targetFile).toBe(false);
  });
  test("io-node.deleteDirectoryPromise", async () => {
    const filePath = pathLib.resolve(
      __dirname,
      "../../../scripts/testContents/empty_folder/tmp"
    );
    await createDirectoryPromise(filePath);
    expect(await isDirectory(filePath)).toBe(true);
    await deleteDirectoryPromise(filePath);
    try {
      await isDirectory(filePath);
    } catch (e) {
      expect(e.code).toBe("ENOENT");
    }
  });
});
