/**
 * Tests for TagSpaces Capacitor IO implementation
 *
 * Since Capacitor plugins require native bridges, we mock all Capacitor APIs
 * and test the logic of io-capacitor.js in isolation.
 */

// --- Mock setup ---

const mockFilesystem = {
  readdir: jest.fn(),
  readFile: jest.fn(),
  writeFile: jest.fn(),
  stat: jest.fn(),
  mkdir: jest.fn(),
  copy: jest.fn(),
  rename: jest.fn(),
  deleteFile: jest.fn(),
  rmdir: jest.fn(),
};

const mockApp = {
  addListener: jest.fn(),
  exitApp: jest.fn(),
};

const mockDevice = {};

const mockBrowser = {
  open: jest.fn().mockResolvedValue(undefined),
};

const mockShare = {
  share: jest.fn().mockResolvedValue(undefined),
};

const mockSplashScreen = {
  hide: jest.fn(),
};

const mockFilePicker = {
  pickDirectory: jest.fn(),
};

const mockFileOpener = {
  open: jest.fn().mockResolvedValue(undefined),
};

const mockStoragePermission = {
  checkPermission: jest.fn().mockResolvedValue({ granted: true }),
  requestPermission: jest.fn().mockResolvedValue(undefined),
};

const mockIntentHandler = {
  getIntent: jest.fn().mockResolvedValue({}),
  addListener: jest.fn(),
};

let mockPlatform = "android";

jest.mock("@capacitor/core", () => ({
  Capacitor: {
    getPlatform: () => mockPlatform,
    isNativePlatform: () => false, // Prevent auto-initialization
  },
  registerPlugin: (name) => {
    if (name === "StoragePermission") return mockStoragePermission;
    if (name === "IntentHandler") return mockIntentHandler;
    return {};
  },
}));

jest.mock("@capacitor/filesystem", () => ({
  Filesystem: mockFilesystem,
  Directory: {
    Documents: "DOCUMENTS",
    ExternalStorage: "EXTERNAL_STORAGE",
    Data: "DATA",
  },
  Encoding: {
    UTF8: "utf8",
  },
}));

jest.mock("@capacitor/app", () => ({ App: mockApp }));
jest.mock("@capacitor/device", () => ({ Device: mockDevice }));
jest.mock("@capacitor/browser", () => ({ Browser: mockBrowser }));
jest.mock("@capacitor/share", () => ({ Share: mockShare }));
jest.mock("@capacitor/splash-screen", () => ({
  SplashScreen: mockSplashScreen,
}));
jest.mock("@capacitor-community/file-opener", () => ({
  FileOpener: mockFileOpener,
}));
jest.mock("@capawesome/capacitor-file-picker", () => ({
  FilePicker: mockFilePicker,
}));

// --- Load module under test ---

const io = require("./io-capacitor");

// --- Helpers ---

function resetMocks() {
  Object.values(mockFilesystem).forEach((fn) => fn.mockReset());
  mockApp.exitApp.mockReset();
  mockBrowser.open.mockReset().mockResolvedValue(undefined);
  mockShare.share.mockReset().mockResolvedValue(undefined);
  mockFileOpener.open.mockReset().mockResolvedValue(undefined);
  mockFilePicker.pickDirectory.mockReset();
}

beforeEach(() => {
  resetMocks();
  mockPlatform = "android";
});

// ============================================================
// resolveCapacitorPath (tested indirectly via exported functions)
// ============================================================

