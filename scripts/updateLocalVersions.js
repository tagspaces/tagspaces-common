const path = require("path");
const { getPackages } = require("@lerna/project");
const lerna = require("../lerna.json");

const packagesDir = path.resolve(__dirname, "..", "packages");
const dynamicDependencies = ["node", "web", "aws", "cordova", "electron"];
getPackages(packagesDir).then(async (packages) => {
  if (packages.length === 0) {
    console.log("No packages found");
    return;
  }
  const packageVersions = packages.reduce(
    (obj, pkg) => ({ ...obj, [pkg.name]: pkg.version }),
    {}
  );

  for (const pkg of packages) {
    let packageChanged = false;

    for (const dep of dynamicDependencies) {
      const depGroup = pkg.get(dep + "Dependencies");
      if (depGroup) {
        Object.keys(depGroup).forEach(function (key) {
          const localVersion = packageVersions[key];
          if (localVersion && depGroup[key] !== localVersion) {
            depGroup[key] = localVersion;
            packageChanged = true;
          }
        });
      }
    }
    if (packageChanged) {
      console.log(`Package changed: ${pkg.name}`);
      pkg.version = lerna.version;
      // Write changes to disk
      await pkg.serialize();
    } /*else {
      console.log("No package changed");
    }*/
  }
});
