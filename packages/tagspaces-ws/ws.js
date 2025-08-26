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

  function attachAbortToRequest(req, res, server) {
    const controller = new AbortController();
    const signal = controller.signal;

    // client aborted connection (e.g. electron aborted the request)
    const onAbort = () => {
      if (!signal.aborted) {
        controller.abort();
      }
    };

    // req-level events (normal cases)
    req.on("aborted", onAbort); // client sent an abort
    req.on("close", onAbort); // request stream closed

    // underlying socket — catches ECONNRESET and other socket-level errors
    const sock = req.socket || req.connection;
    const onSocketError = (err) => {
      // abort for any socket error — you can filter by err.code === 'ECONNRESET' if desired
      onAbort();
    };
    const onSocketClose = () => {
      onAbort();
    };

    if (sock) {
      sock.on("error", onSocketError);
      sock.on("close", onSocketClose);
    }

    // Also attach to res finish/close to ensure cleanup when response completes
    const onResDone = () => onAbort();
    res.on("finish", onResDone);
    res.on("close", onResDone);

    // server-level clientError (optional but useful)
    const onClientError = (err, clientSocket) => {
      // If the error is associated with this request's socket, abort.
      if (clientSocket === sock) onAbort();
    };
    if (server && typeof server.on === "function") {
      server.on("clientError", onClientError);
    }

    // cleanup: remove all listeners (call in finally)
    const cleanup = () => {
      req.removeListener("aborted", onAbort);
      req.removeListener("close", onAbort);
      res.removeListener("finish", onResDone);
      res.removeListener("close", onResDone);
      if (sock) {
        sock.removeListener("error", onSocketError);
        sock.removeListener("close", onSocketClose);
      }
      if (server && typeof server.removeListener === "function") {
        server.removeListener("clientError", onClientError);
      }
    };

    return { controller, cleanup, signal };
  }

  // Note: Node's http.createServer accepts async handlers; returning a Promise is fine.
  const requestHandler = async (req, res, server) => {
    const { controller, cleanup, signal } = attachAbortToRequest(req, res, server);
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

  const server = ws.createServer((req, res) => requestHandler(req, res, server));

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