describe("path resolution (Android)", () => {
  test("getPropertiesPromise resolves /sdcard/ paths", async () => {
    mockFilesystem.stat.mockResolvedValue({
      type: "file",
      size: 1024,
      mtime: 1700000000000,
    });

    const result = await io.getPropertiesPromise("/sdcard/Documents/test.txt");

    expect(mockFilesystem.stat).toHaveBeenCalledWith({
      path: "Documents/test.txt",
      directory: "EXTERNAL_STORAGE",
    });
    expect(result).toEqual({
      path: "/sdcard/Documents/test.txt",
      size: 1024,
      lmdt: 1700000000000,
      isFile: true,
      name: "test.txt",
    });
  });

  test("resolves /storage/emulated/0/ paths", async () => {
    mockFilesystem.stat.mockResolvedValue({
      type: "file",
      size: 512,
      mtime: 1700000000000,
    });

    await io.getPropertiesPromise("/storage/emulated/0/Download/file.pdf");

    expect(mockFilesystem.stat).toHaveBeenCalledWith({
      path: "Download/file.pdf",
      directory: "EXTERNAL_STORAGE",
    });
  });

  test("resolves sdcard/ (no leading slash) paths", async () => {
    mockFilesystem.stat.mockResolvedValue({
      type: "file",
      size: 256,
      mtime: 1700000000000,
    });

    await io.getPropertiesPromise("sdcard/Pictures/photo.jpg");

    expect(mockFilesystem.stat).toHaveBeenCalledWith({
      path: "Pictures/photo.jpg",
      directory: "EXTERNAL_STORAGE",
    });
  });

  test("resolves root sdcard path to '.'", async () => {
    mockFilesystem.readdir.mockResolvedValue({ files: [] });

    await io.getDirSystemPromise("/sdcard/");

    expect(mockFilesystem.readdir).toHaveBeenCalledWith({
      path: ".",
      directory: "EXTERNAL_STORAGE",
    });
  });
});

describe("path resolution (iOS)", () => {
  beforeEach(() => {
    mockPlatform = "ios";
  });

  test("resolves absolute iOS paths to Documents-relative", async () => {
    mockFilesystem.stat.mockResolvedValue({
      type: "file",
      size: 100,
      mtime: 1700000000000,
    });

    await io.getPropertiesPromise("/myFolder/test.txt");

    expect(mockFilesystem.stat).toHaveBeenCalledWith({
      path: "myFolder/test.txt",
      directory: "DOCUMENTS",
    });
  });

  test("resolves root path to '.'", async () => {
    mockFilesystem.readdir.mockResolvedValue({ files: [] });

    await io.getDirSystemPromise("/");

    expect(mockFilesystem.readdir).toHaveBeenCalledWith({
      path: ".",
      directory: "DOCUMENTS",
    });
  });
});

// ============================================================
// normalizePath
// ============================================================

describe("normalizePath", () => {
  test("removes double slashes", () => {
    expect(io.normalizePath("sdcard//Documents//file.txt")).toBe(
      "sdcard/Documents/file.txt"
    );
  });

  test("returns null/undefined as-is", () => {
    expect(io.normalizePath(null)).toBeNull();
    expect(io.normalizePath(undefined)).toBeUndefined();
  });

  test("leaves clean paths unchanged", () => {
    expect(io.normalizePath("sdcard/test/file.txt")).toBe(
      "sdcard/test/file.txt"
    );
  });
});

// ============================================================
// getDevicePaths
// ============================================================

describe("getDevicePaths", () => {
  test("returns Android paths", async () => {
    mockPlatform = "android";
    const paths = await io.getDevicePaths();
    expect(paths).toHaveProperty("SDCard", "sdcard/");
    expect(paths).toHaveProperty("Download", "sdcard/Download/");
    expect(paths).toHaveProperty("Photos", "sdcard/DCIM/");
    expect(paths).toHaveProperty("Pictures", "sdcard/Pictures/");
    expect(paths).toHaveProperty("Music", "sdcard/Music/");
    expect(paths).toHaveProperty("Movies", "sdcard/Movies/");
  });

  test("returns iOS paths", async () => {
    mockPlatform = "ios";
    const paths = await io.getDevicePaths();
    expect(paths).toHaveProperty("Documents", "/");
    expect(Object.keys(paths).length).toBe(1);
  });
});

// ============================================================
// Settings
// ============================================================

