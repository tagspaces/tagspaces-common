#!/usr/bin/env node
import { createWS } from "./ws.js";

/* const argv = require("yargs/yargs")(process.argv.slice(2))
  .usage("Usage: $0 -port [number]")
  .option("port", {
    alias: "p",
    type: "number",
    default: 3000,
    description: "port",
  })
  .help("h")
  .alias("h", "help").argv; */

const argv = process.argv.slice(2);
const port =
  argv[0] === "-p" && argv[1] !== undefined ? parseInt(argv[1]) : 8888;
const key = argv[2] === "-k" && argv[3] ? argv[3] : undefined;
createWS(port, key);
