#!/usr/bin/env node

const argv = require("yargs/yargs")(process.argv.slice(2))
  .usage("Usage: $0 -port [number]")
  .option("port", {
    alias: "p",
    type: "number",
    default: 3000,
    description: "port",
  })
  .help("h")
  .alias("h", "help").argv;

const httpServer = require("./ws");
httpServer.createWS(argv.port);