describe("settings", () => {
  test("saveSettingsFile writes JSON to Data directory", () => {
    mockFilesystem.writeFile.mockResolvedValue(undefined);
    io.saveSettingsFile("settings.json", { theme: "dark" });

    expect(mockFilesystem.writeFile).toHaveBeenCalledWith({
      path: "settings.json",
      data: '{"theme":"dark"}',
      directory: "DATA",
      encoding: "utf8",
    });
  });

  test("saveSettingsFile writes string data directly", () => {
    mockFilesystem.writeFile.mockResolvedValue(undefined);
    io.saveSettingsFile("settings.json", "raw string");

    expect(mockFilesystem.writeFile).toHaveBeenCalledWith({
      path: "settings.json",
      data: "raw string",
      directory: "DATA",
      encoding: "utf8",
    });
  });

  test("loadSettingsFile reads from Data directory", (done) => {
    mockFilesystem.readFile.mockResolvedValue({
      data: '{"theme":"dark"}',
    });

    io.loadSettingsFile("settings.json", (result) => {
      expect(result).toBe('{"theme":"dark"}');
      done();
    });
  });

  test("loadSettingsFile returns null for missing file", (done) => {
    mockFilesystem.readFile.mockRejectedValue(new Error("File not found"));

    io.loadSettingsFile("missing.json", (result) => {
      expect(result).toBeNull();
      done();
    });
  });

  test("loadSettingsFile returns null for empty content", (done) => {
    mockFilesystem.readFile.mockResolvedValue({ data: "" });

    io.loadSettingsFile("settings.json", (result) => {
      expect(result).toBeNull();
      done();
    });
  });
});

// ============================================================
// listDirectoryPromise
// ============================================================

describe("listDirectoryPromise", () => {
  test("lists files and directories", async () => {
    // Mock meta directory (will fail = no meta)
    mockFilesystem.readdir
      .mockRejectedValueOnce(new Error("no meta dir"))
      .mockResolvedValueOnce({
        files: [
          { name: "file.txt", type: "file", size: 100, mtime: 1700000000000 },
          { name: "subdir", type: "directory" },
        ],
      });

    // Mock getEntryMeta calls - stat for folder meta will fail
    mockFilesystem.readFile.mockRejectedValue(new Error("no meta"));

    const entries = await io.listDirectoryPromise("/sdcard/test");

    expect(entries).toHaveLength(2);
    expect(entries[0]).toMatchObject({
      name: "file.txt",
      isFile: true,
      size: 100,
      lmdt: 1700000000000,
    });
    expect(entries[0].path).toBe("/sdcard/test/file.txt");
    expect(entries[1]).toMatchObject({
      name: "subdir",
      isFile: false,
    });
    expect(entries[1].path).toBe("/sdcard/test/subdir");
  });

  test("accepts object param", async () => {
    mockFilesystem.readdir
      .mockRejectedValueOnce(new Error("no meta"))
      .mockResolvedValueOnce({ files: [] });

    const entries = await io.listDirectoryPromise({ path: "/sdcard/test" });
    expect(entries).toHaveLength(0);
  });

  test("handles empty directory", async () => {
    mockFilesystem.readdir
      .mockRejectedValueOnce(new Error("no meta"))
      .mockResolvedValueOnce({ files: [] });

    const entries = await io.listDirectoryPromise("/sdcard/empty");
    expect(entries).toEqual([]);
  });

  test("rejects on readdir error", async () => {
    mockFilesystem.readdir
      .mockRejectedValueOnce(new Error("no meta"))
      .mockRejectedValueOnce(new Error("Permission denied"));

    await expect(
      io.listDirectoryPromise("/sdcard/protected")
    ).rejects.toThrow("Permission denied");
  });
});

// ============================================================
// getPropertiesPromise
// ============================================================

