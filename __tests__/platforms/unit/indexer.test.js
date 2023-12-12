const fs = require("fs");
const pathJs = require("path");
const {
  createIndex,
  getMetaIndexFilePath,
} = require("@tagspaces/tagspaces-indexer");
const { cleanRootPath } = require("@tagspaces/tagspaces-common/paths");
const {
  configure,
  s3,
  createDirectoryPromise,
  listDirectoryPromise,
  loadTextFilePromise,
  saveTextFilePromise,
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

test("cleanRootPath", async () => {
  const path = await cleanRootPath(
    "/sdcard/Downloads/////DSCN1.jpg",
    "sdcard/Downloads",
    "/"
  );
  expect(path).toEqual("DSCN1.jpg");
});

/*test("createIndex1", async () => {
  const index = await createIndex(
    { path: "C:\\Users\\smari\\Music\\sub" },
    ["extractThumbPath"], //, "extractThumbURL"],
    []
  );
  console.log(index);
});*/

test("createIndex", async () => {
  await uploadImage("../../img.jpg", "image.png");
  await uploadImage("../../img.jpg", ".ts/image.png.jpg");
  await createDirectory("subdir");
  const subdirThumbnail = "subdir/.ts/tst.jpg";
  await uploadImage("../../img.jpg", subdirThumbnail);

  const param = {
    path: "",
    bucketName: "bucket1",
  };
  const index = await createIndex(
    param,
    listDirectoryPromise,
    loadTextFilePromise,
    ["extractThumbPath"], //, "extractThumbURL"],
    []
  );
  expect(index.some(({ name }) => name === "image.png")).toBe(true);
  const subdir = index.find((element) => element.name === "subdir");
  expect(subdir !== undefined).toBe(true);
  expect(subdir.thumbPath.includes(subdirThumbnail)).toBe(true);
  /*expect(index.some(({ thumbPath }) => thumbPath === ".ts/image.png.jpg")).toBe(
    true
  );*/
  // console.log("list:" + JSON.stringify(index));

  const indexPersisted = await persistIndex(
    // TODO from indexer Error upload .ts/tsi.json All access to this object has been disabled
    {
      path: "",
      bucketName: "bucket1",
    },
    index
  );
  expect(indexPersisted.name.endsWith("tsi.json")).toBe(true);
}, 20000);

function createDirectory(path) {
  return createDirectoryPromise({ path, bucketName: "bucket1" });
}

function uploadImage(pathFrom, pathTo) {
  return new Promise(function (resolve, reject) {
    const params = {
      Key: pathTo,
      Bucket: "bucket1",
      Body: fs.createReadStream(pathJs.resolve(__dirname, pathFrom)),
    };

    s3().upload(params, function uploadCallback(err, data) {
      console.log(err, data);
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
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
