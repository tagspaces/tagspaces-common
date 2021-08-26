#! /usr/bin/env node

const fs = require("fs-extra");
const path = require("path");
const npm = require("npm");
const pkg = require("../package.json");

let platform; // = os.platform();

if (process.env.PD_PLATFORM) {
  platform = process.env.PD_PLATFORM;
  fs.copySync(
    path.join(__dirname, "index-" + platform + ".js"),
    path.join(__dirname, "..", "index.js")
  );
} else {
  fs.removeSync(path.join(__dirname, "..", "index.js"));
}

const dependencies = platform + "Dependencies";
const dependenciesObj = pkg[dependencies];

if (dependenciesObj && Object.keys(dependenciesObj).length) {
  console.log("Installing dependencies for " + platform);
  const packages = [];

  for (const dep in dependenciesObj) {
    // eslint-disable-next-line no-prototype-builtins
    if (dependenciesObj.hasOwnProperty(dep)) {
      if (!fs.existsSync(path.join(__dirname, "..", "node_modules", dep))) {
        packages.push(dep.concat("@").concat(dependenciesObj[dep]));
      }
    }
  }
  // npmArgs.push('--no-save --force');
  if (packages.length > 0) {
    fs.removeSync(path.join(__dirname, "..", "node_modules"));

    npm.load(function (er) {
      if (er) {
        console.log("err:", er);
        return; // handlError(er)
      }
      // npm.config.set('no-save', true);
      // npm.config.set('no-package-lock', true);
      npm.commands.install(packages, function (er, data) {
        if (er) {
          console.log("err:", er);
        }
      });
      npm.on("log", function (message) {
        console.log("npm:" + message);
      });
    });
  } else {
    console.log(
      "Installing dependencies for " + platform + " are already installed."
    );
  }
} else {
  console.log("No specific dependencies on this platform: " + platform);
  fs.removeSync(path.join(__dirname, "..", "node_modules"));
}