describe("getPropertiesPromise", () => {
  test("returns file properties", async () => {
    mockFilesystem.stat.mockResolvedValue({
      type: "file",
      size: 2048,
      mtime: 1700000000000,
    });

    const props = await io.getPropertiesPromise({
      path: "/sdcard/Documents/test.txt",
    });

    expect(props).toEqual({
      path: "/sdcard/Documents/test.txt",
      size: 2048,
      lmdt: 1700000000000,
      isFile: true,
      name: "test.txt",
    });
  });

  test("returns directory properties", async () => {
    mockFilesystem.stat.mockResolvedValue({
      type: "directory",
      size: 4096,
      mtime: 1700000000000,
    });

    const props = await io.getPropertiesPromise("/sdcard/Documents");

    expect(props).toEqual({
      path: "/sdcard/Documents",
      size: 4096,
      lmdt: 1700000000000,
      isFile: false,
      name: "Documents",
    });
  });

  test("returns false for non-existent path", async () => {
    mockFilesystem.stat.mockRejectedValue(new Error("not found"));

    const props = await io.getPropertiesPromise("/sdcard/nonexistent.txt");
    expect(props).toBe(false);
  });

  test("handles missing mtime gracefully", async () => {
    mockFilesystem.stat.mockResolvedValue({
      type: "file",
      size: 0,
    });

    const props = await io.getPropertiesPromise("/sdcard/test.txt");
    expect(props.lmdt).toBe(0);
  });

  test("handles missing size gracefully", async () => {
    mockFilesystem.stat.mockResolvedValue({
      type: "file",
      mtime: 1700000000000,
    });

    const props = await io.getPropertiesPromise("/sdcard/test.txt");
    expect(props.size).toBe(0);
  });
});

// ============================================================
// loadTextFilePromise / getFileContentPromise
// ============================================================

describe("file content reading", () => {
  test("loadTextFilePromise reads UTF8 content", async () => {
    mockFilesystem.readFile.mockResolvedValue({
      data: "Hello, world!",
    });

    const content = await io.loadTextFilePromise("/sdcard/test.txt");

    expect(content).toBe("Hello, world!");
    expect(mockFilesystem.readFile).toHaveBeenCalledWith({
      path: "test.txt",
      directory: "EXTERNAL_STORAGE",
      encoding: "utf8",
    });
  });

  test("loadTextFilePromise accepts object param", async () => {
    mockFilesystem.readFile.mockResolvedValue({ data: "content" });

    const content = await io.loadTextFilePromise({
      path: "/sdcard/test.txt",
    });
    expect(content).toBe("content");
  });

  test("getFileContentPromise returns preview message for isPreview", async () => {
    const content = await io.getFileContentPromise(
      "/sdcard/test.txt",
      "text",
      true
    );
    expect(content).toBe(
      "Previewing files is not supported on this platform"
    );
    expect(mockFilesystem.readFile).not.toHaveBeenCalled();
  });

  test("getFileContentPromise reads binary as ArrayBuffer", async () => {
    // btoa("ABC") = "QUJD"
    const base64Data = "QUJD";
    mockFilesystem.readFile.mockResolvedValue({ data: base64Data });

    const buffer = await io.getFileContentPromise(
      "/sdcard/test.bin",
      "arraybuffer"
    );

    expect(buffer).toBeInstanceOf(ArrayBuffer);
    const view = new Uint8Array(buffer);
    expect(view[0]).toBe(65); // 'A'
    expect(view[1]).toBe(66); // 'B'
    expect(view[2]).toBe(67); // 'C'
  });
});

// ============================================================
// saveFilePromise
// ============================================================

describe("saveFilePromise", () => {
  beforeEach(() => {
    // checkFileExist will use stat
    mockFilesystem.stat.mockRejectedValue(new Error("not found"));
    mockFilesystem.mkdir.mockResolvedValue(undefined);
    mockFilesystem.writeFile.mockResolvedValue(undefined);
  });

  test("saves text content", async () => {
    const result = await io.saveFilePromise(
      { path: "/sdcard/Documents/test.txt" },
      "hello world",
      true,
      true
    );

    expect(result).toMatchObject({
      name: "test.txt",
      isFile: true,
      path: "/sdcard/Documents/test.txt",
      extension: "txt",
      isNewFile: true,
      tags: [],
    });
    expect(result.lmdt).toBeGreaterThan(0);

    expect(mockFilesystem.writeFile).toHaveBeenCalledWith({
      path: "Documents/test.txt",
      data: "hello world",
      directory: "EXTERNAL_STORAGE",
      encoding: "utf8",
    });
  });

  test("saves base64 data URI content", async () => {
    const dataUri = "data:image/png;base64,iVBORw0KGgo=";

    await io.saveFilePromise(
      "/sdcard/Documents/image.png",
      dataUri,
      true,
      false
    );

    expect(mockFilesystem.writeFile).toHaveBeenCalledWith({
      path: "Documents/image.png",
      data: "iVBORw0KGgo=",
      directory: "EXTERNAL_STORAGE",
    });
  });

  test("rejects if file exists and overWrite is false", async () => {
    mockFilesystem.stat.mockResolvedValue({ type: "file" });

    await expect(
      io.saveFilePromise("/sdcard/existing.txt", "data", false)
    ).rejects.toContain("File already exists");
  });

  test("creates parent directory before saving", async () => {
    await io.saveFilePromise(
      "/sdcard/new/deep/path/file.txt",
      "content",
      true,
      true
    );

    expect(mockFilesystem.mkdir).toHaveBeenCalledWith({
      path: "new/deep/path",
      directory: "EXTERNAL_STORAGE",
      recursive: true,
    });
  });

  test("saveTextFilePromise delegates to saveFilePromise with isRaw=true", async () => {
    const result = await io.saveTextFilePromise(
      "/sdcard/test.txt",
      "text content",
      true
    );

    expect(result.isFile).toBe(true);
    expect(mockFilesystem.writeFile).toHaveBeenCalledWith(
      expect.objectContaining({ encoding: "utf8" })
    );
  });
});

