### Tagspaces Index generation

Run node script:

`node index.js -m indexer /IndexedFolderPath`

### Thumbnail generation

It's need to install [sharp](https://sharp.pixelplumbing.com/install) package globally:

`npm i sharp -g`

Set NODE_PATH environment points to global npm folder:

`export NODE_PATH=$(npm root --quiet -g)`

run node script:

`node index.js /ThumbGenFolderPath`


