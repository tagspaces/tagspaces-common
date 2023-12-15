"use strict";
const ws = require("http");
const { watchFolder } = require("./endpoints/watchFolderRequest");
const { defaultRequest } = require("./endpoints/defaultRequest");
const { handleIndexer } = require("./endpoints/indexerRequest");
const { handleThumbGen } = require("./endpoints/thumbGenRequest");

/**
 * curl -d '["/Users/sytolk/IdeaProjects/tagspaces/tests/testdata-tmp/file-structure/supported-filestypes/sample.png","/Users/sytolk/IdeaProjects/tagspaces/tests/testdata-tmp/file-structure/supported-filestypes/sample.jpg"]' -H "Content-Type: application/json" -X POST http://127.0.0.1:2000/thumb-gen
 * curl -d '{"directoryPath":"/Users/sytolk/IdeaProjects/tagspaces/tests/testdata-tmp/file-structure/supported-filestypes/"}' -H "Content-Type: application/json" -X POST http://127.0.0.1:2000/indexer
 */
module.exports.createWS = function (port, key) {
  const hostname = "127.0.0.1";

  const requestHandler = (req, res) => {
    const baseURL = "http://" + req.headers.host + "/";
    const reqUrl = new URL(req.url, baseURL);
    if (reqUrl.pathname === "/thumb-gen") {
      handleThumbGen(req, res);
    } else if (reqUrl.pathname === "/indexer") {
      handleIndexer(req, res);
    } else if (reqUrl.pathname === "/watch-folder") {
      watchFolder(req, res);
    } else {
      defaultRequest(req, res);
    }
  };

  const server = ws.createServer(requestHandler);

  const errorHandler = (error) => {
    if (error.syscall !== "listen") {
      throw error;
    }
    const address = server.address();
    const bind =
      typeof address === "string" ? "pipe " + address : "port: " + port;
    switch (error.code) {
      case "EACCES":
        console.error(bind + " requires elevated privileges.");
        process.exit(1);
        break;
      case "EADDRINUSE":
        console.error(bind + " is already in use.");
        process.exit(1);
        break;
      default:
        throw error;
    }
  };
  server.on("error", errorHandler);

  server.listen(port, hostname, () => {
    console.log(
      `Server running at http://${hostname}:${port}/ and will accept connections from ${hostname} only`
    );
  });
};
