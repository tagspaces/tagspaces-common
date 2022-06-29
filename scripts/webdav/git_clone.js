const path = require("path");
const fs = require("fs");
const spawn = require("child_process").spawn;

module.exports = function clone(repo, targetPath, onSuccess) {
  const target = path.resolve(__dirname, "..", targetPath);
  const exists = fs.existsSync(target);

  if (exists) {
    fs.rmSync(target, { recursive: true, force: true });
    /*console.log(`${targetPath} already exists, git restore HEAD`);
    args.push("restore");
    args.push("--source=HEAD");
    args.push("--staged", "--worktree");
    args.push("--", target+"/testdata/file-structure/supported-filestypes");*/
  }
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
};
