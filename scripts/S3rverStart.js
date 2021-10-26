const S3rver = require("s3rver");
const path = require("path");
const execSh = require("exec-sh").promise;

module.exports = async function () {
  await execSh("npm run install-web", {
    cwd: path.resolve(__dirname, "..", "platforms"),
  });
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

  await global.S3instance.run();
};
