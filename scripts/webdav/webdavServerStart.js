const path = require("path");
const detect = require("detect-port");
const { startWebdav } = require("./webdavserver-v2");
const directoryExists = require("directory-exists").sync;
const execSh = require("exec-sh").promise;
const { clonePromise } = require("./git_clone");
const { PORT } = require("webdav/test/server/credentials.js");

module.exports = async function () {
  const portAvailable = await detect(PORT);
  if (PORT === portAvailable) {
    await execSh("npm run install-web", {
      cwd: path.resolve(__dirname, "..", "..", "platforms"),
    });

    const testDir = path.resolve(__dirname, "..", "testdata");
    if (!directoryExists(testDir)) {
      await clonePromise("https://github.com/tagspaces/testdata", "testdata");
    }
    global.WebDavInstance = startWebdav(testDir);

    /*global.WebDavInstance = createWebDAVServer(
      "basic",
      dataDir + "/file-structure/supported-filestypes"
    );
    await global.WebDavInstance.start()
      .then(() => {
        console.log("Server started");
        return true;
      })
      .catch((e) => console.error(e));*/
  } else {
    console.log(
      "Port " +
        PORT +
        " is already in use. Reusing it for the tests or try port:" +
        portAvailable
    );
  }
};
