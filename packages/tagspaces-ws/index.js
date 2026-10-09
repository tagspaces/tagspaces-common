#!/usr/bin/env node

const argv = process.argv.slice(2);
const httpServer = require("./ws");
const port = argv[0] === "-p" ? parseInt(argv[1]) : 8888;

// The signing key arrives in the environment, not in argv: a process's command
// line is readable by other processes on every supported platform (`ps`,
// WMIC/CIM), so a key passed as `-k` leaks to any local onlooker regardless of
// how random it is. `-k` is kept only for standalone/CLI use.
// Delete it from our own env right after reading so the thumbnail and indexer
// child processes we spawn do not inherit it.
let key = process.env.TS_WS_KEY;
if (key) {
  delete process.env.TS_WS_KEY;
} else if (argv[2] === "-k") {
  key = argv[3];
}

if (!key) {
  console.error(
    "No signing key provided. Set TS_WS_KEY in the environment (preferred) or pass -k <key>.",
  );
  process.exit(1);
}

httpServer.createWS(port, key);

// Warm up wasm-vips so the first thumbnail request doesn't pay the wasm
// compile cost (~50-150ms). Fire-and-forget — if init fails the thumbnail
// pipeline logs and skips per file.
require("@tagspaces/tagspaces-thumbgen-image/wasmvips")
  .getVips()
  .catch(() => {});
