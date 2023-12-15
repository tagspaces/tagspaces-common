const { verifyAuth } = require("../auth");
const chokidar = require("chokidar");
const findFreePorts = require("find-free-ports");

let watcher, wss;

function stopWatching() {
  if (watcher && watcher.close) {
    watcher.close();
  }
  watcher = undefined;
  if(wss){
    wss.close();
  }
  wss = undefined;
}

function startWatching(folderPath, depth) {
  watcher = chokidar.watch(folderPath, {
    ignored: (
      path //, stats) =>
    ) =>
      (/(^|[\/\\])\../.test(path) && !path.includes(".ts")) || // ignoring .dotfiles but not dirs like .ts
      (path.includes(".ts") && path.includes("tsi.json")), // ignoring .ts/tsi.json folder
    //  /(^|[\/\\])\../.test(path) || path.includes('.ts'), // ignoring .dotfiles // ignoring .ts folder
    // (stats && stats.isDirectory()),  // ignoring directories
    ignoreInitial: true,
    depth,
  });

  watcher.on("all", (event, path) => {
    wss.clients.forEach(function each(client) {
      if (client.readyState === WebSocket.OPEN) {
        client.send({ path, eventName: event });
      }
    });
  });
}

function watchFolder(req, res) {
  if (!verifyAuth(req.headers.authorization, res)) {
    return;
  }
  if (req.method === "POST") {
    stopWatching();
      // console.log('POST');
      let body = "";
      req.on("data", function (data) {
        body += data;
        // console.log("Partial body: " + body);
      });
      req.on("end", async () => {
        // console.log('Body: ' + parse(body));
        try {
          const data = JSON.parse(body);

          findFreePorts(1, { startPort: 8889 }).then(([freePort]) => {
            const WebSocket = require("ws");
            wss = new WebSocket.Server({
              port: freePort,
              perMessageDeflate: {
                zlibDeflateOptions: {
                  // See zlib defaults.
                  chunkSize: 1024,
                  memLevel: 7,
                  level: 3,
                },
                zlibInflateOptions: {
                  chunkSize: 10 * 1024,
                },
                // Other options settable:
                clientNoContextTakeover: true, // Defaults to negotiated value.
                serverNoContextTakeover: true, // Defaults to negotiated value.
                serverMaxWindowBits: 10, // Defaults to negotiated value.
                // Below options specified as default values.
                concurrencyLimit: 10, // Limits zlib concurrency for perf.
                threshold: 1024, // Size (in bytes) below which messages
                // should not be compressed if context takeover is disabled.
              },
            });

            startWatching(data.path, data.depth);

            res.statusCode = 200;
            res.setHeader("Content-Type", "application/json");
            res.setHeader("Cache-Control", "no-store, must-revalidate");
            res.end(JSON.stringify({ port: freePort }));
          });
        } catch (e) {
          console.log(e);
          res.statusCode = 400;
          res.end();
        }
      });
  }
}
module.exports = {
  watchFolder,
};
