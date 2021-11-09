const IO_NODE = require("@tagspaces/tagspaces-common-node/io-node");
const IO_ELECTRON = require("@tagspaces/tagspaces-common-electron/io-electron");

module.exports = { ...IO_NODE, ...IO_ELECTRON };
