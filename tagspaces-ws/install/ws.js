#! /usr/bin/env node

const fs = require("fs-extra");
const path = require("path");
const npm = require("npm");
const pkg = require("../package.json");

let platform;

if (process.env.PD_PLATFORM) {
  platform = process.env.PD_PLATFORM;
}

const dependencies = platform + "Dependencies";
const dependenciesObj = pkg[dependencies];

if (dependenciesObj && Object.keys(dependenciesObj).length) {
  console.log("Installing dependencies for " + platform);
  const npmArgs = []; //'install'];

  for (const dep in dependenciesObj) {
    // eslint-disable-next-line no-prototype-builtins
    if (dependenciesObj.hasOwnProperty(dep)) {
      if (!fs.existsSync(path.join(__dirname, "..", "node_modules", dep))) {
        npmArgs.push(dep.concat("@").concat(dependenciesObj[dep]));
      }
    }
  }
  // npmArgs.push('--no-save --force');
  if (npmArgs.length > 0) {
    npm.load(function (er) {
      if (er) {
        console.log("err:", er);
        return; // handlError(er)
      }
      // npm.config.set('no-save', true);
      // npm.config.set('no-package-lock', true);
      npm.commands.install(npmArgs, function (er, data) {
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
