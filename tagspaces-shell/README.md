This is a set of command line tools which can create search index and thumbnails for folders used in the TagSpaces Desktop and Web apps.

## Search index generation

This tool will create a search index for a given folder with all its sub folders.

Run node script:

    npm run gen-index /some/folder/

This will internally call:

    node build/tsshell.js -m indexer /some/folder/

Which can be used for automation e.g. in CRON jobs

## Thumbnail generation

This script will recursively create thumbnails for a specified folder with all its sub folders.

It's need to install [sharp](https://sharp.pixelplumbing.com/install) package globally:

    npm i sharp -g

Set NODE_PATH environment points to global npm folder:

    export NODE_PATH=$(npm root --quiet -g)

run node script:

Run node script:

    npm run gen-thumbnails /some/folder/

This will internally call:

    node build/tsshell.js -m thumbgen /some/folder/

Which can be used for automation e.g. in CRON jobs
