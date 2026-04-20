"use strict";

// Lazy, memoized loader for wasm-vips.
//
// We intentionally load the stock wasm-vips distribution (vips.wasm only)
//
// wasm-vips is single-instance and not re-entrant, so every call that
// constructs a vips.Image must go through withVips() to serialize access.

let vipsPromise;

function getVips() {
  if (!vipsPromise) {
    vipsPromise = (async () => {
      try {
        const Vips = require("wasm-vips");
        // vips-resvg.wasm adds SVG support (librsvg is LGPL, patent-clean).
        // We intentionally do NOT load vips-heif.wasm or vips-jxl.wasm.
        const vips = await Vips({ dynamicLibraries: ["vips-resvg.wasm"] });
        return vips;
      } catch (e) {
        console.error("wasm-vips failed to initialize", e);
        return null;
      }
    })();
  }
  return vipsPromise;
}

let chain = Promise.resolve();

function withVips(fn) {
  const run = chain.then(fn, fn);
  chain = run.catch(() => {});
  return run;
}

module.exports = { getVips, withVips };
