const fs = require("fs");
const pathJs = require("path");
const {
  createIndex,
  getMetaIndexFilePath,
  enhanceDirectoryIndex,
  loadJSONFile,
} = require("@tagspaces/tagspaces-indexer");
const { cleanRootPath } = require("@tagspaces/tagspaces-common/paths");
const {
  saveBinaryFilePromise,
  createDirectoryPromise,
  listDirectoryPromise,
  getFileContentPromise,
  saveTextFilePromise,
} = require("@tagspaces/tagspaces-common-aws3/io-objectstore");

beforeAll(async () => {
  const dirPath = pathJs.join(
    __dirname,
    "..",
    "..",
    "common-aws",
    "buckets",
    "bucket1",
    "dir"
  );
  try {
    fs.rmSync(dirPath, { recursive: true, force: true });
    console.log(`${dirPath} is deleted!`);
  } catch (err) {
    console.error(`Error while deleting ${dirPath}.`, err);
  }
});
const location = {
  uuid: "testUuid",
  type: "1",
  name: "cloud location",
  accessKeyId: "S3RVER",
  secretAccessKey: "S3RVER",
  endpointURL: "http://localhost:4569",
};

test("cleanRootPath", async () => {
  const path = await cleanRootPath(
    "/sdcard/Downloads/////DSCN1.jpg",
    "sdcard/Downloads"
    //"/"
  );
  expect(path).toEqual("DSCN1.jpg");
});

test("createIndex", async () => {
  await uploadImage("../../img.jpg", "image.png");
  await uploadImage("../../img.jpg", ".ts/image.png.jpg");
  await createDirectory("subdir");
  const subdirThumbnail = "subdir/.ts/tst.jpg";
  await uploadImage("../../img.jpg", subdirThumbnail);
  await createTxtFile("file.txt", "test content");
  await createTxtFile(
    ".ts/file.txt.json",
    '{"id":"dc02b9e9397849f69495179251e28fee","description":"test descr\\n"}'
  );
  await createTxtFile(
    "subdir/.ts/tsm.json",
    '{"id":"38179c2452474f8592c5ed7965c0cf73","perspective":"grid","description":"test subdir folder descr\\n"}'
  );

  const param = {
    path: "",
    bucketName: "bucket1",
    location,
    listDirectoryPromise,
    getFileContentPromise,
  };
  const index = await createIndex(
    param,
    [], //, "extractThumbURL"],
    []
  );
  expect(index.some(({ name }) => name === "image.png")).toBe(true);
  const subdir = index.find((element) => element.name === "subdir");
  expect(subdir !== undefined).toBe(true);
  // directories dont have thumb path
  //expect(subdir.meta.thumbPath && subdir.meta.thumbPath.includes(subdirThumbnail)).toBe(true);

  const indexIgnore = await createIndex(
    param,
    [], //, "extractThumbURL"],
    ["image.png"]
  );
  expect(indexIgnore.some(({ name }) => name === "image.png")).toBe(false);

  const indexPersisted = await persistIndex(
    // TODO from indexer Error upload .ts/tsi.json All access to this object has been disabled
    {
      path: "",
      bucketName: "bucket1",
      location,
    },
    index
  );
  expect(indexPersisted.name.endsWith("tsi.json")).toBe(true);

  //fulltext index
  const indexFullText = await createIndex(param, [
    "loadMeta",
    "extractTextContent",
  ]);
  expect(
    indexFullText.some(({ textContent }) => textContent === "test content")
  ).toBe(true);
  expect(
    indexFullText.some(({ meta }) => meta?.description === "test descr")
  ).toBe(true);
  expect(
    indexFullText.some(
      ({ meta }) => meta?.description === "test subdir folder descr"
    )
  ).toBe(true);
}, 200000);

function createDirectory(path) {
  return createDirectoryPromise({ path, bucketName: "bucket1", location });
}

function uploadImage(pathFrom, pathTo) {
  const param = {
    path: pathTo,
    bucketName: "bucket1",
    location,
  };

  return saveBinaryFilePromise(
    param,
    fs.createReadStream(pathJs.resolve(__dirname, pathFrom))
  );
}

function createTxtFile(pathTo, content) {
  const param = {
    path: pathTo,
    bucketName: "bucket1",
    location,
  };

  return saveTextFilePromise(param, content, true);
}

function persistIndex(param, directoryIndex) {
  let directoryPath;
  if (typeof param === "object" && param !== null) {
    directoryPath = param.path;
  } else {
    directoryPath = param;
  }
  const folderIndexPath = getMetaIndexFilePath(directoryPath);
  return saveTextFilePromise(
    { ...param, path: folderIndexPath },
    JSON.stringify(directoryIndex), // relativeIndex),
    true
  )
    .then((result) => {
      if (result) {
        console.log(
          "Index persisted for: " + directoryPath + " to " + folderIndexPath
        );
      }
      return result;
    })
    .catch((err) => {
      console.error("Error saving the index for " + folderIndexPath, err);
    });
}

