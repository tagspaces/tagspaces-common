# CLAUDE.md - tagspaces-common

## Project overview

Monorepo of shared libraries for [TagSpaces](https://github.com/nicoth-in/tagspaces), managed with Lerna and npm workspaces. Provides platform-agnostic file I/O, indexing, thumbnail generation, and utility functions consumed by the TagSpaces desktop, mobile, and web apps.

## Tech stack

- **Runtime:** Node.js 22+, npm 9.8.1+ (yarn is disabled)
- **Test framework:** Jest 29
- **Monorepo:** Lerna 9 + npm workspaces (`packages/*`)
- **Code style:** Prettier (run `npm run code-format`)

## Key packages

| Package | Purpose |
|---|---|
| `common` | Core utilities: paths, misc helpers, AppConfig, io-fsclient, utils-io |
| `common-node` | Node.js filesystem I/O (wraps io-fsclient with fs-extra) |
| `common-capacitor` | Mobile I/O via Capacitor 6 (replaces Cordova) |
| `common-cordova` | Legacy mobile I/O (deprecated) |
| `common-aws3` | S3 object store I/O via AWS SDK v3 |
| `indexer` | Directory indexing, search index creation/persistence |
| `tagspaces-ws` | WebSocket server |
| `tagspaces-cli` | CLI tool for thumbnails, indexing, tagging, descriptions |

## Testing

```bash
npm test                  # Run all test suites
npm run test-common       # common package (paths, misc, utils-io, AppConfig)
npm run test-capacitor    # Capacitor I/O (mocked, no device needed)
npm run test-indexer      # Indexer (requires S3 mock server, auto-started)
npm run test-node         # Node.js I/O
npm run test-aws          # S3 object store
npm run test-webdav       # WebDAV (not in default test suite)
```

- Tests live inside their respective packages (e.g., `packages/common/*.test.js`, `packages/indexer/indexer.test.js`, `packages/common-capacitor/io-capacitor.test.js`)
- Some legacy tests remain in `__tests__/` (aws, node, webdav, platforms)
- The indexer and AWS tests auto-start a local S3 mock server (s3rver) via jest `globalSetup`/`globalTeardown`
- Capacitor tests mock all native plugins and run in plain Node.js
- Jest configs: each package with tests has its own `jest.config.js`; legacy configs at root (`jest.config.unit.js`, `jest.config.node.unit.js`, `jest.config.webdav.unit.js`)

## Linking for local development

To test changes in the main TagSpaces app without publishing:

```bash
cd packages/common && npm run link-ts    # Symlinks into ../tagspaces
cd packages/common && npm run unlink-ts  # Removes symlinks
```

## Important conventions

- All I/O platform modules export the same interface (matching the original Cordova API shape)
- `param` arguments can be either a string path or an object `{ path, bucketName, location, ... }`
- `AppConfig.dirSeparator` is `/` on Unix/web/mobile, `\` on Windows
- `AppConfig.metaFolder` is `.ts` - stores thumbnails, metadata JSON, and search indexes
- Index files are `tsi.json`, folder metadata is `tsm.json`, file metadata is `<filename>.json`
- Paths in indexes must be **relative** to the location root (use `cleanRootPath` to strip)
- Link extraction (`misc.extractLinks`) returns typed links: `url` (absolute HTTP), `relative` (local paths), `tslink` (TagSpaces protocol)

## Indexing & search architecture

### Index format

- **`tsi.json`** — JSON array of metadata entries. Always loaded. No `textContent` field.
- **`tsft.jsonl`** — JSONL (one object per line) for fulltext. Lazy-loaded only when a text query is active. Short keys (`p` = relative path, `t` = tokens). `parseFullTextJsonl` skips corrupted lines for resilience.
- **Backward compat**: old `tsi.json` entries with inline `textContent` still work. Old `tsft.json` (JSON object) is auto-detected on load (starts with `{` but not `{"p"`).

### Path conventions (easy to get wrong)

- `tsi.json` stores **relative** paths (stripped via `cleanRootPath`).
- `tsft.jsonl` uses relative paths as keys.
- The renderer's in-memory index has **absolute** paths (after `enhanceDirectoryIndex` joins the location root).
- **Bug pattern**: when merging fulltext into the in-memory index, you must convert tsft keys from relative to absolute first (see `loadFullTextIfNeeded` in the renderer).
- **`persistIndex` normalizes paths**: both the common-package `persistIndex` (indexer.js) and the renderer's own `persistIndex` (LocationIndexContextProvider.tsx) run `cleanRootPath(entry.path, directoryPath)` on every entry before writing. This keeps the on-disk format canonical (relative) regardless of whether the caller hands in already-relative entries (fresh `createIndex` output) or absolute-path entries (enhanced index cached in `index.current`, or entries produced by `addToIndex`/`removeFromIndex`). `cleanRootPath` is a no-op when its second argument isn't a prefix, so the guard is safe for both shapes.
- **Invariant**: anything written to `tsi.json` / `tsft.jsonl` must be relative. If you add a new persist path, either feed it relative entries or apply the same `cleanRootPath` guard — otherwise `enhanceDirectoryIndex` will double-join the root and searches silently miss.

### Incremental indexing

`createIncrementalIndex(param, mode, ignorePatterns, isWalking, existingIndex, existingFullText)` uses a two-pass algorithm:
1. Fast shallow walk with `mode: []` (stat only, no meta/text extraction) to detect added/modified/deleted/unchanged entries via `lmdt` + `size` comparison.
2. Targeted full-mode walk only for added/modified entries.

`createIndex` accepts an optional `onProgress({count, entry})` callback for UI/debug progress — used by the CLI and the renderer.

### `persistIndex` safety guard

Pass `checkDirExist` in `param` to prevent resurrecting deleted directories. `fs-extra`'s `outputFile` silently creates missing parent directories, so persisting an index for a non-existent path would recreate the whole chain. Node-side callers (CLI, WS) should wire `@tagspaces/tagspaces-common-node/io-node.checkDirExist`.

### Text extraction gotchas

- **Data URL stripping order** (in `misc.extractTxtContentAndLinks`): strip data URLs FIRST, THEN do the `<body>` match — the old code did the reverse, so the stripping was a no-op for HTML files with embedded base64 images. The body match must run on the already-cleaned content.
- **Don't `.toLowerCase()` the whole file content** before extraction — `createTextIndex` already lowercases final tokens. Was a ~1.5× slowdown on multi-MB HTML files.
- **Skip text extraction for non-files** (`!eentry.isFile`): `.ts` directory entries used to leak through and cause `EISDIR` errors.
- **File size cap**: `extractTextContentLinks` skips files > 128 MB to avoid `ERR_STRING_TOO_LONG` on huge archives read as text.
- **HTML body regex can return `null`** — always null-check `fileContent.match(BODY_REGEX)` before `[0]`.

### CJK (Chinese/Japanese/Korean) search

`createTextIndex` detects CJK characters (Unicode ranges U+2E80–U+9FFF, U+F900–U+FAFF, U+FF66–U+FF9F) and tokenizes them as **overlapping bigrams** + individual chars, since CJK text has no spaces. `"我喜欢标签"` → `["我喜", "喜欢", "欢标", "标签", "我", "喜", "欢", "标", "签"]`. Without this, Chinese paragraphs produced a single giant unsearchable token.

Fuse.js's `minMatchCharLength` is set to 1 so single-character CJK queries work.

### PDF text extraction (pdf-extraction package)

Uses **pdfjs-dist** (same library as the renderer's viewer). Replaced `pdf2json` in v4.6+ — **2-3× faster** on multi-MB PDFs and produces richer text output.

**Gotchas:**
- **Buffer vs Uint8Array**: Node's `Buffer` extends `Uint8Array`, but pdfjs explicitly rejects Buffer. Check `Buffer.isBuffer(x)` FIRST, then convert via `new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength)`.
- **Webpack rewrites `require.resolve()`** at compile time to a relative string. For the bundled WS, use `path.join(__dirname, "pdf.worker.mjs")` instead.
- **Worker file**: pdfjs spawns a "fake worker" in Node by dynamically importing `pdf.worker.mjs`. In webpack bundles, the worker must be copied next to the bundle — the WS webpack config has an inline `CopyPdfWorkerPlugin` for this.
- **Unhandled rejections**: `loadingTask.promise` can emit rejections even after we handle the main one. Attach a defensive `.catch(() => {})`.
- **Early validation**: check magic bytes (`%PDF-`) before passing to pdfjs, and size cap at 128 MB.

### tagspaces-ws security hardening

- Auth via JWT (`jsonwebtoken`). Key passed via `-k` CLI arg (visible in `ps aux` — consider env var long-term).
- Binds to `127.0.0.1` only.
- **Path validation**: `security.validatePath` rejects `..` sequences and non-string inputs.
- **Body size limit**: 1 MB (see `security.collectBody`). Requests are JSON configs only — no actual file uploads.
- **Prototype pollution guard**: `security.safeJsonParse` strips `__proto__`, `constructor`, `prototype` keys.
- **Error sanitization**: `security.sendError` logs details internally but returns generic messages to the client to avoid leaking paths.
- **No path-exposing logs**: privacy concern since pm2 persists logs to disk. Removed all `console.log(path)` in the hot path.
