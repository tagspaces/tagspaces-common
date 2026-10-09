"use strict";
const ws = require("http");
const { verifyAuth } = require("./auth");
const { handleIndexer } = require("./endpoints/indexerRequest");
const { handleThumbGen } = require("./endpoints/thumbGenRequest");

/**
 * Loopback-only worker for search-index and thumbnail generation. The only
 * legitimate client is the TagSpaces Electron main process, which signs every
 * request with a per-launch key (see src/main/wsAuth.ts). Requests therefore
 * need an Authorization header whose token names the endpoint in `sub`:
 *
 *   TOKEN=$(node -e 'const jwt=require("jsonwebtoken");console.log(jwt.sign(
 *     {sub:"/indexer"},"<key>",{algorithm:"HS256",expiresIn:"60s",
 *     issuer:"tagspaces-main",audience:"tagspaces-ws"}))')
 *   curl -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
 *        -d '{"directoryPath":"/abs/path"}' -X POST http://127.0.0.1:2000/indexer
 */
// Exact-match route table. Everything not listed here gets a bare 404.
// `/` is the health probe used by the app to decide whether the worker is up;
// it is authenticated like any other route so it cannot be used as an
// unauthenticated "is TagSpaces running here?" oracle.
const ROUTES = {
  "/": { method: "GET", handler: null, requiresJsonBody: false },
  "/indexer": {
    method: "POST",
    handler: (req, res, signal) => handleIndexer(req, res, signal),
    requiresJsonBody: true,
  },
  "/thumb-gen": {
    method: "POST",
    handler: (req, res) => handleThumbGen(req, res),
    requiresJsonBody: true,
  },
};

// Headers that only ever appear on a request made by a browser on behalf of a
// document. Every current browser sends Sec-Fetch-*; Origin/Referer/Cookie
// cover the rest. The main process (http.request) sends none of them, so
// rejecting on their presence costs nothing and blocks the whole class of
// page-driven attacks -- including a DNS-rebound page that has become
// same-origin with us and therefore no longer triggers a CORS preflight.
const BROWSER_HEADERS = [
  "origin",
  "referer",
  "cookie",
  "sec-fetch-site",
  "sec-fetch-mode",
  "sec-fetch-dest",
  "sec-fetch-user",
];

function isBrowserOriginated(headers) {
  return BROWSER_HEADERS.some((h) => headers[h] !== undefined);
}

/**
 * The Host header must name this loopback server exactly. A rebound domain
 * (attacker.example resolving to 127.0.0.1) sends its own name here, so an
 * exact allowlist is what actually stops DNS rebinding -- parsing the URL
 * against a fixed base does not.
 */
function isAllowedHost(host, port) {
  if (!host || typeof host !== "string") {
    return false;
  }
  return (
    host === "127.0.0.1:" + port ||
    host === "localhost:" + port ||
    host === "[::1]:" + port
  );
}

function hasJsonContentType(headers) {
  const ct = headers["content-type"];
  return (
    typeof ct === "string" &&
    ct.toLowerCase().split(";")[0].trim() === "application/json"
  );
}

/** Status-only reply: no body, nothing to fingerprint, no auth detail. */
function sendBare(res, statusCode) {
  if (!res.writableEnded) {
    res.statusCode = statusCode;
    res.end();
  }
}

