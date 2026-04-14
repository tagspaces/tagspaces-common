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
| `tagspaces-shell` | Shell utilities |

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
