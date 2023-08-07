#!/usr/bin/env node

module.exports = function tscmd() {
  const argv = require("yargs/yargs")(process.argv.slice(2))
    .usage("Usage: $0 -mode [string] -pdf [boolean] /dirPath1 /dirPath2")
    // .demandOption(['mode'])
    .option("pdf", {
      alias: "p",
      type: "boolean",
      default: false,
      description: "Generate pdf thumbnails",
    })
    .option("mode", {
      alias: "m",
      type: "string",
      // default: "thumbgen",
      description:
        "Switch thumbnails generation or tagspaces index [thumbgen, indexer, metacleaner]",
    })
    .option("analyze", {
      alias: "a",
      type: "boolean",
      default: true,
      description: "(true) Analyze or (false) perform meta cleanup on disk",
    })
    .check((a, b) => {
      if (a._.length === 0) {
        throw "please set args [dirPaths..] !";
      }
      return true;
    })
    .help("h")
    .alias("h", "help").argv;

  if (argv.mode === "thumbgen") {
    const thumbGen = require("@tagspaces/tagspaces-workers/tsnodethumbgen");
    for (const dir of argv._) {
      thumbGen.processAllThumbnails(dir, argv.pdf).then((success) => {
        if (success) {
          console.log("Thumbnails generated in folder: " + dir);
        } else {
          console.warn("Thumbnails not generated for folder: " + dir);
        }
      });
    }
  } else if (argv.mode === "indexer") {
    const {
      persistIndex,
      createIndex,
    } = require("@tagspaces/tagspaces-platforms/indexer");

    for (const dir of argv._) {
      createIndex(dir).then((directoryIndex) => {
        persistIndex(dir, directoryIndex).then((success) => {
          if (success) {
            console.log("Index generated in folder: " + dir);
          }
        });
      });
    }
  } else if (argv.mode === "metacleaner") {
    const {
      cleanMeta,
    } = require("@tagspaces/tagspaces-metacleaner/metacleaner");
    for (const dir of argv._) {
      cleanMeta(
        dir,
        (filePath) => {
          console.log("File cleaned:" + filePath);
        },
        argv.analyze,
        { considerMetaJSON: false, considerThumb: true }
      ).then(() => {
        console.log("Dir cleaned:" + dir);
      });
    }
  } else {
    console.error(
      "Unknown mode:" +
        argv.mode +
        " please set -m metacleaner|indexer|thumbgen"
    );
  }
};
