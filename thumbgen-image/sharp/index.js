"use strict";
let sharp;

try {
  sharp = require("sharp");
} catch (e) {
  console.log("sharp not available", e);
}

module.exports.sharp = sharp;