// ============================================================
// createDirectoryPromise
// ============================================================

describe("createDirectoryPromise", () => {
  test("creates a new directory", async () => {
    mockFilesystem.stat.mockRejectedValue(new Error("not found"));
    mockFilesystem.mkdir.mockResolvedValue(undefined);

    const result = await io.createDirectoryPromise("/sdcard/newdir");

    expect(result).toBe("/sdcard/newdir");
    expect(mockFilesystem.mkdir).toHaveBeenCalledWith({
      path: "newdir",
      directory: "EXTERNAL_STORAGE",
      recursive: true,
    });
  });

  test("accepts object param", async () => {
    mockFilesystem.stat.mockRejectedValue(new Error("not found"));
    mockFilesystem.mkdir.mockResolvedValue(undefined);

    const result = await io.createDirectoryPromise({
      path: "/sdcard/newdir",
    });
    expect(result).toBe("/sdcard/newdir");
  });

  test("rejects if directory already exists", async () => {
    mockFilesystem.stat.mockResolvedValue({ type: "directory" });

    await expect(
      io.createDirectoryPromise("/sdcard/existing")
    ).rejects.toContain("exist");
  });
});

// ============================================================
// copyFilePromise
// ============================================================

describe("copyFilePromise", () => {
  beforeEach(() => {
    mockFilesystem.mkdir.mockResolvedValue(undefined);
    mockFilesystem.copy.mockResolvedValue(undefined);
  });

  test("copies a file", async () => {
    const result = await io.copyFilePromise(
      "/sdcard/source.txt",
      "/sdcard/dest.txt"
    );

    expect(result).toBe("/sdcard/dest.txt");
    expect(mockFilesystem.copy).toHaveBeenCalledWith({
      from: "source.txt",
      to: "dest.txt",
      directory: "EXTERNAL_STORAGE",
      toDirectory: "EXTERNAL_STORAGE",
    });
  });

  test("accepts object param", async () => {
    const result = await io.copyFilePromise(
      { path: "/sdcard/source.txt" },
      "/sdcard/dest.txt"
    );
    expect(result).toBe("/sdcard/dest.txt");
  });

  test("rejects if target exists and override=false", async () => {
    mockFilesystem.stat.mockResolvedValue({ type: "file" });

    await expect(
      io.copyFilePromise("/sdcard/source.txt", "/sdcard/dest.txt", false)
    ).rejects.toContain("exist");
  });

  test("creates parent directory of target", async () => {
    await io.copyFilePromise("/sdcard/a.txt", "/sdcard/new/folder/b.txt");

    expect(mockFilesystem.mkdir).toHaveBeenCalledWith({
      path: "new/folder",
      directory: "EXTERNAL_STORAGE",
      recursive: true,
    });
  });
});

// ============================================================
// renameFilePromise
// ============================================================

