const fs = require("fs");
const pathJs = require("path");
const {
  createIndex,
  persistIndex: indexerPersistIndex,
  hasIndex,
  loadIndex,
  enhanceDirectoryIndex,
  getMetaIndexFilePath,
  loadJSONFile,
  addToIndex,
  removeFromIndex,
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
  const dirPath = pathJs.resolve(
    __dirname,
    "..",
    "..",
    "__tests__",
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
  await uploadImage("./img.jpg", "image.png");
  await uploadImage("./img.jpg", ".ts/image.png.jpg");
  await createDirectory("subdir");
  const subdirThumbnail = "subdir/.ts/tst.jpg";
  await uploadImage("./img.jpg", subdirThumbnail);
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

    test("should handle invalid JSON gracefully", async () => {
      const mockGetContent = jest.fn().mockResolvedValue("{invalid json}");
      const result = await loadJSONFile({ path: "bad.json" }, mockGetContent);
      expect(result).toBeUndefined();
    });
  });
});

describe("createIndex - error handling", () => {
  test("should reject when listDirectoryPromise is missing", async () => {
    await expect(
      createIndex({ path: "", getFileContentPromise: jest.fn() })
    ).rejects.toThrow("no listDirectoryPromise");
  });

  test("should return empty array for empty directory", async () => {
    const mockListDir = jest.fn().mockResolvedValue([]);
    const index = await createIndex({
      path: "",
      listDirectoryPromise: mockListDir,
    });
    expect(index).toEqual([]);
  });
});

describe("persistIndex (indexer export)", () => {
  test("should return false when saveTextFilePromise is not set", async () => {
    const result = await indexerPersistIndex(
      { path: "/some/dir" },
      [{ name: "file.txt" }]
    );
    expect(result).toBe(false);
  });

  test("should persist index using saveTextFilePromise", async () => {
    const mockSave = jest.fn().mockResolvedValue({ name: "tsi.json" });
    const directoryIndex = [
      { name: "file.txt", path: "file.txt", isFile: true },
    ];
    const result = await indexerPersistIndex(
      { path: "/mydir", saveTextFilePromise: mockSave },
      directoryIndex
    );
    expect(mockSave).toHaveBeenCalledTimes(1);
    // The first arg should contain the tsi.json path
    expect(mockSave.mock.calls[0][0].path).toContain("tsi.json");
    // The second arg should be the stringified index
    expect(mockSave.mock.calls[0][1]).toBe(JSON.stringify(directoryIndex));
    expect(result).toEqual({ name: "tsi.json" });
  });

  test("should handle save errors gracefully", async () => {
    const mockSave = jest.fn().mockRejectedValue(new Error("write failed"));
    const result = await indexerPersistIndex(
      { path: "/mydir", saveTextFilePromise: mockSave },
      []
    );
    expect(result).toBeUndefined();
  });
});

describe("hasIndex", () => {
  test("should return true when index file exists", async () => {
    const mockGetProps = jest.fn().mockResolvedValue({ isFile: true });
    const result = await hasIndex({ path: "/mydir" }, mockGetProps);
    expect(result).toBe(true);
    expect(mockGetProps.mock.calls[0][0].path).toContain("tsi.json");
  });

  test("should return false when index file does not exist", async () => {
    const mockGetProps = jest.fn().mockResolvedValue(false);
    const result = await hasIndex({ path: "/mydir" }, mockGetProps);
    expect(result).toBe(false);
  });

  test("should return false when getPropertiesPromise rejects", async () => {
    const mockGetProps = jest.fn().mockRejectedValue(new Error("not found"));
    const result = await hasIndex({ path: "/mydir" }, mockGetProps);
    expect(result).toBe(false);
  });

  test("should return false when stat is a directory not a file", async () => {
    const mockGetProps = jest.fn().mockResolvedValue({ isFile: false });
    const result = await hasIndex({ path: "/mydir" }, mockGetProps);
    expect(result).toBe(false);
  });

  test("should accept string param", async () => {
    const mockGetProps = jest.fn().mockResolvedValue({ isFile: true });
    const result = await hasIndex("/mydir", mockGetProps);
    expect(result).toBe(true);
  });
});

