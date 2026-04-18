# @tagspaces/shell

A command-line tool for managing files and folders compatible with the [TagSpaces](https://www.tagspaces.org) Desktop and Web applications. It can generate search indexes, create thumbnails, clean up obsolete metadata, add tags, set descriptions, and search indexed directories.

## Installation

```bash
npm install -g @tagspaces/shell
```

## Commands

### Search index generation

Creates a search index for a given folder and all of its subfolders.

```bash
tscmd indexer /some/folder
```

The generated index is stored in the `.ts/tsi.json` file inside the target folder. This command is well suited for automation, for example as a cron job.

To also extract full-text content from supported files (Markdown, HTML, TXT, PDF), use the `--fulltext` flag:

```bash
tscmd indexer --fulltext /some/folder
```

Full-text content is stored separately in `.ts/tsft.jsonl`. To additionally extract links from file content, add `--links`:

```bash
tscmd indexer --fulltext --links /some/folder
```

The indexer displays a live progress spinner and prints statistics when finished (file/folder counts, total size, token counts, and elapsed time).

### Thumbnail generation

Recursively creates thumbnails for all supported files in a folder and its subfolders.

Before running this command, install the [sharp](https://sharp.pixelplumbing.com/install) image processing library globally:

```bash
npm install -g sharp
```

Then make sure `NODE_PATH` points to the global `node_modules` directory:

```bash
export NODE_PATH=$(npm root --quiet -g)
```

Run the thumbnail generator:

```bash
tscmd thumbgen /some/folder
```

To include PDF thumbnails, add the `--pdf` flag:

```bash
tscmd thumbgen --pdf /some/folder
```

### Metadata cleanup

Identifies and removes obsolete thumbnails and sidecar files that are no longer associated with any existing file.

First, run a dry-run to review which files would be deleted:

```bash
tscmd metacleaner /some/folder
```

Once you have reviewed the list, perform the actual cleanup by setting `--analyze` to `false`:

```bash
tscmd metacleaner --analyze false /some/folder
```

### Tagging files and folders

Adds one or more tags to files or folders. Two methods are supported for files:

**Rename method** (default) — embeds tags directly in the filename using the `[tag1 tag2]` convention:

```bash
tscmd tag /path/to/file.jpg -t photo summer
```

This renames the file to `file[photo summer].jpg`.

**Sidecar method** — writes tags to a JSON metadata file in the `.ts/` directory, leaving the original filename unchanged:

```bash
tscmd tag /path/to/file.jpg -t photo summer --method sidecar
```

For folders, the sidecar method is always used regardless of the `--method` flag:

```bash
tscmd tag /path/to/folder -t project archive
```

Tags are merged with any existing tags. Duplicates are automatically skipped.

### Setting descriptions

Sets a text description on one or more files or folders. Descriptions are stored in the `.ts/` sidecar JSON file. Three input modes are supported:

**Inline text** — use `\n` for newlines:

```bash
tscmd describe /path/to/file.jpg -d "# Title\n\nA paragraph with **bold** text."
```

**From a file** — read the description from a markdown or text file:

```bash
tscmd describe /path/to/file.jpg -f description.md
```

**From stdin** — pipe content using `-d -`:

```bash
cat description.md | tscmd describe /path/to/file.jpg -d -
```

Multiple paths can be provided to apply the same description to several files or folders at once:

```bash
tscmd describe file1.jpg file2.pdf ./my-folder -d "Shared description"
```

If a sidecar file already exists, the description is updated while preserving all other metadata (tags, ID, etc.).

### Searching an index

Searches a previously generated index for matching files and folders. Requires running `tscmd indexer` first.

**Text query** (fuzzy by default):

```bash
tscmd search /some/folder -q "meeting notes"
```

**Filter by tags** (AND logic):

```bash
tscmd search /some/folder -t project important
```

**Prefix grammar in `-q`** — for OR/NOT filters and mixed fulltext+tag queries, use prefixes inside the query string:

- `+tag` — entry must have this tag (AND)
- `-tag` — entry must **not** have this tag (NOT)
- `|tag` — entry must have at least one of these (OR)
- bare words — fulltext search

```bash
tscmd search /some/folder -q "notes +work -draft |urgent |important"
```

Tags passed via `-t` are merged with any `+tag` tokens parsed from `-q`. Always quote the `-q` value so the shell does not interpret `|` as a pipe or `-tag` as a flag.

**Filter by file type group** (images, documents, notes, audio, video, archives, bookmarks, ebooks, emails, folders, files, untagged):

```bash
tscmd search /some/folder --type images
```

**Search accuracy** — choose between `fuzzy` (default), `semistrict`, or `strict`:

```bash
tscmd search /some/folder -q "report" -s strict
```

**Limit results:**

```bash
tscmd search /some/folder -q "draft" -n 20
```

Options can be combined:

```bash
tscmd search /some/folder -q "budget" -t finance 2024 --type documents -s semistrict -n 50
```

## Usage overview

```
tscmd <command> [options] <paths...>

Commands:
  tscmd thumbgen <dirs...>      Generate thumbnails for files
  tscmd indexer <dirs...>       Create a search index
  tscmd metacleaner <dirs...>   Remove obsolete sidecar files
  tscmd tag <paths...>          Add tags to files or folders
  tscmd describe <paths...>     Set description on files or folders
  tscmd search <dir>            Search an index for matching files

Indexer options:
  -f, --fulltext   Extract full-text content (MD, HTML, TXT, PDF) [boolean] [default: false]
  -l, --links      Extract links from content (requires --fulltext) [boolean] [default: false]

Tag options:
  -t, --tags     Tags to add (space-separated)              [array] [required]
  -m, --method   Tagging method: "rename" or "sidecar"  [string] [default: "rename"]

Describe options:
  -d, --description  Description text (supports \n, use "-" for stdin) [string]
  -f, --file         Read description from a file                      [string]

Search options:
  -q, --query        Text query (fuzzy search)                       [string]
  -t, --tags         Tags to match (AND logic)                       [array]
      --type         File type group (e.g. images, documents)        [string] [default: "any"]
  -s, --search-type  Search accuracy: fuzzy, semistrict, or strict   [string] [default: "fuzzy"]
  -n, --max-results  Maximum number of results                       [number] [default: 100]

Global options:
  -h, --help     Show help
  -v, --version  Show version number
```

## License

MIT
