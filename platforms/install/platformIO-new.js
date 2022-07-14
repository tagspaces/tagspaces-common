#! /usr/bin/env node

const fs = require("fs-extra");
const path = require("path");
// const { installDependencies } = require("../../dynamic-packages-loading");
const { installDependencies } = require("@tagspaces/dynamic-packages-loading");

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

async function processInstall() {
  try {
    const cwd = "./";
    // const json = require(pkg);
    const success = await installDependencies(cwd, platform);
    //const sum = (await processValue(argv.x)) + (await processValue(argv.y));
    console.info(`success = ${success}`);
  } catch (err) {
    console.info(`${err.message}\n ${await parser.getHelp()}`);
  }
}
processInstall().then(() => console.info("finish"));
