"use strict";
const ws = require("http");
const { verifyAuth } = require("./auth");
const { watchFolder } = require("./endpoints/watchFolderRequest");
const { hideFolder } = require("./endpoints/hideFolderRequest");
const { defaultRequest } = require("./endpoints/defaultRequest");
const { handleIndexer } = require("./endpoints/indexerRequest");
const { handleThumbGen } = require("./endpoints/thumbGenRequest");
const { extractPdf } = require("./endpoints/extractPdfContentRequest");

/**
 * curl -d '["/Users/sytolk/IdeaProjects/tagspaces/tests/testdata-tmp/file-structure/supported-filestypes/sample.png","/Users/sytolk/IdeaProjects/tagspaces/tests/testdata-tmp/file-structure/supported-filestypes/sample.jpg"]' -H "Content-Type: application/json" -X POST http://127.0.0.1:2000/thumb-gen
 * curl -d '{"directoryPath":"/Users/sytolk/IdeaProjects/tagspaces/tests/testdata-tmp/file-structure/supported-filestypes/"}' -H "Content-Type: application/json" -X POST http://127.0.0.1:2000/indexer
 */
module.exports.createWS = function (port, key) {
  const hostname = "127.0.0.1";

  function attachAbortToRequest(req, res) {
    const controller = new AbortController();

    // client aborted connection (e.g. closed tab, electron aborted the request)
    const onAbort = () => {
      controller.abort();
    };

    req.on("aborted", onAbort); // emitted if the request is aborted
    req.on("close", onAbort);

    // Also attach to res finish/close to ensure cleanup when response completes
    const onResDone = () => {
      controller.abort();
    };
    res.on("finish", onResDone); // normal end
    res.on("close", onResDone); // client closed socket
    // cleanup function to remove listeners (call in finally)
    const cleanup = () => {
      req.removeListener("aborted", onAbort);
      req.removeListener("close", onAbort);
      res.removeListener("finish", onResDone);
      res.removeListener("close", onResDone);
    };

    return { controller, cleanup };
  }

  // Note: Node's http.createServer accepts async handlers; returning a Promise is fine.
  const requestHandler = async (req, res) => {
    const { controller, cleanup } = attachAbortToRequest(req, res);
    const signal = controller.signal;
    try {
      const baseURL = "http://" + req.headers.host + "/";
      const reqUrl = new URL(req.url, baseURL);
      if (reqUrl.pathname === "/thumb-gen") {
        if (!verifyAuth(req.headers.authorization, res, key)) {
          return;
        }
        await handleThumbGen(req, res);
      } else if (reqUrl.pathname === "/extract-pdf") {
        if (!verifyAuth(req.headers.authorization, res, key)) {
          return;
        }
        await extractPdf(req, res);
      } else if (reqUrl.pathname === "/indexer") {
        if (!verifyAuth(req.headers.authorization, res, key)) return;
        // pass signal down so indexing can abort
        await handleIndexer(req, res, signal);
      } else if (reqUrl.pathname === "/watch-folder") {
        if (!verifyAuth(req.headers.authorization, res, key)) return;
        await watchFolder(req, res);
      } else if (reqUrl.pathname === "/hide-folder") {
        if (!verifyAuth(req.headers.authorization, res, key)) return;
        await hideFolder(req, res);
      } else {
        await defaultRequest(req, res);
      }
    } catch (err) {
      // if aborted, don't attempt to write to the response
      if (signal.aborted || res.writableEnded) {
        // nothing to do — client disconnected
        return;
      }
      console.error("Request handler error:", err);
      if (!res.writableEnded) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({ ok: false, error: err.message || "Internal error" })
        );
      }
    } finally {
      // ALWAYS clean up listeners
      cleanup();
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
  return server;
};
