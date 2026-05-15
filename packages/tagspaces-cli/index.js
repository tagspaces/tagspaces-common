#!/usr/bin/env node
/**
 * The MIT License (MIT)
 * Copyright (c) 2021-present TagSpaces Authors
 * @tagspaces/tagspaces-cli — Command-line interface for TagSpaces operations:
 * indexing, thumbnail generation, tagging, description, and searching.
 * Pure JS, works on all platforms: Electron, browser, Cordova, Capacitor, Node CLI.
 */
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
  chalk.bold("  tscmd v" + version) + "  —  TagSpaces CLI for indexing, thumbnails, tagging & more",
  "",
].join("\n");

function showBanner() {
  console.log(BANNER);
}

function formatBytes(bytes) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function createSpinner(message) {
  const frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
  let i = 0;
  let text = message;
  const id = setInterval(() => {
    process.stdout.write(
      "\r" + chalk.cyan(frames[i++ % frames.length]) + " " + text,
    );
  }, 80);
  return {
    update(msg) {
      text = msg;
    },
    stop(finalMsg) {
      clearInterval(id);
      process.stdout.write("\r" + " ".repeat(text.length + 4) + "\r");
      if (finalMsg) console.log(finalMsg);
    },
  };
}

const DANGEROUS_KEYS = ["__proto__", "constructor", "prototype"];
const MAX_DESCRIPTION_SIZE = 10 * 1024 * 1024; // 10 MB
// eslint-disable-next-line no-control-regex
const INVALID_TAG_CHARS = /[/\\[\]\x00-\x1f]/;

/**
 * Parse a query string into a structured search query.
 * Bare words become the fulltext query; tokens prefixed with
 *   +  → tagsAND
 *   -  → tagsNOT
 *   |  → tagsOR
 * A bare prefix char with no word (e.g. "+") is ignored.
 */
function parseQuery(query) {
  const textParts = [];
  const tagsAND = [];
  const tagsNOT = [];
  const tagsOR = [];
  if (query) {
    for (const raw of String(query).split(/\s+/)) {
      if (!raw) continue;
      const prefix = raw[0];
      const rest = raw.slice(1);
      if (prefix === "+" && rest) tagsAND.push(rest);
      else if (prefix === "-" && rest) tagsNOT.push(rest);
      else if (prefix === "|" && rest) tagsOR.push(rest);
      else textParts.push(raw);
    }
  }
  return {
    textQuery: textParts.join(" "),
    tagsAND,
    tagsNOT,
    tagsOR,
  };
}

async function loadSidecarJSON(loadTextFilePromise, metaFilePath) {
  try {
    const content = await loadTextFilePromise(metaFilePath);
    const parsed = JSON.parse(content);
    for (const key of DANGEROUS_KEYS) {
      if (key in parsed) {
        delete parsed[key];
      }
    }
    return parsed;
  } catch (e) {
    return {};
  }
}

