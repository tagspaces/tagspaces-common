#!/usr/bin/env node

const yargs = require("yargs");
const { hideBin } = require("yargs/helpers");
const { installDependencies } = require("./index");

console.log("start");
const parser = yargs(hideBin(process.argv))
  .usage("Usage: $0 ../ -p [string] [extra npm arguments: --platform=linux --arch=x64]")
  .option("dedupe", {
    alias: "d",
    type: "boolean",
    default: false,
    description: "Dedupe npm dependencies",
  })
  .option("package", {
    alias: "p",
    type: "string",
    default: "",
    description: "Switch packages installation groups",
  })
  .option("platform", {
    alias: "pl",
    type: "string",
    default: "",
    description: "add --platform as npm argument",
  })
  .option("arch", {
    alias: "a",
    type: "string",
    default: "",
    description: "add --arch as npm argument",
  })
  .help("h")
  .alias("h", "help")
  .fail(false);

async function processInstall() {
  try {
    const argv = await parser.parse();
    //if (argv._.length === 1) {
    const cwd = argv._[0] || process.cwd();
    const args = [];
    if (argv.platform) {
      args.push(`--platform=${argv.platform}`);
    }
    if (argv.arch) {
      args.push(`--arch=${argv.arch}`);
    }
    // const json = require(pkg);
    const success = await installDependencies(
      cwd,
      argv.package,
      args,
      argv.dedupe
    );
    //const sum = (await processValue(argv.x)) + (await processValue(argv.y));
    console.info(`success = ${success}`);
    //}
  } catch (err) {
    console.info(`${err.message}\n ${await parser.getHelp()}`);
  }
}
processInstall().then(() => console.info("finish"));

/*const argv = require("yargs/yargs")(process.argv.slice(2))
    .usage("Usage: $0 -d [boolean] ../package.json")
    .option("dedupe", {
      alias: "d",
      type: "boolean",
      default: false,
      description: "Dedupe npm dependencies",
    })
    .check((a, b) => {
      if (a._.length === 0) {
        throw "please set package.json relative path !";
      }
      return true;
    })
    .help("h")
    .alias("h", "help").argv;
  const pkg = argv._[0];
  const json = require(pkg);
  return await installDependencies(json);*/
