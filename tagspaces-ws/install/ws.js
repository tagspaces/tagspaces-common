#! /usr/bin/env node

const fs = require("fs-extra");
const path = require("path");
const npm = require("npm");
const pkg = require("../package.json");

let platform;

if (process.env.PD_PLATFORM) {
  platform = process.env.PD_PLATFORM;
}

/*function checkSharpPlatform(targetPlatform, arch) {
  try {
    let shrapPath = require.resolve("sharp");
    shrapPath = path.join(
      shrapPath,
      "..",
      "..",
      "vendor",
      "8.10.5",
      "platform.json"
    );
    if (!fs.existsSync(shrapPath)) {
      return false;
    }
    const data = fs.readFileSync(shrapPath, "utf8");
    return data === '"' + targetPlatform + "-" + arch + '"';
  } catch (e) {
    return false;
  }
}

if (process.env.TARGET_PLATFORM && process.env.TARGET_ARCH) {
  process.argv.push("--platform=" + process.env.TARGET_PLATFORM);
  process.argv.push("--arch=" + process.env.TARGET_ARCH);
  if (
    !checkSharpPlatform(process.env.TARGET_PLATFORM, process.env.TARGET_ARCH)
  ) {
    fs.removeSync(path.join(__dirname, "..", "node_modules"));
  }
}*/

const dependencies = platform + "Dependencies";
const dependenciesObj = pkg[dependencies];

if (dependenciesObj && Object.keys(dependenciesObj).length) {
  console.log("Installing dependencies for " + platform);
  const npmArgs = []; //'install'];
  let npmInstall = false;

  for (const dep in dependenciesObj) {
    // eslint-disable-next-line no-prototype-builtins
    if (dependenciesObj.hasOwnProperty(dep)) {
      npmArgs.push(dep.concat("@").concat(dependenciesObj[dep]));
      const packagePath = path.join(__dirname, "..", "node_modules", dep);
      if (!fs.existsSync(packagePath)) {
        npmInstall = true;
      } else {
        const packageJson = require(path.join(packagePath, "package.json"));
        const cleanVersion = dependenciesObj[dep].startsWith("^")
          ? dependenciesObj[dep].substr(1)
          : dependenciesObj[dep];
        if (packageJson.version !== cleanVersion) {
          npmInstall = true;
        }
      }
    }
  }
  // npmArgs.push('--no-save --force');
  if (npmInstall && npmArgs.length > 0) {
    npm.load(function (er) {
      if (er) {
        console.log("err:", er);
        return; // handlError(er)
      }
      npm.config.set("save", false);
      npm.config.set("package-lock", false);
      if (process.env.TARGET_PLATFORM) {
        npm.config.set("platform", process.env.TARGET_PLATFORM);
      }
      // npm.config.set('no-save', true);
      // npm.config.set('no-package-lock', true);
      npm.commands.install(npmArgs, function (er, data) {
        if (er) {
          console.log("err:", er);
        }
        npm.commands.dedupe([], function (er) {
          if (er) {
            console.log("err:", er);
          }
        });
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
