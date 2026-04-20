#!/usr/bin/env node

const argv = process.argv.slice(2);
const httpServer = require("./ws");
const port = argv[0] === "-p" ? parseInt(argv[1]) : 8888;
const key = argv[2] === "-k" ? argv[3] : undefined;
httpServer.createWS(port, key);

// Warm up wasm-vips so the first thumbnail request doesn't pay the wasm
// compile cost (~50-150ms). Fire-and-forget — if init fails the thumbnail
// pipeline logs and skips per file.
require("@tagspaces/tagspaces-thumbgen-image/wasmvips")
  .getVips()
  .catch(() => {});
