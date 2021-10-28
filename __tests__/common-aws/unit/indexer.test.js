const fs = require("fs");
const pathJs = require("path");
const { createIndex, persistIndex } = require("../../../platforms/indexer");
const {
  configure,
  s3,
  listDirectoryPromise,
  createDirectoryPromise,
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

test("uploadImageForIndexing", async () => {
  const params = {
    Key: "image.png",
    Bucket: "bucket1",
    Body: fs.createReadStream(pathJs.resolve(__dirname, "../../img.jpg")), // todo path absolute
  };

  s3().upload(params, function uploadCallback(err, data) {
    console.log(err, data);
  });
});

test("createIndex", async () => {
  const param = {
    path: "",
    bucketName: "bucket1",
  };
  const index = await createIndex(param, ['extractThumbPath'], [], listDirectoryPromise);
  expect(index.some(({ name }) => name === "image.png")).toBe(true);
  // console.log("list:" + JSON.stringify(index));

  await createDirectoryPromise({
    path: ".ts/",
    bucketName: "bucket1",
  });
   //await persistIndex(param, index); TODO  Error upload .ts/tsi.json All access to this object has been disabled
});
