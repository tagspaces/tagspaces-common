const ws = require("webdav-server").v2;

const PASSWORD = "1234";
const USERNAME = "webdav";

function createServer(dir, authType, PORT = 8000) {
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
    port: PORT,
    httpAuthentication: auth,
    privilegeManager,
    maxRequestDepth: Infinity,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods":
        "HEAD, GET, PUT, PROPFIND, DELETE, OPTIONS, MKCOL, MOVE, COPY",
      "Access-Control-Allow-Headers":
        "Accept, Authorization, Content-Type, Content-Length, Depth",
    },
  });
  console.log(
    `Created server on localhost with port: ${PORT}, dir:${dir} and authType: ${authType}`
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
        server.setFileSystem("/", new ws.PhysicalFileSystem(dir), () => {
          server.start(resolve);
        });
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

module.exports = {
  createWebDAVServer,
};
