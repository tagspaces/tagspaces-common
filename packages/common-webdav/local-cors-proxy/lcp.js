#!/usr/bin/env node

var lcp = require("./index.js");
var commandLineArgs = require("command-line-args");

var optionDefinitions = [
  { name: "port", alias: "p", type: Number, defaultValue: 8010 },
  {
    name: "proxyPartial",
    type: String,
    defaultValue: "/proxy",
  },
  { name: "proxyUrl", type: String },
  { name: "credentials", type: Boolean, defaultValue: false },
  { name: "origin", type: String, defaultValue: "*" },
  {
    name: "methods",
    type: Array,
    defaultValue: [
      "GET",
      "HEAD",
      "PUT",
      "PATCH",
      "POST",
      "DELETE",
      "PROPFIND",
      "MKCOL",
      "COPY",
      "MOVE",
      "LOCK",
      "UNLOCK",
      "OPTIONS",
      "PROPPATCH",
      "REPORT",
      "VERSION-CONTROL",
    ],
  },
];

try {
  var options = commandLineArgs(optionDefinitions);
  if (!options.proxyUrl) {
    throw new Error("--proxyUrl is required");
  }
  lcp.startProxy(
    options.port,
    options.proxyUrl,
    options.proxyPartial,
    options.credentials,
    options.origin,
    options.methods
  );
} catch (error) {
  console.error(error);
}
