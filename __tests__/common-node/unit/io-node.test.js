const {
  unZip,
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
  moveDirectoryPromise,
  copyDirectoryPromise,
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

  test("io-node.unZip", async () => {
    const sourcePath = pathLib.resolve(
      __dirname,
      "../../../scripts/testContents/sample.zip"
    );
    const targetPath = pathLib.resolve(
      __dirname,
      "../../../scripts/testContents/empty_folder/unzip/"
    );
    const path = await unZip(sourcePath, targetPath);
    expect(path === sourcePath).toBe(true);
  });

  test("io-node.extractTextContent", async () => {
    // TEXT Files
    const indexTxt = extractTextContent("test.txt", "test test test2 ");
    expect(indexTxt === "test test2").toBe(true);

    // HTML Files
    const indexHtml = extractTextContent(
      "test.html",
      "<h1>TEST</h1><h1>TEST</h1><h5>TEST2</h5>"
    );
    expect(indexHtml === "test test2").toBe(true);

    const indexHtmlWithBody = extractTextContent(
      "test.html",
      "<html><body data-screenshot='data:text/plain;base64,SGVsbG8sIFdvcmxkIQ=='><h1>TEST</h1><h1>TEST</h1><h5>TEST3</h5></body>"
    );
    expect(indexHtmlWithBody === "test test3").toBe(true);

    const indexHtmlWithImg = extractTextContent(
      "test.html",
      "<html><body data-screenshot='data:text/plain;base64,SGVsbG8sIFdvcmxkIQ=='><h1>TEST</h1><h1>TEST</h1><h5>TEST4</h5><img src='data:text/plain;base64,SGVsbG8sIFdvcmxkIQ==' /></body>"
    );
    expect(indexHtmlWithImg === "test test4").toBe(true);

    // MD Files
    const index = extractTextContent("test.md", "# TEST \n # TEST \n # TEST2 ");
    expect(index === "test test2").toBe(true);

    const dataURLinMD = `
    # Milkdown

    ![greeting bear](data:text/plain;base64,SGVsbG8sIFdvcmxkIQ==)       
    `;
    let expectedContent = "milkdown";
    let extractedContent = extractTextContent("test.md", dataURLinMD);
    // console.log(expectedContent);
    // console.log(extractedContent);
    expect(expectedContent === extractedContent).toBe(true);

    const complexMD = `
    # Milkdown

    ![greeting bear](/polar.jpeg)
    
    > Milkdown is a WYSIWYG markdown editor framework.
    >
    > Here is the [repo](https://github.com/Saul-Mirone/milkdown) (right click to open link).
    > We ~~only support commonmark~~. GFM is also supported!
    
    *   Features
    *   [x] 📝 **WYSIWYG Markdown** - Write markdown in an elegant way
    *   [x] 🎨 **Themable** - Theme can be shared and used with npm packages
    *   [x] 🎮 **Hackable** - Support your awesome idea by plugin
    `;

    const complexMD1 = `
    # Milkdown

    ![greeting bear](/polar.jpeg)
    
    > Milkdown is a WYSIWYG markdown editor framework.
    >
    > Here is the [repo](https://github.com/Saul-Mirone/milkdown) (right click to open link).
    > We ~~only support commonmark~~. GFM is also supported!
    
    You can check the output markdown text in **two columns editing**.
    
    *   Features
        *   [x] **WYSIWYG Markdown** - Write markdown in an elegant way
        *   [x] **Themable** - Theme can be shared and used with npm packages
        *   [x] **Hackable** - Support your awesome idea by plugin
        *   [x] **Reliable** - Built on top of [prosemirror](https://prosemirror.net/) and [remark](https://github.com/remarkjs/remark)
        *   [x] **Slash & Tooltip** - Write fast for everyone, driven by plugin
        *   [x] **Math** - LaTeX math equations support, driven by plugin
        *   [x] **Table** - Table support with fluent ui, driven by plugin
        *   [x] **Diagram** - Diagram support with [mermaid](https://mermaid-js.github.io/mermaid/#/), driven by plugin
        *   [x] **Collaborate** - Shared editing support with [yjs](https://docs.yjs.dev/), driven by plugin
        *   [x] **Clipboard** - Support copy and paste markdown, driven by plugin
        *   [x] **Emoji** - Support emoji shortcut and picker, driven by plugin
    *   Made by
        *   Programmer: [Mirone](https://github.com/Saul-Mirone)
        *   Designer: [Meo](https://www.meo.cool/)
    
    ***
    
    You can add  and code block:
    

    ***
    
    You can type to create a table:
    
    | First Header   |    Second Header   |
    | -------------- | :----------------: |
    | Content Cell 1 |   Cell 1  |
    | Content Cell 2 | **Content** Cell 2 |
    
    ***
    
    Math is supported by [TeX expression](https://en.wikipedia.org/wiki/TeX).
    
    Now we have some inline math: $E = mc^2$. You can click to edit it.
    
    Math block is also supported.
    
    $$
    \begin{aligned}
    T( (v_1 + v_2) \otimes w) &= T(v_1 \otimes w) + T(v_2 \otimes w) \\
    T( v \otimes (w_1 + w_2)) &= T(v \otimes w_1) + T(v \otimes w_2) \\
    T( (\alpha v) \otimes w ) &= T( \alpha ( v \otimes w) ) \\
    T( v \otimes (\alpha w) ) &= T( \alpha ( v \otimes w) ) \\
    \end{aligned}
    $$
    
   
    ***

    
    Diagrams is powered by [mermaid](https://mermaid-js.github.io/mermaid/#/).
    
    
    graph TD;
        EditorState-->EditorView;
        EditorView-->DOMEvent;
        DOMEvent-->Transaction;
        Transaction-->EditorState;
    
    ***
    
    Have fun!
    
    [^1]: We use [tweet emoji](https://twemoji.twitter.com) to make emoji can be viewed cross platforms.
        
    `;
    expectedContent =
      "milkdown gt is a wysiwyg markdown editor framework here the right click to open link we only support commonmark gfm also supported features x 📝 write in an elegant way 🎨 theme can be shared and used with npm packages 🎮 your awesome idea by plugin";
    extractedContent = extractTextContent("test.md", complexMD);
    // console.log(expectedContent);
    // console.log(extractedContent);
    expect(expectedContent === extractedContent).toBe(true);
  });

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
    const ignorePatterns = [".DS_Store"];
    const list = await listDirectoryPromise(
      { path: filePath },
      [],
      ignorePatterns
    );
    expect(list.length).toBeGreaterThan(30);
    expect(list.some((entry) => !ignorePatterns.includes(entry.name))).toBe(
      true
    );
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
      size: 7,
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
      size: 62262,
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
      "../../../scripts/testContents/empty_folder/testDir"
    );
    await createDirectoryPromise(filePath);
    expect(await isDirectory(filePath)).toBe(true);
  }); /*
  test("io-node.createDirectory.Hidden", async () => {
    const filePath = pathLib.resolve(
      __dirname,
      "../../../scripts/testContents/new/.ts"
    );
    await createDirectoryPromise(filePath);
    expect(await isDirectory(filePath)).toBe(true);
  });*/
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
      "../../../scripts/testContents/.gitkeep 2 💕"
    );
    await renameFilePromise(sourcePath, targetPath);
    const targetFile = fs.lstatSync(targetPath);
    expect(targetFile.size).toBe(0);

    const targetPath2 = pathLib.resolve(
      __dirname,
      "../../../scripts/testContents/.git keep 22 💕 .txt"
    );
    await renameFilePromise(targetPath, targetPath2);
    const targetFile2 = fs.lstatSync(targetPath2);
    expect(targetFile2.size).toBe(0);
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
  test("io-node.moveDirectoryPromise", async () => {
    const sourcePath = pathLib.resolve(
      __dirname,
      "../../../scripts/testContents/empty_folder2"
    );
    const destPath = pathLib.resolve(
      __dirname,
      "../../../scripts/testContents/new/empty_folder2"
    );
    // await createDirectoryPromise(destPath);
    await moveDirectoryPromise({ path: sourcePath }, destPath);
    expect(
      await isDirectory(
        pathLib.resolve(
          __dirname,
          "../../../scripts/testContents/new/empty_folder2"
        )
      )
    ).toBe(true);
  });
  test("io-node.copyDirectoryPromise", async () => {
    const sourcePath = pathLib.resolve(
      __dirname,
      "../../../scripts/testContents/new"
    );
    const destPath = pathLib.resolve(
      __dirname,
      "../../../scripts/testContents/new_copied"
    );
    // await createDirectoryPromise(destPath);
    await copyDirectoryPromise({ path: sourcePath }, destPath);
    expect(
      await isDirectory(
        pathLib.resolve(__dirname, "../../../scripts/testContents/new_copied")
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
