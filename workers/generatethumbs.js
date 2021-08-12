#!/usr/bin/env node
const thumbGen = require("./tsnodethumbgen");

const argv = require("yargs/yargs")(process.argv.slice(2))
  .usage("Usage: $0 -pdf [boolean] /dirPath1 /dirPath2")
  .option("pdf", {
    alias: "p",
    type: "boolean",
    default: false,
    description: "Generate pdf thumbnails",
  })
  .check((a, b) => {
    if (a._.length === 0) {
      throw "please set args [dirPaths..] to generate thumbnails!";
    }
    return true;
  })
  .help("h")
  .alias("h", "help").argv;

for (const dir of argv._) {
  thumbGen.processAllThumbnails(dir, argv.pdf).then((success) => {
    if (success) {
      console.log("Thumbnails generated in folder: " + dir);
    } else {
      console.warn("Thumbnails not generated for folder: " + dir);
    }
  });
}
