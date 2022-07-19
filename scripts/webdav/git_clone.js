// const path = require("path");
// const fs = require("fs");
const spawn = require("child_process").spawn;

function clone(repo, target, onSuccess) {
  // const target = path.resolve(__dirname, "..", targetPath);
  /*const exists = fs.existsSync(target);

  if (exists) {
    fs.rmSync(target, { recursive: true, force: true });
  }*/
  const args = ["clone"];
  args.push("--depth", "1");
  args.push("--", repo, target);
  const proc = spawn("git", args);
  proc.on("close", (status) => {
    if (status === 0) {
      console.log("success clone " + repo);
      onSuccess(target);
    } else {
      console.error("'git " + args + "' failed with status " + status);
    }
  });
}

function clonePromise(repo, targetPath) {
  return new Promise((resolve, reject) => {
    clone(repo, targetPath, (path) => {
      resolve(path);
    });
  }).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { clone, clonePromise };