describe("renameFilePromise", () => {
  test("renames a file", async () => {
    mockFilesystem.stat.mockRejectedValue(new Error("not found"));
    mockFilesystem.rename.mockResolvedValue(undefined);

    const result = await io.renameFilePromise(
      "/sdcard/old.txt",
      "/sdcard/new.txt"
    );

    expect(result).toEqual(["/sdcard/old.txt", "/sdcard/new.txt"]);
    expect(mockFilesystem.rename).toHaveBeenCalledWith({
      from: "old.txt",
      to: "new.txt",
      directory: "EXTERNAL_STORAGE",
      toDirectory: "EXTERNAL_STORAGE",
    });
  });

  test("rejects if target already exists", async () => {
    mockFilesystem.stat.mockResolvedValue({ type: "file" });

    await expect(
      io.renameFilePromise("/sdcard/old.txt", "/sdcard/existing.txt")
    ).rejects.toContain("exist");
  });
});

// ============================================================
// checkFileExist / checkDirExist
// ============================================================

describe("existence checks", () => {
  test("checkFileExist returns true for existing file", async () => {
    mockFilesystem.stat.mockResolvedValue({ type: "file" });
    expect(await io.checkFileExist("/sdcard/test.txt")).toBe(true);
  });

  test("checkFileExist returns false for directory", async () => {
    mockFilesystem.stat.mockResolvedValue({ type: "directory" });
    expect(await io.checkFileExist("/sdcard/testdir")).toBe(false);
  });

  test("checkFileExist returns false for non-existent path", async () => {
    mockFilesystem.stat.mockRejectedValue(new Error("not found"));
    expect(await io.checkFileExist("/sdcard/missing.txt")).toBe(false);
  });

  test("checkDirExist returns true for existing directory", async () => {
    mockFilesystem.stat.mockResolvedValue({ type: "directory" });
    expect(await io.checkDirExist("/sdcard/testdir")).toBe(true);
  });

  test("checkDirExist returns false for file", async () => {
    mockFilesystem.stat.mockResolvedValue({ type: "file" });
    expect(await io.checkDirExist("/sdcard/test.txt")).toBe(false);
  });

  test("checkDirExist returns false for non-existent path", async () => {
    mockFilesystem.stat.mockRejectedValue(new Error("not found"));
    expect(await io.checkDirExist("/sdcard/missing")).toBe(false);
  });
});

// ============================================================
// deleteFilePromise / deleteDirectoryPromise
// ============================================================

describe("delete operations", () => {
  test("deleteFilePromise deletes a file", async () => {
    mockFilesystem.deleteFile.mockResolvedValue(undefined);

    const result = await io.deleteFilePromise("/sdcard/test.txt");

    expect(result).toBe("/sdcard/test.txt");
    expect(mockFilesystem.deleteFile).toHaveBeenCalledWith({
      path: "test.txt",
      directory: "EXTERNAL_STORAGE",
    });
  });

  test("deleteFilePromise accepts object param", async () => {
    mockFilesystem.deleteFile.mockResolvedValue(undefined);

    const result = await io.deleteFilePromise({ path: "/sdcard/test.txt" });
    expect(result).toBe("/sdcard/test.txt");
  });

  test("deleteDirectoryPromise deletes recursively", async () => {
    mockFilesystem.rmdir.mockResolvedValue(undefined);

    const result = await io.deleteDirectoryPromise("/sdcard/testdir");

    expect(result).toBe("/sdcard/testdir");
    expect(mockFilesystem.rmdir).toHaveBeenCalledWith({
      path: "testdir",
      directory: "EXTERNAL_STORAGE",
      recursive: true,
    });
  });

  test("deleteDirectoryPromise accepts object param", async () => {
    mockFilesystem.rmdir.mockResolvedValue(undefined);

    const result = await io.deleteDirectoryPromise({
      path: "/sdcard/testdir",
    });
    expect(result).toBe("/sdcard/testdir");
  });
});

// ============================================================
// moveDirectoryPromise
// ============================================================

