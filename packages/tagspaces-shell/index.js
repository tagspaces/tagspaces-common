#!/usr/bin/env node
"use strict";

const chalk = require("chalk");
const { version } = require("./package.json");

// prettier-ignore
const BANNER = [
  "",
  chalk.cyan("████████╗ █████╗  ██████╗ ███████╗██████╗  █████╗  ██████╗███████╗███████╗"),
  chalk.cyan("   ██╔══╝██╔══██╗██╔════╝ ██╔════╝██╔══██╗██╔══██╗██╔════╝██╔════╝██╔════╝"),
  chalk.cyan("   ██║   ███████║██║  ███╗███████╗██████╔╝███████║██║     █████╗  ███████╗"),
  chalk.cyan("   ██║   ██╔══██║██║   ██║╚════██║██╔═══╝ ██╔══██║██║     ██╔══╝  ╚════██║"),
  chalk.cyan("   ██║   ██║  ██║╚██████╔╝███████║██║     ██║  ██║╚██████╗███████╗███████║"),
  chalk.cyan("   ╚═╝   ╚═╝  ╚═╝ ╚═════╝ ╚══════╝╚═╝     ╚═╝  ╚═╝ ╚═════╝╚══════╝╚══════╝"),
  "",
  chalk.bold("  tscmd v" + version) + "  —  TagSpaces CLI for indexing, thumbnails & cleanup",
  "",
].join("\n");

function showBanner() {
  console.log(BANNER);
}

module.exports = function tscmd() {
  const args = process.argv.slice(2);
  if (args.includes("--help") || args.includes("-h") || args.length === 0) {
    showBanner();
  }

  require("yargs/yargs")(args)
    .scriptName("tscmd")
    .version(version)
    .alias("v", "version")
    .usage("Usage: $0 <command> [options] <dir...>")

    // ── thumbgen ──────────────────────────────────────────────────────────────
    .command(
      "thumbgen <dirs...>",
      "Generate thumbnails for files in one or more directories",
      (yargs) =>
        yargs.option("pdf", {
          alias: "p",
          type: "boolean",
          default: false,
          description: "Include PDF thumbnails",
        }),
      async (argv) => {
        const thumbGen = require("@tagspaces/tagspaces-workers/tsnodethumbgen");
        for (const dir of argv.dirs) {
          try {
            const success = await thumbGen.processAllThumbnails(dir, argv.pdf);
            if (success) {
              console.log(chalk.green("✔ Thumbnails generated: ") + dir);
            } else {
              console.warn(chalk.yellow("⚠ Thumbnails not generated: ") + dir);
            }
          } catch (err) {
            console.error(chalk.red("✖ Error processing: ") + dir);
            console.error(chalk.red(err.message || err));
          }
        }
      },
    )

    // ── indexer ───────────────────────────────────────────────────────────────
    .command(
      "indexer <dirs...>",
      "Create a search index for one or more directories",
      () => {},
      async (argv) => {
        const {
          persistIndex,
          createIndex,
        } = require("@tagspaces/tagspaces-indexer");
        const {
          listDirectoryPromise,
          getFileContentPromise,
          saveTextFilePromise,
        } = require("@tagspaces/tagspaces-common-node/io-node");

        for (const dir of argv.dirs) {
          try {
            console.log(chalk.cyan("  Indexing: ") + dir);
            const directoryIndex = await createIndex({
              path: dir,
              listDirectoryPromise,
              getFileContentPromise,
            });
            const success = await persistIndex(
              { path: dir, saveTextFilePromise },
              directoryIndex,
            );
            if (success) {
              console.log(chalk.green("✔ Index generated: ") + dir);
            } else {
              console.warn(chalk.yellow("⚠ Index not persisted: ") + dir);
            }
          } catch (err) {
            console.error(chalk.red("✖ Error indexing: ") + dir);
            console.error(chalk.red(err.message || err));
          }
        }
      },
    )

    // ── metacleaner ───────────────────────────────────────────────────────────
    .command(
      "metacleaner <dirs...>",
      "Remove obsolete sidecar files and thumbnails",
      (yargs) =>
        yargs.option("analyze", {
          alias: "a",
          type: "boolean",
          default: true,
          description:
            "Dry-run: list files to remove without deleting them (set to false to delete)",
        }),
      async (argv) => {
        const {
          cleanMeta,
        } = require("@tagspaces/tagspaces-metacleaner/metacleaner");
        const mode = argv.analyze
          ? chalk.yellow("[dry-run] ")
          : chalk.red("[delete] ");

        for (const dir of argv.dirs) {
          try {
            await cleanMeta(
              dir,
              (filePath) =>
                console.log(mode + chalk.dim("cleaned: ") + filePath),
              argv.analyze,
              { considerMetaJSON: false, considerThumb: true },
            );
            console.log(chalk.green("✔ Done cleaning: ") + dir);
          } catch (err) {
            console.error(chalk.red("✖ Error cleaning: ") + dir);
            console.error(chalk.red(err.message || err));
          }
        }
      },
    )

    .demandCommand(
      1,
      chalk.red("Please specify a command: thumbgen | indexer | metacleaner"),
    )
    .strict()
    .help("h")
    .alias("h", "help")
    .parse();
};
