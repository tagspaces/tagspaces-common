const pathLib = require("path");
const utilsIO = require("../../../common/utils-io");
const { listDirectoryPromise } = require("../../../common-node/io-node");

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
    expect(entries.length).toBe(35);
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
    expect(enhancedEntries.length).toBe(35);

    expect(enhancedEntries[0].name).toBe("empty_folder");
    expect(enhancedEntries[0].isFile).toBe(false);

    expect(enhancedEntries[34].name).toBe("sample_exif[iptc].jpg");
    expect(enhancedEntries[34].isFile).toBe(true);
    expect(enhancedEntries[34].tags).toEqual([
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