describe("moveDirectoryPromise", () => {
  test("moves a directory", async () => {
    mockFilesystem.stat.mockRejectedValue(new Error("not found"));
    mockFilesystem.rename.mockResolvedValue(undefined);

    const result = await io.moveDirectoryPromise(
      { path: "/sdcard/olddir" },
      "/sdcard/newdir"
    );

    expect(result).toBe("//sdcard/newdir");
    expect(mockFilesystem.rename).toHaveBeenCalledWith({
      from: "olddir",
      to: "newdir",
      directory: "EXTERNAL_STORAGE",
      toDirectory: "EXTERNAL_STORAGE",
    });
  });

  test("rejects if target directory exists", async () => {
    mockFilesystem.stat.mockResolvedValue({ type: "directory" });

    await expect(
      io.moveDirectoryPromise("/sdcard/olddir", "/sdcard/existing")
    ).rejects.toContain("exist");
  });

  test("calls onProgress callback", async () => {
    mockFilesystem.stat.mockRejectedValue(new Error("not found"));
    mockFilesystem.rename.mockResolvedValue(undefined);

    const onProgress = jest.fn();
    await io.moveDirectoryPromise(
      "/sdcard/olddir",
      "/sdcard/newdir",
      onProgress
    );

    expect(onProgress).toHaveBeenCalledWith(
      { loaded: 1, total: 1, key: "/sdcard/newdir" },
      expect.any(Function),
      "/sdcard/olddir"
    );
  });
});

// ============================================================
// copyDirectoryPromise
// ============================================================

describe("copyDirectoryPromise", () => {
  test("recursively copies directory contents", async () => {
    mockFilesystem.mkdir.mockResolvedValue(undefined);
    mockFilesystem.copy.mockResolvedValue(undefined);
    mockFilesystem.readdir.mockResolvedValue({
      files: [
        { name: "file1.txt", type: "file" },
        { name: "file2.txt", type: "file" },
      ],
    });

    const result = await io.copyDirectoryPromise(
      "/sdcard/source",
      "/sdcard/target"
    );

    expect(result).toBe("/sdcard/target");
    expect(mockFilesystem.mkdir).toHaveBeenCalled();
    expect(mockFilesystem.copy).toHaveBeenCalledTimes(2);
  });

  test("handles nested directories recursively", async () => {
    mockFilesystem.mkdir.mockResolvedValue(undefined);
    mockFilesystem.copy.mockResolvedValue(undefined);

    // First call: source dir has a subdir
    // Second call: subdir contents
    mockFilesystem.readdir
      .mockResolvedValueOnce({
        files: [{ name: "subdir", type: "directory" }],
      })
      .mockResolvedValueOnce({
        files: [{ name: "nested.txt", type: "file" }],
      });

    await io.copyDirectoryPromise("/sdcard/source", "/sdcard/target");

    // mkdir called for target dir, subdir target, and parent dir from copyFilePromise
    expect(mockFilesystem.mkdir).toHaveBeenCalledTimes(3);
  });
});

// ============================================================
// selectDirectoryDialog
// ============================================================

describe("selectDirectoryDialog", () => {
  test("returns normalized path on Android", async () => {
    mockPlatform = "android";
    mockFilePicker.pickDirectory.mockResolvedValue({
      path: "file:///storage/emulated/0/Documents",
    });

    const result = await io.selectDirectoryDialog();
    expect(result).toEqual(["sdcard/Documents"]);
  });

  test("rejects on iOS", async () => {
    mockPlatform = "ios";

    await expect(io.selectDirectoryDialog()).rejects.toBe(
      "Not supported on iOS"
    );
  });

  test("rejects when no folder selected", async () => {
    mockPlatform = "android";
    mockFilePicker.pickDirectory.mockResolvedValue({});

    await expect(io.selectDirectoryDialog()).rejects.toBe(
      "No folder selected"
    );
  });
});

// ============================================================
// openFile
// ============================================================

