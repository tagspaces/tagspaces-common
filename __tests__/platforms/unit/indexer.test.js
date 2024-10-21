const fs = require("fs");
const pathJs = require("path");
const {
  createIndex,
  getMetaIndexFilePath,
} = require("@tagspaces/tagspaces-indexer");
const { cleanRootPath } = require("@tagspaces/tagspaces-common/paths");
const {
  saveBinaryFilePromise,
  createDirectoryPromise,
  listDirectoryPromise,
  getFileContentPromise,
  saveTextFilePromise,
} = require("@tagspaces/tagspaces-common-aws3/io-objectstore");

beforeAll(async () => {
  const dirPath = pathJs.join(
    __dirname,
    "..",
    "..",
    "common-aws",
    "buckets",
    "bucket1",
    "dir"
  );
  try {
    fs.rmSync(dirPath, { recursive: true, force: true });
    console.log(`${dirPath} is deleted!`);
  } catch (err) {
    console.error(`Error while deleting ${dirPath}.`, err);
  }
});
const location = {
  uuid: "testUuid",
  type: "1",
  name: "cloud location",
  accessKeyId: "S3RVER",
  secretAccessKey: "S3RVER",
  endpointURL: "http://localhost:4569",
};

test("cleanRootPath", async () => {
  const path = await cleanRootPath(
    "/sdcard/Downloads/////DSCN1.jpg",
    "sdcard/Downloads",
    "/"
  );
  expect(path).toEqual("DSCN1.jpg");
});

test("createIndex", async () => {
  await uploadImage("../../img.jpg", "image.png");
  await uploadImage("../../img.jpg", ".ts/image.png.jpg");
  await createDirectory("subdir");
  const subdirThumbnail = "subdir/.ts/tst.jpg";
  await uploadImage("../../img.jpg", subdirThumbnail);

  const param = {
    path: "",
    bucketName: "bucket1",
    location,
    listDirectoryPromise,
    getFileContentPromise,
  };
  const index = await createIndex(
    param,
    ["extractThumbPath"], //, "extractThumbURL"],
    []
  );
  expect(index.some(({ name }) => name === "image.png")).toBe(true);
  const subdir = index.find((element) => element.name === "subdir");
  expect(subdir !== undefined).toBe(true);
  // directories dont have thumb path
  //expect(subdir.meta.thumbPath && subdir.meta.thumbPath.includes(subdirThumbnail)).toBe(true);

  const indexIgnore = await createIndex(
    param,
    ["extractThumbPath"], //, "extractThumbURL"],
    ["image.png"]
  );
  expect(indexIgnore.some(({ name }) => name === "image.png")).toBe(false);

  const indexPersisted = await persistIndex(
    // TODO from indexer Error upload .ts/tsi.json All access to this object has been disabled
    {
      path: "",
      bucketName: "bucket1",
      location,
    },
    index
  );
  expect(indexPersisted.name.endsWith("tsi.json")).toBe(true);
}, 20000);

function createDirectory(path) {
  return createDirectoryPromise({ path, bucketName: "bucket1", location });
}

function uploadImage(pathFrom, pathTo) {
  const param = {
    path: pathTo,
    bucketName: "bucket1",
    location,
  };

  return saveBinaryFilePromise(
    param,
    fs.createReadStream(pathJs.resolve(__dirname, pathFrom))
  );
}

function persistIndex(param, directoryIndex) {
  let directoryPath;
  if (typeof param === "object" && param !== null) {
    directoryPath = param.path;
  } else {
    directoryPath = param;
  }
  const folderIndexPath = getMetaIndexFilePath(directoryPath);
  return saveTextFilePromise(
    { ...param, path: folderIndexPath },
    JSON.stringify(directoryIndex), // relativeIndex),
    true
  )
    .then((result) => {
      if (result) {
        console.log(
          "Index persisted for: " + directoryPath + " to " + folderIndexPath
        );
      }
      return result;
    })
    .catch((err) => {
      console.error("Error saving the index for " + folderIndexPath, err);
    });
}
