const findFreePorts = require("find-free-ports");

let session, wss;

function stopWss() {
  if (wss) {
    wss.close();
  }
  wss = undefined;
}

function sendMessage(message) {
  if (wss) {
    wss.clients.forEach(function each(client) {
      if (client.readyState === 1) {
        client.send(message);
      }
    });
  }
}
async function startLlama(folderPath) {

  const {
    getLlama,
    LlamaChatSession,
    resolveModelFile } = await import("node-llama-cpp");
  const modelPath = await resolveModelFile(
    "{{modelUriOrFilename|escape}}",
    folderPath
  );
  sendMessage("Loading model: " + modelPath);
  const llama = await getLlama();
  const model = await llama.loadModel({ modelPath });

  sendMessage("Creating context...");
  const context = await model.createContext();

  session = new LlamaChatSession({
    contextSequence: context.getSequence(),
  });

  sendMessage("Chat Session ready! Hi there, how are you?");
}

function sendPromptMessage(req, res) {
  if (req.method === "POST") {
    let body = "";
    req.on("data", function (data) {
      body += data;
      // console.log("Partial body: " + body);
    });
    req.on("end", async () => {
      // console.log('Body: ' + parse(body));
      try {
        const data = JSON.parse(body);
        if (data.message && session) {
          console.log("User: " + data.message);

          session.prompt(data.message, {
            onTextChunk(chunk) {
              // stream the response to the console as it's being generated
              sendMessage(chunk);
            },
          });
        }
      } catch (e) {
        console.log(e);
        res.statusCode = 400;
        res.end();
      }
    });
  }
}

function startNewChatSession(req, res) {
  if (req.method === "POST") {
    stopWss();
    let body = "";
    req.on("data", function (data) {
      body += data;
      // console.log("Partial body: " + body);
    });
    req.on("end", async () => {
      // console.log('Body: ' + parse(body));
      try {
        const data = JSON.parse(body);

        findFreePorts(1, { startPort: 9889 }).then(([freePort]) => {
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

          startLlama(data.path);

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
  startNewChatSession,
  sendPromptMessage,
};
