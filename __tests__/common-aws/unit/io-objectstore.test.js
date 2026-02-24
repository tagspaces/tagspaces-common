const fs = require("fs");
const pathJs = require("path");

let listDirectoryPromise, getURLforPath, saveFilePromise, getPropertiesPromise, getFileContentPromise, saveBinaryFilePromise, createDirectoryPromise, copyFilePromise, renameFilePromise, renameDirectoryPromise, moveDirectoryPromise, copyDirectoryPromise, deleteFilePromise, deleteDirectoryPromise;
let createFile, createDir, expectFileExist, expectDirExist;

beforeAll(async () => {
  const aws3Module = require("@tagspaces/tagspaces-common-aws3");
  listDirectoryPromise = aws3Module.listDirectoryPromise;
  getURLforPath = aws3Module.getURLforPath;
  saveFilePromise = aws3Module.saveFilePromise;
  getPropertiesPromise = aws3Module.getPropertiesPromise;
  getFileContentPromise = aws3Module.getFileContentPromise;
  saveBinaryFilePromise = aws3Module.saveBinaryFilePromise;
  createDirectoryPromise = aws3Module.createDirectoryPromise;
  copyFilePromise = aws3Module.copyFilePromise;
  renameFilePromise = aws3Module.renameFilePromise;
  renameDirectoryPromise = aws3Module.renameDirectoryPromise;
  moveDirectoryPromise = aws3Module.moveDirectoryPromise;
  copyDirectoryPromise = aws3Module.copyDirectoryPromise;
  deleteFilePromise = aws3Module.deleteFilePromise;
  deleteDirectoryPromise = aws3Module.deleteDirectoryPromise;

  const utilsModule = require("./utils.js");
  createFile = utilsModule.createFile;
  createDir = utilsModule.createDir;
  expectFileExist = utilsModule.expectFileExist;
  expectDirExist = utilsModule.expectDirExist;

  const dirPath = pathJs.join(__dirname, "..", "buckets", "bucket1", "dir");
  try {
    fs.rmSync(dirPath, { recursive: true, force: true });
    console.log(`${dirPath} is deleted!`);
  } catch (err) {
    console.error(`Error while deleting ${dirPath}.`, err);
  }
  global.TextEncoder = require("util").TextEncoder;
  //global.TextDecoder = require('util').TextDecoder;
});
const location = {
  uuid: "testUuid",
  type: "1",
  name: "cloud location",
  accessKeyId: "S3RVER",
  secretAccessKey: "S3RVER",
  endpointURL: "http://localhost:4569",
};

test("listDirectoryPromise", async () => {
  const list = await listDirectoryPromise({
    path: "",
    bucketName: "bucket1",
    location,
  });
  //console.log("list:" + JSON.stringify(list));
  expect(list.length).toBeGreaterThan(0);
}); //, 5000);

test("getURLforPath", async () => {
  const url = await getURLforPath({
    path: "img.jpg",
    bucketName: "bucket1",
    location,
  });

  //console.log("url:" + JSON.stringify(url));
  expect(url.length).toBeGreaterThan(0);
});

test("getURLforPath encrypted file", async () => {
  const url = await getURLforPath({
    path: "img.jpg",
    bucketName: "bucket1",
    location,
    encryptionKey: "12345678901234567890123456789012",
  });

  //console.log("url:" + JSON.stringify(url));
  expect(url.length).toBeGreaterThan(0);
});

test("saveFilePromise/saveTextFilePromise", async () => {
  await createFile(location, "dir/test.txt");
});

test("getPropertiesPromiseFile", async () => {
  const param = await createFile(location, "dir/test_props.txt");

  const file = await getPropertiesPromise(param);
  expect(file.isFile).toBe(true);
});

test("getPropertiesPromiseDir", async () => {
  const param = await createDir(location, "dir/subdir_new/");

  const dir = await getPropertiesPromise(param);
  expect(dir.isFile).toBe(false);
});

test("loadTextFilePromise/getFileContentPromise", async () => {
  const fileContent = "file content";
  const param = await createFile(location, "dir/test_props.txt", fileContent);
  const content = await getFileContentPromise(param);
  expect(content).toBe(fileContent);
});

test("saveBinaryFilePromise", async () => {
  const filePath = "dir/img.jpg";
  const param = {
    path: filePath,
    bucketName: "bucket1",
    location,
  };
  await saveBinaryFilePromise(
    param,
    fs.createReadStream(pathJs.resolve(__dirname, "../../img.jpg"))
  );
  expectFileExist(filePath, true);
});

test("createDirectoryPromise", async () => {
  await createDir(location, "dir/new_dir");
});

test("copyFilePromise", async () => {
  const filePath = "dir/test_copy.txt";
  const newFilePath = "dir/subdir/test_copy1.txt";
  const param = await createFile(location, filePath);
  await copyFilePromise(param, newFilePath);
  expectFileExist(newFilePath, true);
});

test("renameFilePromise", async () => {
  const filePath = "dir/test_rename.txt";
  const newFilePath = "dir/test_rename+d.txt";
  const param = await createFile(location, filePath);
  await renameFilePromise(param, newFilePath);
  expectFileExist(newFilePath, true);

  await renameFilePromise(
    {
      ...param,
      path: newFilePath,
    },
    filePath
  );
  expectFileExist(filePath, true);
});

test("renameDirectoryPromise", async () => {
  const dirPath = "dir/subdir1/";
  const newDirName = "subdir_renamed";
  const param = await createDir(location, dirPath);

  const newDirPath = await renameDirectoryPromise(param, newDirName);
  expectDirExist(dirPath, false);
  expectDirExist(newDirPath);
});

test("moveDirectoryPromise", async () => {
  const dirPath = "dir/subdir2/";
  const newDirPath = "dir/dir2/subdir_moved/";
  const param = await createDir(location, dirPath);

  await moveDirectoryPromise(param, newDirPath);
  expectDirExist(dirPath, false);
  expectDirExist(newDirPath);
});

test("copyDirectoryPromise", async () => {
  const dirPath = "dir/subdir_test/";
  const newDirPath = "dir/subdir_copy/";
  const param = await createDir(location, dirPath);
  await copyDirectoryPromise(param, newDirPath);
  expectDirExist(newDirPath);
});

test("deleteFilePromise", async () => {
  const filePath = "dir/test_file.txt";
  const param = await createFile(location, filePath);
  await deleteFilePromise(param);
  expectFileExist(filePath, false);
});

test("deleteDirectoryPromise", async () => {
  const dirPath = "dir/subdir_test/";
  const param = {
    path: dirPath,
    bucketName: "bucket1",
    location,
  };
  await createDirectoryPromise(param);
  const fsDirPath = pathJs.join(__dirname, "..", "buckets", "bucket1", dirPath);
  expect(fs.existsSync(fsDirPath)).toBe(true);
  await deleteDirectoryPromise(param);
  expect(fs.existsSync(fsDirPath)).toBe(false);
});
