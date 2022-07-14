const spawn = require("child_process").spawn;

function isInstalled(pkg, onFinish, cwd = ".") {
  const npm = spawn("npm", ["list", pkg], {
    cwd: cwd,
  });
  npm.stdout.on("data", function (data) {
    if (data.toString().indexOf(pkg) > -1) {
      onFinish(true);
    }
  });
  npm.on("close", (code) => onFinish(false));
}

function isInstalledPromise(pkg, cwd = ".") {
  return new Promise((resolve) => {
    isInstalled(
      pkg,
      (installed) => {
        resolve(installed);
      },
      cwd
    );
  });
}

function install(packages, onFinish, extraArgs, cwd = ".") {
  const args = ["install"];
  args.push("--no-save");
  args.push("--no-package-lock");
  if (extraArgs) {
    args.push(...extraArgs);
  }
  args.push(...packages);
  const proc = spawn("npm", args, {
    cwd: cwd,
  });
  proc.on("close", (status) => {
    if (status === 0) {
      console.log("success npm install " + packages);
      onFinish();
    } else {
      onFinish(new Error("'npm " + args + "' failed with status " + status));
    }
  });
}

function dedupe(onFinish, cwd = ".") {
  const proc = spawn("npm", ["dedupe"], {
    cwd: cwd,
  });
  proc.on("close", (status) => {
    if (status === 0) {
      console.log("success npm dedupe");
      onFinish();
    } else {
      onFinish(new Error("'npm dedupe' failed with status " + status));
    }
  });
}

function getPackageJsonPromise(cwd = ".") {
  return new Promise((resolve) => {
    const proc = spawn("npm", ["pkg", "get"], {
      cwd: cwd,
    });
    proc.stdout.on("data", function (data) {
      const pkg = data.toString();
      resolve(JSON.parse(pkg));
    });
  });
}

/**
 * @param cwd working dir of the package.json file
 * @param platform
 * @param deduplicate = true -> run npm dedupe after installing packages
 */
function installDependencies(cwd, platform, deduplicate = false) {
  return new Promise(async (resolve, reject) => {
    const packageJson = await getPackageJsonPromise(cwd); // packageJson ||
    if (!platform) {
      platform = process.env.PD_PLATFORM || "";
    }

    const dependencies = platform + "Dependencies";
    const dependenciesObj = packageJson[dependencies];

    if (dependenciesObj && Object.keys(dependenciesObj).length) {
      console.log("Installing dependencies for " + platform);
      const packages = [];
      let npmInstall = false;

      for (const dep in dependenciesObj) {
        // eslint-disable-next-line no-prototype-builtins
        if (dependenciesObj.hasOwnProperty(dep)) {
          const pkg = dep + "@" + dependenciesObj[dep];
          packages.push(pkg);
          if (!npmInstall && !(await isInstalledPromise(pkg, cwd))) {
            npmInstall = true;
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
              reject(er);
            } else {
              if (deduplicate) {
                dedupe(function (er) {
                  if (er) {
                    console.log("err:", er);
                    reject(er);
                  } else {
                    resolve(true);
                  }
                }, cwd);
              } else {
                resolve(true);
              }
            }
          },
          args,
          cwd
        );
      } else {
        console.log(
          "Installing dependencies for " + platform + " are already installed."
        );
        resolve(false);
      }
    } else {
      console.log("No specific dependencies on this platform: " + platform);
      resolve(false);
      // fs.removeSync(path.join(__dirname, "..", "node_modules"));
    }
  });
}

module.exports = {
  installDependencies,
};
