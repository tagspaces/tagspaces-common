#! /usr/bin/env node

const fs = require("fs-extra");
const path = require("path");
const { PluginManager } = require("live-plugin-manager");

let platform; // = os.platform();

if (process.env.PD_PLATFORM) {
  platform = process.env.PD_PLATFORM;
}

const manager = new PluginManager({ pluginsPath: "./node_modules" }); // cwd: path.join(__dirname, '..', '..')

if (platform === "node") {
  /*fs.writeFileSync(
      path.join(__dirname, '..', 'test.txt'),
      'test node'+platform
    );*/

  fs.copySync(
    path.join(__dirname, "index-node.js"),
    path.join(__dirname, "..", "index.js")
  );
  fs.removeSync(
    path.join(__dirname, "..", "node_modules", "tagspaces-common-aws")
  );
  manager.uninstall("tagspaces-common-aws").then((success) => {
    console.log("Uninstall AWS:" + success);

    manager.install("tagspaces-common-node").then((success) => {
      console.log("Install " + platform + ":" + success);
    });
  });
} else if (platform === "web") {
  /*fs.writeFileSync(
        path.join(__dirname, '..', 'test.txt'),
        'test web'+platform
    );*/
  fs.copySync(
    path.join(__dirname, "index-web.js"),
    path.join(__dirname, "..", "index.js")
  );
  fs.removeSync(
    path.join(__dirname, "..", "node_modules", "tagspaces-common-node")
  );
  manager.uninstall("tagspaces-common-node").then((success) => {
    console.log("Uninstall Node:" + success);
    manager.install("tagspaces-common-aws").then((success) => {
      console.log("Install " + platform + ":" + success);
    });
  });
} else {
  manager.uninstallAll().then(() => {
    console.log("Uninstall All");
  });
  /*fs.writeFileSync(
        path.join(__dirname, '..', 'test.txt'),
        'no platform:'+platform
    );*/
}
