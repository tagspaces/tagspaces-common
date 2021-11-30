const path = require("path");
const { createWebDAVServer } = require("./webdavserver-v2");
const execSh = require("exec-sh").promise;

module.exports = async function () {
  await execSh("npm run install-webdav", {
    cwd: path.resolve(__dirname, "..", "..", "platforms"),
  });

  const dataDir = path.resolve(__dirname, "../../__tests__/common-aws/buckets");
  global.WebDavInstance = createWebDAVServer("basic", dataDir);
  await global.WebDavInstance.start()
    .then(() => {
      console.log("Server started");
      return true;
    })
    .catch((e) => console.error(e));
};
