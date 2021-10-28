const fs = require("fs");
const pathJs = require("path");
const {
  createIndex,
  getMetaIndexFilePath,
} = require("../../../platforms/indexer");
const {
  configure,
  s3,
  listDirectoryPromise,
  createDirectoryPromise,
  saveTextFilePromise,
} = require("../../../common-aws/io-objectstore");

beforeAll(async () => {
  configure({
    // region: 'eu-central-1',
    accessKeyId: "S3RVER",
    secretAccessKey: "S3RVER",
    endpointURL: "http://localhost:4569",
    // signatureVersion: "v4",
  });
});

test("createIndex", async () => {
  await uploadImage("../../img.jpg", "image.png");
  await uploadImage("../../img.jpg", ".ts/image.png.jpg");

  const param = {
    path: "",
    bucketName: "bucket1",
  };
  const index = await createIndex(
    param,
    ["extractThumbPath"], //, "extractThumbURL"],
    [],
    listDirectoryPromise
  );
  expect(index.some(({ name }) => name === "image.png")).toBe(true);
  expect(index.some(({ thumbPath }) => thumbPath === ".ts/image.png.jpg")).toBe(
    true
  );
  // console.log("list:" + JSON.stringify(index));

  const indexPersisted = await persistIndex(
    // TODO from indexer Error upload .ts/tsi.json All access to this object has been disabled
    {
      path: "",
      bucketName: "bucket1",
    },
    index
  );
  expect(indexPersisted.name === "tsi.json").toBe(true);
});

function uploadImage(pathFrom, pathTo) {
  const params = {
    Key: pathTo,
    Bucket: "bucket1",
    Body: fs.createReadStream(pathJs.resolve(__dirname, pathFrom)),
  };

  s3().upload(params, function uploadCallback(err, data) {
    console.log(err, data);
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
