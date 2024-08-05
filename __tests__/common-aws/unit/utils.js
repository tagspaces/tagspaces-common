const fs = require("fs");
const pathJs = require("path");
const {
  saveFilePromise,
  createDirectoryPromise,
} = require("@tagspaces/tagspaces-common-aws3/io-objectstore");

const minioSuffix = "._S3rver_object";

async function createFile(location, filePath, content = "test content") {
  const param = {
    path: filePath,
    bucketName: "bucket1",
    location,
  };
  await saveFilePromise(param, content);
  expect(fs.existsSync(getFsPath(filePath) + minioSuffix)).toBe(true);
  return param;
}

async function createDir(location, dirPath) {
  const param = {
    path: dirPath,
    bucketName: "bucket1",
    location,
  };
  await createDirectoryPromise(param);
  expect(fs.existsSync(getFsPath(dirPath))).toBe(true);
  return param;
}

function getFsPath(path) {
  return pathJs.join(__dirname, "..", "buckets", "bucket1", path);
}

function expectFileExist(path, exist = true) {
  expect(fs.existsSync(getFsPath(path) + minioSuffix)).toBe(exist);
}
function expectDirExist(dirPath, exist = true) {
  expect(fs.existsSync(getFsPath(dirPath))).toBe(exist);
}

module.exports = {
  createFile,
  createDir,
  expectFileExist,
  expectDirExist,
};
