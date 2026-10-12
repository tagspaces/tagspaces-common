#!/usr/bin/env node

/**
 * Worker process for search-index creation and thumbnail generation.
 *
 * This runs only as an Electron utilityProcess child and communicates over
 * `process.parentPort`. It is not a server: it opens no socket, listens on no
 * port and holds no key. The message port exists solely between this process
 * and the parent that forked it, which the operating system guarantees -- so
 * there is nothing for another local process, a port scan or a (DNS-rebound)
 * web page to reach, and no secret to pass, store or leak.
 *
 */

if (!process.parentPort) {
  console.error(
    "This worker must be started as an Electron utilityProcess; " +
      "process.parentPort is missing. To run an operation outside Electron, " +
      "require ./operations.js directly.",
  );
  process.exit(1);
}

require("./ipc").createIpcServer(process.parentPort);

// Warm up wasm-vips so the first thumbnail request doesn't pay the wasm
// compile cost (~50-150ms). Fire-and-forget — if init fails the thumbnail
// pipeline logs and skips per file.
require("@tagspaces/tagspaces-thumbgen-image/wasmvips")
  .getVips()
  .catch(() => {});
