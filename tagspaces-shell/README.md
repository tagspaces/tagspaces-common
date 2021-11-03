This is a set of command line tools which can create search index and thumbnails for folders used in the TagSpaces Desktop and Web apps.

## Installation

    npm install -global @tagspaces/shell

## Search index generation

This tool will create a search index for a given folder with all its sub folders.

Run node script:

    tscmd -m indexer /some/folder/

This command can be used for automation e.g. in CRON jobs.

## Thumbnail generation

This script will recursively create thumbnails for a specified folder with all its sub folders.

It's need to install [sharp](https://sharp.pixelplumbing.com/install) package globally:

    npm i sharp -g

Set NODE_PATH environment points to global npm folder:

    export NODE_PATH=$(npm root --quiet -g)

run node script:

Run node script:

    tscmd -m thumbgen /some/folder/

This command can be used for automation e.g. in CRON jobs.
Don't forget to put the trailing slash after the folder name.
