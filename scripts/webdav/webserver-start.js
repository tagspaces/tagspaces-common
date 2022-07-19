// const { createWebDAVServer } = require("./webdavserver-v2");
// const { createWebDAVServer } = require("webdav/test/server/index.js");
const path = require("path");
const { startWebdav } = require("./webdavserver-v2");
const { clone } = require("./git_clone");
const directoryExists = require("directory-exists").sync;

const testDir = path.resolve(__dirname, "..", "testdata");
if (!directoryExists(testDir)) {
  clone("https://github.com/tagspaces/testdata", testDir, () => {
    startWebdav(testDir);
  });
} else {
  startWebdav(testDir);
}
