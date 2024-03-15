const fs = require("fs-extra");
const pathLib = require("path");
const utilsIO = require("@tagspaces/tagspaces-common/utils-io");
const {
  listDirectoryPromise,
} = require("@tagspaces/tagspaces-common-node/io-node");

describe("Common utils-io unit tests", () => {
  test("walkDirectory", async () => {
    const dir = pathLib.join(
      __dirname,
      "..",
      "..",
      "..",
      "scripts",
      "testdata",
      "file-structure",
      "supported-filestypes"
    );
    const entries = await utilsIO.walkDirectory(dir, listDirectoryPromise);
    // try {
    const files = fs.readdirSync(dir);
    expect(entries.length).toBe(files.length);
    /*} catch (err) {
      console.error('Error reading directory:', err);
    }*/
  });

  test("enhanceEntry", async () => {
    const dir = pathLib.join(
      __dirname,
      "..",
      "..",
      "..",
      "scripts",
      "testdata",
      "file-structure",
      "supported-filestypes"
    );
    const entries = await utilsIO.walkDirectory(dir, listDirectoryPromise);
    const enhancedEntries = entries.map(utilsIO.enhanceEntry);
    const files = fs.readdirSync(dir);
    expect(enhancedEntries.length).toBe(files.length);

    expect(enhancedEntries[1].name).toBe("empty_folder");
    expect(enhancedEntries[1].isFile).toBe(false);

    const lastEntry = enhancedEntries[enhancedEntries.length - 1];
    expect(lastEntry.name).toBe("sample_exif[iptc].jpg");
    expect(lastEntry.isFile).toBe(true);
    expect(lastEntry.tags).toEqual([
      {
        title: "iptc",
        type: "plain",
      },
    ]);
  });
  test("loadJSONString", async () => {
    //TODO
  });
});