describe("openFile", () => {
  test("opens HTTP URLs in browser", () => {
    io.openFile("https://example.com/file.pdf");
    expect(mockBrowser.open).toHaveBeenCalledWith({
      url: "https://example.com/file.pdf",
    });
    expect(mockFileOpener.open).not.toHaveBeenCalled();
  });

  test("opens local file with FileOpener", () => {
    io.openFile("/sdcard/test.pdf", "application/pdf");
    expect(mockFileOpener.open).toHaveBeenCalledWith({
      filePath: "file:///sdcard/test.pdf",
      contentType: "application/pdf",
    });
  });

  test("does not double-prefix file:// URIs", () => {
    io.openFile("file:///sdcard/test.pdf", "application/pdf");
    expect(mockFileOpener.open).toHaveBeenCalledWith({
      filePath: "file:///sdcard/test.pdf",
      contentType: "application/pdf",
    });
  });
});

// ============================================================
// openUrl
// ============================================================

describe("openUrl", () => {
  test("opens URL in browser", () => {
    io.openUrl("https://tagspaces.org");
    expect(mockBrowser.open).toHaveBeenCalledWith({
      url: "https://tagspaces.org",
    });
  });
});

// ============================================================
// shareFiles
// ============================================================

describe("shareFiles", () => {
  test("shares files using Share plugin", () => {
    io.shareFiles(["/sdcard/photo.jpg"]);
    expect(mockShare.share).toHaveBeenCalledWith({
      title: "File sharing",
      files: ["/sdcard/photo.jpg"],
      dialogTitle: "Pick an app",
    });
  });
});

// ============================================================
// quitApp
// ============================================================

describe("quitApp", () => {
  test("calls App.exitApp", () => {
    io.quitApp();
    expect(mockApp.exitApp).toHaveBeenCalled();
  });
});

// ============================================================
// listMetaDirectoryPromise
// ============================================================

describe("listMetaDirectoryPromise", () => {
  test("lists meta directory entries", async () => {
    mockFilesystem.readdir.mockResolvedValue({
      files: [
        { name: "file.txt.json", type: "file" },
        { name: "tsm.json", type: "file" },
      ],
    });

    const entries = await io.listMetaDirectoryPromise("/sdcard/testdir");

    expect(entries).toHaveLength(2);
    expect(entries[0]).toMatchObject({
      name: "file.txt.json",
      isFile: true,
    });
    expect(entries[0].path).toContain(".ts/file.txt.json");
  });

  test("returns empty array if meta directory does not exist", async () => {
    mockFilesystem.readdir.mockRejectedValue(new Error("not found"));

    const entries = await io.listMetaDirectoryPromise("/sdcard/testdir");
    expect(entries).toEqual([]);
  });
});

// ============================================================
// Module exports
// ============================================================

describe("module exports", () => {
  const expectedExports = [
    "onDeviceReady",
    "onDeviceBackButton",
    "handleOpenURL",
    "normalizePath",
    "onDeviceResume",
    "onApplicationLoad",
    "getDirSystemPromise",
    "resolveFullPath",
    "getAppStorageFileSystem",
    "getFileSystem",
    "getICloudContainer",
    "saveSettingsFile",
    "loadSettingsFile",
    "saveSettings",
    "loadSettings",
    "loadSettingsTags",
    "sendFile",
    "getDevicePaths",
    "handleStartParameters",
    "quitApp",
    "listMetaDirectoryPromise",
    "listDirectoryPromise",
    "getEntryMeta",
    "getPropertiesPromise",
    "loadTextFilePromise",
    "getFileContentPromise",
    "saveFilePromise",
    "saveTextFilePromise",
    "saveBinaryFilePromise",
    "createDirectoryPromise",
    "copyFilePromise",
    "renameFilePromise",
    "checkFileExist",
    "checkDirExist",
    "renameDirectoryPromise",
    "moveDirectoryPromise",
    "copyDirectoryPromise",
    "deleteFilePromise",
    "deleteDirectoryPromise",
    "selectDirectory",
    "selectFile",
    "selectDirectoryDialog",
    "openDirectory",
    "openFile",
    "openUrl",
    "focusWindow",
    "shareFiles",
  ];

  test("exports all expected functions", () => {
    for (const name of expectedExports) {
      expect(typeof io[name]).toBe("function");
    }
  });

  test("does not export extra unexpected functions", () => {
    const exportedKeys = Object.keys(io);
    expect(exportedKeys.sort()).toEqual(expectedExports.sort());
  });
});
