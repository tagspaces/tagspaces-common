### Install

    npm install

> Note: this is npm project don't use yarn to install packages)

### Publishing new version

Execute Lerna's versioning script

    npm run lerna-version

Execute Lerna's publishing script

    npm run lerna-publish

### Testing

    npm run-script test

### module workers Node scripts

To generate thumbnails run script with arguments folders array for example:

`node generatethumbs.js -pdf true /Users/Bob/Pictures/testFolder1 /Users/Bob/Pictures/testFolder2`
