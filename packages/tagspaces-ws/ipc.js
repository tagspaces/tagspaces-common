"use strict";

/**
 * Message-port transport, used when the worker runs as an Electron
 * utilityProcess child.
 *
 * This is the transport the TagSpaces app uses. It opens no socket and needs no
 * shared secret: the message port exists only between this process and the main
 * process that forked it, so there is nothing for another local process, a port
 * scan or a DNS-rebound web page to connect to. The HTTP transport (ws.js) is
 * kept only for standalone use and has to re-establish by authentication what
 * this transport gets from the operating system.
 *
 * Protocol (structured-clone objects, both directions):
 *   main -> worker   {id, op, params}        start an operation
 *                    {op: "cancel", target}  abort an in-flight operation
 *   worker -> main   {id, ok: true,  result}
 *                    {id, ok: false, error, name}
 */

const { runIndexer, runThumbGen } = require("./operations");

const OPS = {
  // Liveness probe. Confirms the message loop works, not merely that a process
  // exists, which is what the app needs before choosing the worker code path.
  ping: async () => true,
  indexer: (params, signal) => runIndexer(params, signal),
  // Resolve to the thumbnail array, matching what the HTTP response body
  // carried, so the app sees the same shape on either transport.
  thumbGen: (params) => runThumbGen(params).then((r) => r.thumbs),
};

module.exports.createIpcServer = function (parentPort) {
  // id -> AbortController for operations currently running
  const inflight = new Map();

  function reply(message) {
    try {
      parentPort.postMessage(message);
    } catch (e) {
      // The parent is gone; nothing left to reply to.
      console.error("IPC reply failed:", e.message);
    }
  }

  parentPort.on("message", (event) => {
    const msg = event && event.data;
    if (!msg || typeof msg !== "object") {
      return;
    }

    if (msg.op === "cancel") {
      const controller = inflight.get(msg.target);
      if (controller) {
        controller.abort(new Error("cancelled by caller"));
      }
      return;
    }

    const { id, op, params } = msg;
    if (typeof id !== "number" && typeof id !== "string") {
      return;
    }

    const handler = Object.prototype.hasOwnProperty.call(OPS, op)
      ? OPS[op]
      : undefined;
    if (!handler) {
      reply({ id, ok: false, error: "unknown op" });
      return;
    }

    const controller = new AbortController();
    inflight.set(id, controller);

    Promise.resolve()
      .then(() => handler(params, controller.signal))
      .then((result) => reply({ id, ok: true, result }))
      .catch((err) => {
        // An abort is an expected outcome, not a failure to log loudly.
        const aborted = controller.signal.aborted;
        if (!aborted) {
          console.error(`Operation ${op} failed:`, (err && err.message) || err);
        }
        reply({
          id,
          ok: false,
          error: aborted ? "aborted" : (err && err.message) || String(err),
          name: aborted ? "AbortError" : err && err.name,
        });
      })
      .then(() => {
        inflight.delete(id);
      });
  });

  // Messages are queued until a 'message' listener is attached, so registering
  // above is enough — there is no startup race to lose a request to.
  console.log("TagSpaces WS running in IPC mode (no network socket)");
};
