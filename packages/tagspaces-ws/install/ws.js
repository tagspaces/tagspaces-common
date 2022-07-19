#! /usr/bin/env node

const fs = require("fs-extra");
const path = require("path");
const spawn = require("child_process").spawn;
const pkg = require("../package.json");

let platform;

if (process.env.PD_PLATFORM) {
  platform = process.env.PD_PLATFORM;
}

function install(packages, onFinish, extraArgs) {
  const args = ["install"];
  args.push("--no-save");
  args.push("--no-package-lock");
  if (extraArgs) {
    args.push(...extraArgs);
  }
  args.push(...packages);
  const proc = spawn("npm", args);
  proc.on("close", (status) => {
    if (status === 0) {
      console.log("success npm install " + packages);
      onFinish();
    } else {
      onFinish(new Error("'npm " + args + "' failed with status " + status));
    }
  });
}

function dedupe(onFinish) {
  const proc = spawn("npm", ["dedupe"]);
  proc.on("close", (status) => {
    if (status === 0) {
      console.log("success npm dedupe");
      onFinish();
    } else {
      onFinish(new Error("'npm dedupe' failed with status " + status));
    }
  });
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
  const packages = []; //'install'];
  let npmInstall = false;

  for (const dep in dependenciesObj) {
    // eslint-disable-next-line no-prototype-builtins
    if (dependenciesObj.hasOwnProperty(dep)) {
      packages.push(dep.concat("@").concat(dependenciesObj[dep]));
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

  if (npmInstall && packages.length > 0) {
    const args = [];
    if (process.env.TARGET_PLATFORM) {
      args.push("platform=" + process.env.TARGET_PLATFORM);
    }
    install(
      packages,
      function (er) {
        if (er) {
          console.log("err:", er);
        }
        dedupe(function (er) {
          if (er) {
            console.log("err:", er);
          }
        });
      },
      args
    );
  } else {
    console.log(
      "Installing dependencies for " + platform + " are already installed."
    );
  }
} else {
  console.log("No specific dependencies on this platform: " + platform);
  fs.removeSync(path.join(__dirname, "..", "node_modules"));
}
