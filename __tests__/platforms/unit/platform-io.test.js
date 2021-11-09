// const fs = require("fs");
const pathJs = require("path");
const { cleanTrailingDirSeparator } = require("../../../common/paths");
const {
  platformCreateDirectoryTree,
  platformListDirectoryPromise,
  platformSaveFilePromise,
  platformGetPropertiesPromise,
  platformLoadTextFilePromise,
  platformSaveBinaryFilePromise,
  platformCreateDirectoryPromise,
  platformCopyFilePromise,
  platformRenameFilePromise,
  platformRenameDirectoryPromise,
  platformDeleteFilePromise,
  platformDeleteDirectoryPromise,
} = require("../../../platforms/platform-io");

const bucketDir = "./__tests__/common-aws/buckets/bucket1";
const dirPath = bucketDir + "/dir/";
const filePath = dirPath + "test.txt";
const fileImgPath = "./__tests__/img.jpg";

test("platformCreateDirectoryTree", async () => {
  const list = await platformCreateDirectoryTree(bucketDir);
  console.log("platformCreateDirectoryTree:" + JSON.stringify(list));
});

test("listDirectoryPromise", async () => {
  const list = await platformListDirectoryPromise(bucketDir);
  console.log("list:" + JSON.stringify(list));
});

test("saveFilePromise/saveTextFilePromise", async () => {
  const file = await platformSaveFilePromise(filePath, "test");
  expect(file.path === filePath).toBe(true);
  // console.log("file:" + JSON.stringify(file));
});

test("getPropertiesPromiseFile", async () => {
  const file = await platformGetPropertiesPromise(filePath);
  expect(file.isFile).toBe(true);
  // console.log("file:" + JSON.stringify(file));
});

test("createDirectoryPromise", async () => {
  const content = await platformCreateDirectoryPromise(dirPath);
  expect(content === dirPath).toBe(true);
  // console.log("content:" + JSON.stringify(content));
});

test("getPropertiesPromiseDir", async () => {
  const dir = await platformGetPropertiesPromise(dirPath);
  expect(dir.isFile).toBe(false);
  // console.log("dir:" + JSON.stringify(dir));
});

test("loadTextFilePromise", async () => {
  const content = await platformLoadTextFilePromise(filePath);
  expect(content === "test").toBe(true);
  // console.log("content:" + JSON.stringify(content));
});

/*test("saveBinaryFilePromise", async () => {
    const content = await platformSaveBinaryFilePromise(
        fileImgPath,
        fs.createReadStream(pathJs.resolve(__dirname, "../../img.jpg"))
    );
    console.log("content:" + JSON.stringify(content));
});*/

test("copyFilePromise", async () => {
  let sourceFilePath = fileImgPath;
  if (sourceFilePath.startsWith("./") || sourceFilePath.startsWith("../")) {
    // relative paths
    sourceFilePath = pathJs.resolve(sourceFilePath);
  }
  let destFilePath = dirPath + "newImg.jpg";
  if (destFilePath.startsWith("./") || destFilePath.startsWith("../")) {
    // relative paths
    destFilePath = pathJs.resolve(destFilePath);
  }
  const content = await platformCopyFilePromise(sourceFilePath, destFilePath);
  expect(content[0] === sourceFilePath).toBe(true);
  expect(content[1] === destFilePath).toBe(true);
  //console.log("content:" + JSON.stringify(content));
});

test("renameFilePromise", async () => {
  let sourceFilePath = filePath;
  let destFilePath = dirPath + "test1.txt";
  const file = await platformGetPropertiesPromise(destFilePath);
  if (file) {
    await platformDeleteFilePromise(destFilePath);
  }
  await platformRenameFilePromise(sourceFilePath, destFilePath);
  const newFile = await platformGetPropertiesPromise(destFilePath);
  expect(newFile.isFile).toBe(true);
});

test("renameDirectoryPromise", async () => {
  const newDirName = "dir1";
  let destDirPath = cleanTrailingDirSeparator(dirPath) + "1/";
  const entry = await platformGetPropertiesPromise(destDirPath);
  if (entry) {
    await platformDeleteDirectoryPromise(destDirPath);
  }

  const content = await platformRenameDirectoryPromise(dirPath, newDirName);
  console.log("content:" + JSON.stringify(content));
});

test("deleteFilePromise", async () => {
  const filePath = bucketDir + "/dir1/test1.txt";
  await platformDeleteFilePromise(filePath);
  const entry = await platformGetPropertiesPromise(filePath);
  expect(entry).toBe(false);
});

test("deleteDirectoryPromise", async () => {
  const dirPath = bucketDir + "/dir1/";
  await platformDeleteDirectoryPromise(dirPath);
  const entry = await platformGetPropertiesPromise(dirPath);
  expect(entry).toBe(false);
});