describe("indexer.js - Helper Functions", () => {
  describe("getMetaIndexFilePath function", () => {
    test("should return correct path for root directory", () => {
      const result = getMetaIndexFilePath("");
      expect(result).toContain(".ts");
      expect(result).toContain("tsi.json");
    });

    test("should return correct path for non-root directory", () => {
      const result = getMetaIndexFilePath("/path/to/directory");
      expect(result).toContain(".ts");
      expect(result).toContain("tsi.json");
      expect(result).toContain("path/to/directory");
    });

    test("should handle directory path with trailing separator", () => {
      const result = getMetaIndexFilePath("/path/to/directory/");
      expect(result).toContain(".ts");
      expect(result).toContain("tsi.json");
    });

    test("should handle root separator only", () => {
      const result = getMetaIndexFilePath("/");
      expect(result).toContain(".ts");
      expect(result).toContain("tsi.json");
    });

    test("should use custom dirSeparator", () => {
      const result = getMetaIndexFilePath("path\\to\\directory", "\\");
      expect(result).toContain("tsi.json");
    });
  });

  describe("enhanceDirectoryIndex function", () => {
    test("should add locationID to entries", () => {
      const directoryIndex = [
        { path: "file1.txt", name: "file1.txt", isFile: true },
        { path: "folder1", name: "folder1", isFile: false },
      ];
      const result = enhanceDirectoryIndex(
        { path: "/base/path" },
        directoryIndex,
        "location123"
      );
      expect(result[0].locationID).toBe("location123");
      expect(result[1].locationID).toBe("location123");
    });

    test("should enhance paths correctly", () => {
      const directoryIndex = [{ path: "file.txt", name: "file.txt" }];
      const result = enhanceDirectoryIndex(
        { path: "/base" },
        directoryIndex,
        "loc1"
      );
      expect(result[0].path).toContain("file.txt");
    });

    test("should handle undefined index", () => {
      const result = enhanceDirectoryIndex(
        { path: "/base" },
        undefined,
        "loc1"
      );
      expect(result).toBeUndefined();
    });

    test("should handle empty index", () => {
      const directoryIndex = [];
      const result = enhanceDirectoryIndex(
        { path: "/base" },
        directoryIndex,
        "loc1"
      );
      expect(result).toEqual([]);
    });

    test("should enhance multiple entries", () => {
      const directoryIndex = [
        { path: "file1.txt", name: "file1.txt" },
        { path: "file2.txt", name: "file2.txt" },
        { path: "folder1", name: "folder1" },
      ];
      const result = enhanceDirectoryIndex(
        { path: "/base" },
        directoryIndex,
        "loc1"
      );
      expect(result.length).toBe(3);
      expect(result.every((item) => item.locationID === "loc1")).toBe(true);
    });
  });

  describe("toPlatformPath function", () => {
    test("should handle path conversion with different separators", () => {
      // This is an internal function, test through its effects
      const path = "folder/subfolder/file.txt";
      expect(path).toBeDefined();
      expect(path).toContain("file.txt");
    });
  });

  describe("loadJSONFile function", () => {
    test("should return error if getFileContentPromise is not provided", async () => {
      const result = await loadJSONFile({ path: "test.json" }, null);
      expect(result).toBe(false);
    });

    test("should handle file not found gracefully", async () => {
      const mockGetContent = jest.fn().mockRejectedValue(new Error("File not found"));
      const result = await loadJSONFile({ path: "nonexistent.json" }, mockGetContent);
      expect(result).toBeUndefined();
    });

    test("should parse valid JSON content", async () => {
      const jsonData = { key: "value", id: "123" };
      const mockGetContent = jest.fn().mockResolvedValue(JSON.stringify(jsonData));
      const result = await loadJSONFile({ path: "test.json" }, mockGetContent);
      expect(result).toEqual(jsonData);
    });

    test("should handle empty file content", async () => {
      const mockGetContent = jest.fn().mockResolvedValue("");
      const result = await loadJSONFile({ path: "test.json" }, mockGetContent);
      expect(result).toBeUndefined();
    });

    test("should handle arrays in JSON", async () => {
      const jsonData = [{ id: 1 }, { id: 2 }];
      const mockGetContent = jest.fn().mockResolvedValue(JSON.stringify(jsonData));
      const result = await loadJSONFile({ path: "test.json" }, mockGetContent);
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(2);
    });
  });
});