describe("loadIndex", () => {
  test("should load and enhance index entries", async () => {
    const indexData = [
      { path: "file.txt", name: "file.txt", isFile: true },
      { path: "subdir", name: "subdir", isFile: false },
    ];
    const mockGetContent = jest
      .fn()
      .mockResolvedValue(JSON.stringify(indexData));

    const result = await loadIndex(
      { path: "/base", locationID: "loc1" },
      "/",
      mockGetContent
    );

    expect(result).toHaveLength(2);
    expect(result[0].locationID).toBe("loc1");
    expect(result[1].locationID).toBe("loc1");
    expect(result[0].path).toContain("file.txt");
  });

  test("should return undefined when index file missing", async () => {
    // loadJSONFile catches internally and returns undefined,
    // then enhanceDirectoryIndex(param, undefined, ...) returns undefined
    const mockGetContent = jest
      .fn()
      .mockRejectedValue(new Error("not found"));

    const result = await loadIndex({ path: "/base" }, "/", mockGetContent);
    expect(result).toBeUndefined();
  });

  test("should return undefined on parse error", async () => {
    // loadJSONString returns undefined for invalid JSON,
    // then enhanceDirectoryIndex(param, undefined, ...) returns undefined
    const mockGetContent = jest.fn().mockResolvedValue("not json");
    const result = await loadIndex({ path: "/base" }, "/", mockGetContent);
    expect(result).toBeUndefined();
  });
});

describe("addToIndex", () => {
  test("should return false when getFileContentPromise is missing", async () => {
    const result = await addToIndex({
      path: "/dir/file.txt",
      saveTextFilePromise: jest.fn(),
    });
    expect(result).toBe(false);
  });

  test("should return false when saveTextFilePromise is missing", async () => {
    const result = await addToIndex({
      path: "/dir/file.txt",
      getFileContentPromise: jest.fn(),
    });
    expect(result).toBe(false);
  });

  test("should skip meta folder paths", async () => {
    const result = await addToIndex({
      path: "/dir/.ts/file.json",
      getFileContentPromise: jest.fn(),
      saveTextFilePromise: jest.fn(),
    });
    expect(result).toBe(true);
  });

  test("should add entry to existing index", async () => {
    const existingIndex = [
      { name: "existing.txt", path: "existing.txt", isFile: true },
    ];
    const mockGetContent = jest
      .fn()
      .mockResolvedValue(JSON.stringify(existingIndex));
    const mockSave = jest.fn().mockResolvedValue({ name: "tsi.json" });

    await addToIndex(
      {
        path: "dir/newfile.txt",
        bucketName: "bucket1",
        getFileContentPromise: mockGetContent,
        saveTextFilePromise: mockSave,
      },
      1024,
      "2024-01-15T10:00:00Z"
    );

    expect(mockSave).toHaveBeenCalledTimes(1);
    const savedIndex = JSON.parse(mockSave.mock.calls[0][1]);
    expect(savedIndex).toHaveLength(2);
    expect(savedIndex[1].name).toBe("newfile.txt");
    expect(savedIndex[1].size).toBe(1024);
    expect(savedIndex[1].isFile).toBe(true);
  });

  test("should create new index when none exists", async () => {
    const mockGetContent = jest
      .fn()
      .mockRejectedValue(new Error("not found"));
    const mockSave = jest.fn().mockResolvedValue({ name: "tsi.json" });

    await addToIndex(
      {
        path: "dir/newfile.txt",
        bucketName: "bucket1",
        getFileContentPromise: mockGetContent,
        saveTextFilePromise: mockSave,
      },
      512,
      "2024-01-15T10:00:00Z"
    );

    expect(mockSave).toHaveBeenCalledTimes(1);
    const savedIndex = JSON.parse(mockSave.mock.calls[0][1]);
    expect(savedIndex).toHaveLength(1);
    expect(savedIndex[0].name).toBe("newfile.txt");
  });
});

