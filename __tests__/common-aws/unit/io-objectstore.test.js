const fs = require("fs");
const pathJs = require("path");
const {
  configure,
  listDirectoryPromise,
  getURLforPath,
  saveFilePromise,
  getPropertiesPromise,
  getFileContentPromise,
  saveBinaryFilePromise,
  createDirectoryPromise,
  copyFilePromise,
  renameFilePromise,
  renameDirectoryPromise,
  moveDirectoryPromise,
  copyDirectoryPromise,
  deleteFilePromise,
  deleteDirectoryPromise,
} = require("@tagspaces/tagspaces-common-aws/io-objectstore");

beforeAll(async () => {
  configure({
    // region: 'eu-central-1',
    accessKeyId: "S3RVER",
    secretAccessKey: "S3RVER",
    endpointURL: "http://localhost:4569",
    // signatureVersion: "v4",
  });
});

test("listDirectoryPromise", async () => {
  const list = await listDirectoryPromise({
    path: "",
    bucketName: "bucket1",
  });
  console.log("list:" + JSON.stringify(list));
}); //, 5000);

test("getURLforPath", async () => {
  const url = await getURLforPath({
    path: "img.jpg",
    bucketName: "bucket1",
  });
  console.log("url:" + JSON.stringify(url));
});

test("saveFilePromise/saveTextFilePromise", async () => {
  const file = await saveFilePromise(
    {
      path: "dir/test.txt",
      bucketName: "bucket1",
    },
    "test"
  );
  console.log("file:" + JSON.stringify(file));
});

test("getPropertiesPromiseFile", async () => {
  const file = await getPropertiesPromise({
    path: "image.png",
    bucketName: "bucket1",
  });
  console.log("file:" + JSON.stringify(file));
});

test("getPropertiesPromiseDir", async () => {
  const dir = await getPropertiesPromise({
    path: "dir/",
    bucketName: "bucket1",
  });
  console.log("dir:" + JSON.stringify(dir));
});

test("loadTextFilePromise/getFileContentPromise", async () => {
  const content = await getFileContentPromise({
    path: "dir/test.txt",
    bucketName: "bucket1",
  });
  console.log("content:" + JSON.stringify(content));
});

test("saveBinaryFilePromise", async () => {
  const content = await saveBinaryFilePromise(
    {
      path: "dir/img.jpg",
      bucketName: "bucket1",
    },
    fs.createReadStream(pathJs.resolve(__dirname, "../../img.jpg"))
  );
  console.log("content:" + JSON.stringify(content));
});

test("createDirectoryPromise", async () => {
  const content = await createDirectoryPromise({
    path: "dir/subdir/",
    bucketName: "bucket1",
  });
  console.log("content:" + JSON.stringify(content));
});

test("copyFilePromise", async () => {
  const content = await copyFilePromise(
    {
      path: "dir/img.jpg",
      bucketName: "bucket1",
    },
    "dir/subdir/img.jpg"
  );
  console.log("content:" + JSON.stringify(content));
});

test("renameFilePromise", async () => {
  const content = await renameFilePromise(
    {
      path: "dir/img.jpg",
      bucketName: "bucket1",
    },
    "dir/img+1.jpg"
  );
  console.log("content:" + JSON.stringify(content));

  const content1 = await renameFilePromise(
    {
      path: "dir/img+1.jpg",
      bucketName: "bucket1",
    },
    "dir/im+g1.jpg"
  );
  console.log("content:" + JSON.stringify(content1));
});

test("renameDirectoryPromise", async () => {
  const content = await renameDirectoryPromise(
    {
      path: "dir/subdir/",
      bucketName: "bucket1",
    },
    "subdir4"
  );
  console.log("content:" + JSON.stringify(content));
});

test("moveDirectoryPromise", async () => {
  const content = await moveDirectoryPromise(
    {
      path: "dir/subdir4/",
      bucketName: "bucket1",
    },
    "subdir5"
  );
  console.log("content:" + JSON.stringify(content));
});

test("copyDirectoryPromise", async () => {
  const content = await copyDirectoryPromise(
    {
      path: "subdir5",
      bucketName: "bucket1",
    },
    "dir/subdir_copy/"
  );
  console.log("content:" + JSON.stringify(content));
});

test("deleteFilePromise", async () => {
  const content = await deleteFilePromise({
    path: "dir/img1.jpg",
    bucketName: "bucket1",
  });
  console.log("content:" + JSON.stringify(content));
});

test("deleteDirectoryPromise", async () => {
  const content = await deleteDirectoryPromise({
    path: "dir/subdir/",
    bucketName: "bucket1",
  });
  console.log("content:" + JSON.stringify(content));
});
