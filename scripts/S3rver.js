const S3rver = require("s3rver");
const path = require("path");

global.S3instance = new S3rver({
  port: 4569,
  address: "localhost",
  silent: false,
  directory: path.resolve(
    __dirname,
    "..",
    "__tests__",
    "common-aws",
    "buckets"
  ),
});
global.S3instance.run();