describe("removeFromIndex", () => {
  test("should return false when getFileContentPromise is missing", async () => {
    const result = await removeFromIndex({
      path: "/dir/file.txt",
      saveTextFilePromise: jest.fn(),
    });
    expect(result).toBe(false);
  });

  test("should return false when saveTextFilePromise is missing", async () => {
    const result = await removeFromIndex({
      path: "/dir/file.txt",
      getFileContentPromise: jest.fn(),
    });
    expect(result).toBe(false);
  });

  test("should skip meta folder paths", async () => {
    const result = await removeFromIndex({
      path: "/dir/.ts/file.json",
      getFileContentPromise: jest.fn(),
      saveTextFilePromise: jest.fn(),
    });
    expect(result).toBe(true);
  });

  test("should remove entry from index", async () => {
    const existingIndex = [
      { name: "file1.txt", path: "dir/file1.txt", isFile: true },
      { name: "file2.txt", path: "dir/file2.txt", isFile: true },
    ];
    const mockGetContent = jest
      .fn()
      .mockResolvedValue(JSON.stringify(existingIndex));
    const mockSave = jest.fn().mockResolvedValue({ name: "tsi.json" });

    await removeFromIndex({
      path: "dir/file1.txt",
      bucketName: "bucket1",
      getFileContentPromise: mockGetContent,
      saveTextFilePromise: mockSave,
    });

    expect(mockSave).toHaveBeenCalledTimes(1);
    const savedIndex = JSON.parse(mockSave.mock.calls[0][1]);
    expect(savedIndex).toHaveLength(1);
    expect(savedIndex[0].name).toBe("file2.txt");
  });

  test("should not persist when entry not found in index", async () => {
    const existingIndex = [
      { name: "file1.txt", path: "dir/file1.txt", isFile: true },
    ];
    const mockGetContent = jest
      .fn()
      .mockResolvedValue(JSON.stringify(existingIndex));
    const mockSave = jest.fn();

    await removeFromIndex({
      path: "dir/nonexistent.txt",
      bucketName: "bucket1",
      getFileContentPromise: mockGetContent,
      saveTextFilePromise: mockSave,
    });

    expect(mockSave).not.toHaveBeenCalled();
  });

  test("should return false when getFileContentPromise rejects", async () => {
    const mockGetContent = jest
      .fn()
      .mockRejectedValue(new Error("read error"));
    const mockSave = jest.fn();

    const result = await removeFromIndex({
      path: "dir/file.txt",
      getFileContentPromise: mockGetContent,
      saveTextFilePromise: mockSave,
    });

    expect(result).toBe(false);
    expect(mockSave).not.toHaveBeenCalled();
  });
});

describe("enhanceDirectoryIndex - additional cases", () => {
  test("should accept string param for directoryPath", () => {
    const directoryIndex = [{ path: "file.txt", name: "file.txt" }];
    const result = enhanceDirectoryIndex("/base", directoryIndex, "loc1");
    expect(result[0].path).toContain("/base");
    expect(result[0].path).toContain("file.txt");
  });

  test("should join directoryPath and entry path correctly", () => {
    const directoryIndex = [
      { path: "subdir/file.txt", name: "file.txt" },
    ];
    const result = enhanceDirectoryIndex(
      { path: "/root" },
      directoryIndex,
      "loc1"
    );
    expect(result[0].path).toContain("/root");
    expect(result[0].path).toContain("subdir/file.txt");
  });

  test("should handle undefined locationID", () => {
    const directoryIndex = [{ path: "file.txt", name: "file.txt" }];
    const result = enhanceDirectoryIndex(
      { path: "/base" },
      directoryIndex,
      undefined
    );
    expect(result[0].locationID).toBeUndefined();
  });
});
