#!/usr/bin/env node
const tsIndexer = require("./tsnodeindexer");

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("please set args [dirPaths..] to generate index");
} else {
  for (const dir of args) {
    tsIndexer.indexer(dir).then((directoryIndex) => {
      tsIndexer.persistIndex(dir, directoryIndex).then((success) => {
        if (success) {
          console.log("Index generated in folder: " + dir);
        }
      });
    });
  }
}