async function saveSidecarJSON(
  createDirectoryPromise,
  saveTextFilePromise,
  metaFilePath,
  obj,
) {
  const nodePath = require("path");
  const metaDir = nodePath.dirname(metaFilePath);
  await createDirectoryPromise(metaDir);
  await saveTextFilePromise(metaFilePath, JSON.stringify(obj, null, 2), true);
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
      (yargs) =>
        yargs
          .option("fulltext", {
            alias: "f",
            type: "boolean",
            default: false,
            description: "Extract full-text content from files (MD, HTML, TXT, PDF)",
          })
          .option("links", {
            alias: "l",
            type: "boolean",
            default: false,
            description: "Extract links from file content (requires --fulltext)",
          })
          .option("force", {
            type: "boolean",
            default: false,
            description: "Force full re-index (skip incremental)",
          }),
      async (argv) => {
        const {
          persistIndex,
          createIndex,
          createIncrementalIndex,
          getMetaIndexFilePath,
          getMetaFullTextFilePath,
          parseFullTextJsonl,
        } = require("@tagspaces/tagspaces-indexer");
        const {
          loadJSONString,
        } = require("@tagspaces/tagspaces-common/utils-io");
        const {
          listDirectoryPromise,
          getFileContentPromise,
          saveTextFilePromise,
          loadTextFilePromise,
          checkDirExist,
        } = require("@tagspaces/tagspaces-common-node/io-node");
        const extendedExtraction = argv.fulltext
          ? require("@tagspaces/tagspaces-pdf-extraction").extractPDFcontent
          : undefined;

        for (const dir of argv.dirs) {
          try {
            if (!(await checkDirExist(dir))) {
              console.error(
                chalk.red("✖ Directory does not exist: ") + dir,
              );
              continue;
            }
            const mode = ["loadMeta"];
            if (argv.fulltext) {
              mode.push("extractTextContent");
              if (argv.links) {
                mode.push("extractLinks");
              }
            }

            const modeLabel = argv.fulltext
              ? " [fulltext" + (argv.links ? "+links" : "") + "]"
              : "";
            const spinner = createSpinner(
              "Indexing: " + dir + chalk.dim(modeLabel),
            );

            const startTime = Date.now();
            let lastDir = "";
            const progressReporter = ({ count, entry }) => {
              const entryDir = entry.isFile
                ? entry.path.substring(0, entry.path.lastIndexOf("/"))
                : entry.path;
              if (entryDir !== lastDir) {
                lastDir = entryDir;
                const shortDir =
                  entryDir.length > 60
                    ? "…" + entryDir.slice(-59)
                    : entryDir;
                spinner.update(
                  count + " entries  " + chalk.dim(shortDir),
                );
              }
            };

            // Try incremental indexing if an existing index is present
            let directoryIndex;
            let incrementalStats;
            if (!argv.force) {
              try {
                const indexPath = getMetaIndexFilePath(dir);
                const existingContent = await loadTextFilePromise(indexPath);
                const existingIndex = existingContent
                  ? loadJSONString(existingContent)
                  : null;

                if (existingIndex && existingIndex.length > 0) {
                  // Also load existing fulltext for incremental updates
                  let existingFullText = null;
                  if (argv.fulltext) {
                    try {
                      const ftPath = getMetaFullTextFilePath(dir);
                      const ftContent = await loadTextFilePromise(ftPath);
                      if (ftContent) {
                        const trimmed = ftContent.trim();
                        if (
                          trimmed.startsWith("{") &&
                          !trimmed.startsWith('{"p"')
                        ) {
                          try {
                            existingFullText = JSON.parse(trimmed);
                          } catch (e) {
                            existingFullText = parseFullTextJsonl(ftContent);
                          }
                        } else {
                          existingFullText = parseFullTextJsonl(ftContent);
                        }
                      }
                    } catch (e) {
                      // No fulltext file yet
                    }
                  }

                  spinner.update(
                    "Incremental indexing (" +
                      existingIndex.length +
                      " existing entries)...",
                  );
                  const result = await createIncrementalIndex(
                    {
                      path: dir,
                      listDirectoryPromise,
                      getFileContentPromise,
                      onProgress: progressReporter,
                      ...(extendedExtraction && { extendedExtraction }),
                    },
                    mode,
                    [],
                    () => true,
                    existingIndex,
                    existingFullText,
                  );
                  directoryIndex = result.index;
                  incrementalStats = result.stats;
                }
              } catch (e) {
                // No existing index — fall through to full
              }
            }

            if (!directoryIndex) {
              directoryIndex = await createIndex(
                {
                  path: dir,
                  listDirectoryPromise,
                  getFileContentPromise,
                  onProgress: progressReporter,
                  ...(extendedExtraction && { extendedExtraction }),
                },
                mode,
              );
            }

            spinner.update(
              "Saving index (" + directoryIndex.length + " entries)...",
            );
            const success = await persistIndex(
              { path: dir, saveTextFilePromise, checkDirExist },
              directoryIndex,
            );
            const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

            if (success) {
              spinner.stop(
                chalk.green(
                  incrementalStats ? "✔ Index updated: " : "✔ Index generated: ",
                ) + dir,
              );

              if (incrementalStats) {
                console.log(
                  chalk.dim(
                    "  incremental: +" +
                      incrementalStats.added +
                      " ~" +
                      incrementalStats.modified +
                      " -" +
                      incrementalStats.deleted +
                      " =" +
                      incrementalStats.unchanged,
                  ),
                );
              }

              // Statistics
              let files = 0;
              let folders = 0;
              let totalSize = 0;
              let totalTokens = 0;
              let filesWithText = 0;
              let totalLinks = 0;
              for (const entry of directoryIndex) {
                if (entry.isFile) {
                  files++;
                  totalSize += entry.size || 0;
                } else {
                  folders++;
                }
                if (entry.textContent) {
                  filesWithText++;
                  totalTokens += entry.textContent.split(" ").length;
                }
                if (entry.links) {
                  totalLinks += entry.links.length;
                }
              }
              console.log(
                chalk.dim("  " + files + " files, " + folders + " folders"),
              );
              console.log(
                chalk.dim("  " + formatBytes(totalSize) + " total size"),
              );
              if (filesWithText > 0) {
                console.log(
                  chalk.dim(
                    "  " +
                      filesWithText +
                      " files with fulltext, " +
                      totalTokens.toLocaleString() +
                      " tokens",
                  ),
                );
              }
              if (totalLinks > 0) {
                console.log(
                  chalk.dim("  " + totalLinks + " links extracted"),
                );
              }
              console.log(chalk.dim("  " + elapsed + "s elapsed"));
            } else {
              spinner.stop(
                chalk.yellow("⚠ Index not persisted: ") + dir,
              );
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

    // ── tag ──────────────────────────────────────────────────────────────────
    .command(
      "tag <paths...>",
      "Add tags to files or folders",
      (yargs) =>
        yargs
          .option("tags", {
            alias: "t",
            type: "array",
            demandOption: true,
            description: "Tags to add",
          })
          .option("method", {
            alias: "m",
            type: "string",
            choices: ["rename", "sidecar"],
            default: "rename",
            description:
              'Tagging method: "rename" embeds tags in filename, "sidecar" writes to .ts/*.json',
          }),
      async (argv) => {
        const nodePath = require("path");
        const paths = require("@tagspaces/tagspaces-common/paths");
        const AppConfig = require("@tagspaces/tagspaces-common/AppConfig");
        const {
          getPropertiesPromise,
          loadTextFilePromise,
          saveTextFilePromise,
          renameFilePromise,
          createDirectoryPromise,
        } = require("@tagspaces/tagspaces-common-node/io-node");

        const newTags = argv.tags
          .map((t) => String(t).trim())
          .filter(Boolean)
          .filter((t) => {
            if (INVALID_TAG_CHARS.test(t)) {
              console.warn(
                chalk.yellow("⚠ Skipping invalid tag: ") + JSON.stringify(t),
              );
              return false;
            }
            return true;
          });
        if (newTags.length === 0) {
          console.error(chalk.red("✖ No valid tags provided."));
          return;
        }

        for (const entryPath of argv.paths) {
          try {
            const absPath = nodePath.resolve(entryPath);
            const props = await getPropertiesPromise(absPath);
            if (!props) {
              console.error(chalk.red("✖ Path not found: ") + absPath);
              continue;
            }

            const isFile = props.isFile;
            const method = isFile ? argv.method : "sidecar";

            if (method === "rename") {
              const existingTags = paths.extractTags(
                absPath,
                AppConfig.tagDelimiter,
              );
              const mergedTags = [...new Set([...existingTags, ...newTags])];
              const fileName = paths.extractFileName(absPath);
              const newFileName = paths.generateFileName(
                fileName,
                mergedTags,
                AppConfig.tagDelimiter,
                nodePath.sep,
                AppConfig.prefixTagContainer,
                true,
              );
              const dirPath = paths.extractContainingDirectoryPath(absPath);
              const newFilePath = dirPath + nodePath.sep + newFileName;

              if (absPath === newFilePath) {
                console.log(chalk.yellow("⚠ Tags already present: ") + absPath);
                continue;
              }

              const destProps = await getPropertiesPromise(newFilePath);
              if (destProps) {
                console.error(
                  chalk.red("✖ Target file already exists: ") + newFilePath,
                );
                continue;
              }

              await renameFilePromise(absPath, newFilePath);
              console.log(
                chalk.green("✔ Tagged (rename): ") +
                  chalk.dim(fileName) +
                  " → " +
                  chalk.bold(newFileName),
              );
            } else {
              const metaFilePath = isFile
                ? paths.getMetaFileLocationForFile(absPath)
                : paths.getMetaFileLocationForDir(absPath);

              const sidecar = await loadSidecarJSON(
                loadTextFilePromise,
                metaFilePath,
              );
              const existingTitles = (sidecar.tags || []).map((t) => t.title);
              const tagsToAdd = newTags.filter(
                (t) => !existingTitles.includes(t),
              );

              if (tagsToAdd.length === 0) {
                console.log(
                  chalk.yellow("⚠ Tags already present in sidecar: ") + absPath,
                );
                continue;
              }

              sidecar.tags = [
                ...(sidecar.tags || []),
                ...tagsToAdd.map((t) => ({ title: t, type: "sidecar" })),
              ];

              await saveSidecarJSON(
                createDirectoryPromise,
                saveTextFilePromise,
                metaFilePath,
                sidecar,
              );
              console.log(
                chalk.green("✔ Tagged (sidecar): ") +
                  absPath +
                  chalk.dim(" +" + tagsToAdd.join(", +")),
              );
            }
          } catch (err) {
            console.error(chalk.red("✖ Error tagging: ") + entryPath);
            console.error(chalk.red(err.message || err));
          }
        }
      },
    )

    // ── describe ─────────────────────────────────────────────────────────────
    .command(
      "describe <paths...>",
      "Set description on files or folders",
      (yargs) =>
        yargs
          .option("description", {
            alias: "d",
            type: "string",
            description:
              'Description text (supports \\n for newlines, use "-" to read from stdin)',
          })
          .option("file", {
            alias: "f",
            type: "string",
            description: "Read description from a file (e.g., description.md)",
          })
          .check((a) => {
            if (!a.description && !a.file) {
              throw new Error(
                "Please provide a description via -d or a file via -f",
              );
            }
            return true;
          }),
      async (argv) => {
        const nodePath = require("path");
        const nodeFs = require("fs");
        const paths = require("@tagspaces/tagspaces-common/paths");
        const {
          getPropertiesPromise,
          loadTextFilePromise,
          saveTextFilePromise,
          createDirectoryPromise,
        } = require("@tagspaces/tagspaces-common-node/io-node");

        let description;

        if (argv.file) {
          // read from file
          const filePath = nodePath.resolve(argv.file);
          try {
            const stat = nodeFs.statSync(filePath);
            if (stat.size > MAX_DESCRIPTION_SIZE) {
              console.error(
                chalk.red("✖ File too large (max 10 MB): ") + filePath,
              );
              return;
            }
            description = nodeFs.readFileSync(filePath, "utf-8");
          } catch (err) {
            console.error(chalk.red("✖ Cannot read file: ") + filePath);
            console.error(chalk.red(err.message));
            return;
          }
        } else if (argv.description === "-") {
          // read from stdin
          try {
            description = nodeFs.readFileSync(0, "utf-8");
            if (description.length > MAX_DESCRIPTION_SIZE) {
              console.error(chalk.red("✖ Stdin input too large (max 10 MB)"));
              return;
            }
          } catch (err) {
            console.error(chalk.red("✖ Cannot read from stdin"));
            console.error(chalk.red(err.message));
            return;
          }
        } else {
          // inline string — convert literal \n sequences to real newlines
          description = argv.description.replace(/\\n/g, "\n");
        }

        for (const entryPath of argv.paths) {
          const absPath = nodePath.resolve(entryPath);

          try {
            const props = await getPropertiesPromise(absPath);
            if (!props) {
              console.error(chalk.red("✖ Path not found: ") + absPath);
              continue;
            }

            const metaFilePath = props.isFile
              ? paths.getMetaFileLocationForFile(absPath)
              : paths.getMetaFileLocationForDir(absPath);

            const sidecar = await loadSidecarJSON(
              loadTextFilePromise,
              metaFilePath,
            );
            sidecar.description = description;

            await saveSidecarJSON(
              createDirectoryPromise,
              saveTextFilePromise,
              metaFilePath,
              sidecar,
            );
            console.log(chalk.green("✔ Description set: ") + absPath);
            const preview =
              description.length > 80
                ? description.substring(0, 80) + "…"
                : description;
            console.log(chalk.dim('  "' + preview.replace(/\n/g, "\\n") + '"'));
          } catch (err) {
            console.error(chalk.red("✖ Error setting description: ") + absPath);
            console.error(chalk.red(err.message || err));
          }
        }
      },
    )

    // ── search ─────────────────────────────────────────────────────────────
    .command(
      "search <dir>",
      "Search a directory's index for matching files",
      (yargs) =>
        yargs
          .option("query", {
            alias: "q",
            type: "string",
            default: "",
            description:
              'Query string. Bare words = fulltext. Prefixes: +tag (AND), -tag (NOT), |tag (OR). e.g. "notes +work -draft |urgent"',
          })
          .option("tags", {
            alias: "t",
            type: "array",
            default: [],
            description: "Tags to match (AND logic, merged with +tag from -q)",
          })
          .option("type", {
            type: "string",
            default: "any",
            description:
              "File type group: any, images, documents, notes, audio, video, archives, bookmarks, ebooks, emails, folders, files, untagged",
          })
          .option("search-type", {
            alias: "s",
            type: "string",
            choices: ["fuzzy", "semistrict", "strict"],
            default: "fuzzy",
            description: "Search accuracy: fuzzy, semistrict, or strict",
          })
          .option("max-results", {
            alias: "n",
            type: "number",
            default: 100,
            description: "Maximum number of results",
          }),
      async (argv) => {
        const nodePath = require("path");
        const AppConfig = require("@tagspaces/tagspaces-common/AppConfig");
        const {
          loadTextFilePromise,
        } = require("@tagspaces/tagspaces-common-node/io-node");
        const {
          getMetaIndexFilePath,
          getMetaFullTextFilePath,
          parseFullTextJsonl,
          mergeFullTextIntoIndex,
        } = require("@tagspaces/tagspaces-indexer");
        const { searchLocationIndex } = require("@tagspaces/tagspaces-search");
        const {
          joinPaths,
        } = require("@tagspaces/tagspaces-common/paths");

        const dir = nodePath.resolve(argv.dir);
        const indexPath = getMetaIndexFilePath(dir);

        try {
          const indexContent = await loadTextFilePromise(indexPath);
          const index = JSON.parse(indexContent);

          if (!index || index.length === 0) {
            console.error(
              chalk.yellow("⚠ No index found. Run ") +
                chalk.cyan("tscmd indexer " + dir) +
                chalk.yellow(" first."),
            );
            return;
          }

          // Parse -q into textQuery + tag filters (+/-/| prefixes)
          const parsed = parseQuery(argv.query);

          // Load fulltext (tsft.jsonl) when a bare-word query is present.
          if (parsed.textQuery && parsed.textQuery.length > 1) {
            try {
              const ftPath = getMetaFullTextFilePath(dir);
              const ftContent = await loadTextFilePromise(ftPath);
              if (ftContent) {
                const trimmed = ftContent.trim();
                let ftMap;
                if (trimmed.startsWith("{") && !trimmed.startsWith('{"p"')) {
                  try {
                    ftMap = JSON.parse(trimmed);
                  } catch (e) {
                    ftMap = parseFullTextJsonl(ftContent);
                  }
                } else {
                  ftMap = parseFullTextJsonl(ftContent);
                }
                if (ftMap) {
                  // Index entries store relative paths (as persisted);
                  // keys match directly — no conversion needed for CLI.
                  mergeFullTextIntoIndex(index, ftMap);
                }
              }
            } catch (e) {
              // No fulltext index — tag/file-type searches still work
            }
          }

          console.log(
            chalk.cyan("  Searching ") + index.length + " entries in: " + dir,
          );

          // Build file types array from type group name
          let fileTypes;
          const typeKey = argv.type.toLowerCase();
          if (typeKey !== "any" && AppConfig.SearchTypeGroups[typeKey]) {
            fileTypes = AppConfig.SearchTypeGroups[typeKey];
          }

          // Merge -t tags (AND) with +tags parsed from -q, dedup by title
          const andTitles = new Set([
            ...argv.tags.map((t) => String(t)),
            ...parsed.tagsAND,
          ]);

          const searchQuery = {
            textQuery: parsed.textQuery,
            tagsAND: [...andTitles].map((title) => ({ title })),
            tagsOR: parsed.tagsOR.map((title) => ({ title })),
            tagsNOT: parsed.tagsNOT.map((title) => ({ title })),
            fileTypes: fileTypes,
            searchType: argv.searchType,
            maxSearchResults: argv.maxResults,
            showUnixHiddenEntries: false,
          };

          const results = await searchLocationIndex(
            index,
            searchQuery,
            AppConfig.tagDelimiter,
          );

          if (results.length === 0) {
            console.log(chalk.yellow("  No results found."));
          } else {
            console.log(
              chalk.green("  Found " + results.length + " result(s):"),
            );
            for (const entry of results) {
              const tags =
                entry.tags && entry.tags.length > 0
                  ? chalk.dim(
                      " [" + entry.tags.map((t) => t.title).join(" ") + "]",
                    )
                  : "";
              const size = entry.isFile
                ? chalk.dim(" (" + formatBytes(entry.size) + ")")
                : chalk.dim(" (dir)");
              console.log("  " + entry.path + tags + size);
            }
          }
        } catch (err) {
          if (err.code === "ENOENT") {
            console.error(
              chalk.yellow("⚠ No index found at ") +
                indexPath +
                chalk.yellow(". Run ") +
                chalk.cyan("tscmd indexer " + dir) +
                chalk.yellow(" first."),
            );
          } else {
            console.error(chalk.red("✖ Error searching: ") + dir);
            console.error(chalk.red(err.message || err));
          }
        }
      },
    )

    .demandCommand(
      1,
      chalk.red(
        "Please specify a command: thumbgen | indexer | metacleaner | tag | describe | search",
      ),
    )
    .strict()
    .help("h")
    .alias("h", "help")
    .epilogue(
      [
        chalk.bold("Quick reference:"),
        "  thumbgen   -p, --pdf          Include PDF thumbnails",
        "  indexer    -f, --fulltext     Extract full-text content (MD, HTML, TXT, PDF)",
        "             -l, --links        Extract links from content (requires --fulltext)",
        "             --force            Force full re-index (skip incremental)",
        "  metacleaner -a, --analyze     Dry-run mode (default: true)",
        "  tag        -t, --tags         Tags to add (space-separated)",
        '             -m, --method       "rename" (default) or "sidecar"',
        "  describe   -d, --description  Description text to set",
        "             -f, --file         Read description from a file",
        "  search     -q, --query        Query; +tag=AND, -tag=NOT, |tag=OR",
        "             -t, --tags         Extra AND tags (merged with +tag in -q)",
        "             --type             File type group (e.g. images, documents)",
        "             -s, --search-type  fuzzy (default), semistrict, or strict",
        "             -n, --max-results  Maximum number of results (default: 100)",
        "",
        "Run " +
          chalk.cyan("tscmd <command> --help") +
          " for full details on a specific command.",
      ].join("\n"),
    )
    .parse();
};
