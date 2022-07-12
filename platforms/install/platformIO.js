#! /usr/bin/env node

const fs = require("fs-extra");
const path = require("path");
const spawn = require("child_process").spawn;
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

function install(packages, onFinish) {
  const args = ["install"];
  args.push("--no-save");
  args.push("--no-package-lock");
  args.push(...packages);
  const proc = spawn("npm", args);
  proc.on("close", (status) => {
    if (status === 0) {
      console.log("success npm install " + packages);
      onFinish();
    } else {
      onFinish(
        new Error("'npm " + args + "' failed with status " + status)
      );
    }
  });
}

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

  if (packages.length > 0) {
    fs.removeSync(path.join(__dirname, "..", "node_modules"));
    install(packages, function (er) {
      if (er) {
        console.log("Install error:", er);
      }
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