module.exports.createWS = function (port, key) {
  const hostname = "127.0.0.1";

  function attachAbortToRequest(req, res) {
    const controller = new AbortController();
    const { signal } = controller;

    const onAbort = (reason) => {
      if (!signal.aborted) {
        controller.abort(reason);
      }
    };

    const onReqAborted = () => onAbort(new Error("client request aborted"));
    const onReqClose = () => onAbort(new Error("request close"));
    const onResFinish = () => onAbort(new Error("response finished"));
    const onSockError = (err) => onAbort(err || new Error("socket error"));
    const onSockClose = (hadErr) => onAbort(new Error("socket close"));

    req.once("aborted", onReqAborted);
    req.once("close", onReqClose);
    res.once("finish", onResFinish);
    res.once("close", onResFinish);

    const sock = req.socket || req.connection;
    if (sock) {
      sock.once("error", onSockError);
      sock.once("close", onSockClose);

      // If socket already destroyed, abort immediately
      if (sock.destroyed) {
        onAbort(new Error("socket already destroyed"));
      }
    }

    // cleanup: remove all listeners (call in finally)
    const cleanup = () => {
      try {
        req.removeListener("aborted", onReqAborted);
        req.removeListener("close", onReqClose);
        res.removeListener("finish", onResFinish);
        res.removeListener("close", onResFinish);
        if (sock) {
          sock.removeListener("error", onSockError);
          sock.removeListener("close", onSockClose);
        }
      } catch (e) {
        // ignore
      }
    };

    return { controller, signal, cleanup };
  }

  // Note: Node's http.createServer accepts async handlers; returning a Promise is fine.
  const requestHandler = async (req, res) => {
    const { controller, cleanup, signal } = attachAbortToRequest(req, res);
    try {
      // Parse against a fixed base rather than the Host header, so a crafted
      // Host cannot influence which route is selected. The Host header itself
      // is validated separately below.
      const baseURL = "http://" + hostname + ":" + port + "/";
      const reqUrl = new URL(req.url, baseURL);

      // Security headers on all responses
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("Cache-Control", "no-store");

      // --- Transport guards, before any routing or auth work ---
      // These run first so an unauthenticated caller learns nothing about
      // which routes exist, and so a browser-originated request is dropped
      // regardless of whether it carries a valid token.
      if (!isAllowedHost(req.headers.host, port)) {
        // Foreign Host means the request did not reach us as 127.0.0.1:<port>,
        // i.e. DNS rebinding. Drop the socket without a reply.
        req.destroy();
        return;
      }
      if (isBrowserOriginated(req.headers)) {
        // The only legitimate client is the Electron main process, which uses
        // http.request and never sends these headers. Any browser does.
        return sendBare(res, 403);
      }

      const route = ROUTES[reqUrl.pathname];

      if (!route) {
        // Unknown path: bare 404, no body, no server identification. The old
        // catch-all "Hello from the TagSpaces WS" page made the port trivial
        // to fingerprint from a scan.
        return sendBare(res, 404);
      }

      if (req.method !== route.method) {
        return sendBare(res, 405);
      }

      if (route.requiresJsonBody && !hasJsonContentType(req.headers)) {
        return sendBare(res, 415);
      }

      if (!verifyAuth(req.headers.authorization, res, key, reqUrl.pathname)) {
        return;
      }

      if (!route.handler) {
        // Health check: authenticated, but deliberately says nothing.
        return sendBare(res, 204);
      }

      // pass signal down so long operations (indexing) can abort
      await route.handler(req, res, signal);
    } catch (err) {
      // if aborted, don't attempt to write to the response
      if (signal.aborted || res.writableEnded) {
        // nothing to do — client disconnected
        return;
      }
      console.error("Request handler error:", err);
      if (!res.writableEnded) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: false, error: "Internal server error" }));
      }
    } finally {
      // ALWAYS clean up listeners
      cleanup();
    }
  };

  const server = ws.createServer(requestHandler);
  // 5 minute socket timeout for long-running operations (indexing large
  // directories). headersTimeout/requestTimeout are much tighter: a client
  // that opens a socket and dribbles headers should not be able to hold a
  // worker slot for minutes.
  server.setTimeout(10 * 60 * 1000);
  server.headersTimeout = 10 * 1000;
  server.requestTimeout = 30 * 1000;
  server.maxHeadersCount = 64;

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
      `Server running at http://${hostname}:${port}/ and will accept connections from ${hostname} only`,
    );
  });
  return server;
};
