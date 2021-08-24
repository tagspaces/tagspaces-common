#! /usr/bin/env node

const fs = require("fs-extra");
const path = require("path");
// const spawn = require('cross-spawn');
const npm = require("npm");
const pkg = require("../package.json");

let platform; // = os.platform();

if (process.env.PD_PLATFORM) {
  platform = process.env.PD_PLATFORM;
}

// const manager = new PluginManager({ pluginsPath: "./node_modules" }); // cwd: path.join(__dirname, '..', '..')

/*if (platform === "node") {
  yarn.add(['jsonwebtoken', 'tagspaces-workers']).then((success) => {
    console.log("Install " + platform + ":" + success);
  });
} else {
  fs.removeSync(path.join(__dirname, "..", "node_modules"));
}*/

// Build arguments for npm
const dependencies = platform + "Dependencies";
const dependenciesObj = pkg[dependencies];
const options = {
  stdio: "inherit", // feed all child process logging into parent process
  cwd: path.join(__dirname, "..", ".."),
};

if (dependenciesObj && Object.keys(dependenciesObj).length) {
  console.log("Installing dependencies for " + platform);
  const npmArgs = []; //'install'];

  for (const dep in dependenciesObj) {
    // eslint-disable-next-line no-prototype-builtins
    if (dependenciesObj.hasOwnProperty(dep)) {
      npmArgs.push(dep.concat("@").concat(dependenciesObj[dep]));
    }
  }
  // npmArgs.push('--no-save --force');

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
      // command succeeded, and data might have some info
    });
    npm.on("log", function (message) {
      console.log("npm:" + message);
    });
  });

  // spawn.sync('npm', npmArgs, options);
  /*if (platform === 'node') {
    fs.renameSync(
        path.join(__dirname, '..', 'node_modules', 'tagspaces-common-node'),
        path.join(__dirname, '..', 'node_modules', 'tagspaces-common-io')
    );
  } else if (platform === 'web') {
    fs.renameSync(
        path.join(__dirname, '..', 'node_modules', 'tagspaces-common-aws'),
        path.join(__dirname, '..', 'node_modules', 'tagspaces-common-io')
    );
  }*/
} else {
  console.log("No specific dependencies on this platform: " + platform);
  fs.removeSync(path.join(__dirname, "..", "node_modules"));
  // spawn.sync('npm', 'ci', options);
}
