const chokidar = require("chokidar");
const findFreePorts = require("find-free-ports");
const {
  collectBody,
  safeJsonParse,
  validatePath,
  sendError,
} = require("../security");

let watcher, wss;

function stopWatching() {
  if (watcher && watcher.close) {
    watcher.close();
  }
  watcher = undefined;
  if (wss) {
    wss.close();
  }
  wss = undefined;
}

function startWatching(folderPath, depth) {
  watcher = chokidar.watch(folderPath, {
    ignored: (
      path, //, stats) =>
    ) =>
      (/(^|[\/\\])\../.test(path) && !path.includes(".ts")) ||
      (path.includes(".ts") && path.includes("tsi.json")),
    ignoreInitial: true,
    followSymlinks: false,
    depth,
  });

  watcher.on("all", (event, path) => {
    wss.clients.forEach(function each(client) {
      if (client.readyState === 1) {
        client.send(JSON.stringify({ path, eventName: event }));
      }
    });
  });
}

function watchFolder(req, res) {
  if (req.method === "POST") {
    stopWatching();
    collectBody(req, res)
      .then(async (body) => {
        try {
          const data = safeJsonParse(body);
          const safePath = validatePath(data.path);
          const depth =
            typeof data.depth === "number" ? Math.min(data.depth, 10) : 3;

          findFreePorts(1, { startPort: 8889 }).then(([freePort]) => {
            const WebSocket = require("ws");
            wss = new WebSocket.Server({
              port: freePort,
              host: "127.0.0.1", // Bind to localhost only
              perMessageDeflate: {
                zlibDeflateOptions: {
                  chunkSize: 1024,
                  memLevel: 7,
                  level: 3,
                },
                zlibInflateOptions: {
                  chunkSize: 10 * 1024,
                },
                clientNoContextTakeover: true,
                serverNoContextTakeover: true,
                serverMaxWindowBits: 10,
                concurrencyLimit: 10,
                threshold: 1024,
              },
            });

            startWatching(safePath, depth);

            res.statusCode = 200;
            res.setHeader("Content-Type", "application/json");
            res.setHeader("Cache-Control", "no-store, must-revalidate");
            res.end(JSON.stringify({ port: freePort }));
          });
        } catch (e) {
          sendError(res, 400, "Watch folder failed", e);
        }
      })
      .catch(() => {});
  }
}

module.exports = {
  watchFolder,
};
