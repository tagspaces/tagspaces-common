const ws = require("webdav-server").v2;
const path = require("path");
const rimraf = require("rimraf").sync;
const copyDir = require("copy-dir").sync;
// const PASSWORD = "1234";
// const USERNAME = "webdav";
const {
  PASSWORD,
  PORT,
  USERNAME,
} = require("webdav/test/server/credentials.js");

function createServer(dir, authType, port = PORT) {
  if (!dir) {
    throw new Error("Expected target directory");
  }
  const userManager = new ws.SimpleUserManager();
  const user = userManager.addUser(USERNAME, PASSWORD);
  let auth;
  switch (authType) {
    case "digest":
      auth = new ws.HTTPDigestAuthentication(userManager, "test");
      break;
    case "basic":
    /* falls-through */
    default:
      auth = new ws.HTTPBasicAuthentication(userManager);
      break;
  }
  const privilegeManager = new ws.SimplePathPrivilegeManager();
  privilegeManager.setRights(user, "/", ["all"]);
  const server = new ws.WebDAVServer({
    port: port,
    httpAuthentication: auth,
    privilegeManager,
    maxRequestDepth: Infinity,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods":
        "HEAD, GET, PUT, PROPFIND, DELETE, OPTIONS, MKCOL, MOVE, COPY",
      "Access-Control-Allow-Headers":
        "Accept, Authorization, Content-Type, Content-Length, Depth, Destination",
    },
  });
  console.log(
    `Created server on localhost with port: ${port}, dir:${dir} and authType: ${authType}`
  );
  server.afterRequest((arg, next) => {
    // Display the method, the URI, the returned status code and the returned message
    console.log(
      ">>",
      arg.request.method,
      arg.requested.uri,
      ">",
      arg.response.statusCode,
      arg.response.statusMessage
    );
    // If available, display the body of the response
    console.log(arg.responseBody);
    next();
  });
  return {
    start: function start() {
      return new Promise((resolve) => {
        server.setFileSystem(
          "/webdav/server",
          new ws.PhysicalFileSystem(dir),
          () => {
            server.start(resolve);
          }
        );
      });
    },

    stop: function stop() {
      return new Promise((resolve) => {
        server.stop(resolve);
      });
    },
  };
}

function createWebDAVServer(authType, dataDir, port) {
  return createServer(dataDir, authType, port);
}

/**
 * @param sourceDir - testdata dir to copy from
 * @returns {string}
 */
function clean(sourceDir) {
  const targetDir = path.resolve(__dirname, "../testContents");
  rimraf(targetDir);
  copyDir(sourceDir, targetDir);
  return targetDir;
}

/**
 * @param dataDir - git repository data dir to copy from
 */
function startWebdav(dataDir) {
  const dir = clean(
    path.resolve(dataDir, "file-structure/supported-filestypes")
  );
  const server = createWebDAVServer("basic", dir);

  server
    .start()
    .then(() => {
      console.log("Server started");
      return true;
    })
    .catch((e) => console.error(e));

  process.on("SIGTERM", () => {
    server.stop();
    process.exit(0);
  });
  process.on("SIGINT", () => {
    server.stop();
    process.exit(0);
  });
  return server;
}

module.exports = {
  clean,
  startWebdav,
};
