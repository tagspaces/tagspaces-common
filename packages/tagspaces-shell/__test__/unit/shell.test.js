const { cleanMeta } = require("@tagspaces/tagspaces-metacleaner/metacleaner");
const {
  processAllThumbnails,
} = require("@tagspaces/tagspaces-workers/tsnodethumbgen");
const paths = require("@tagspaces/tagspaces-common/paths");
const AppConfig = require("@tagspaces/tagspaces-common/AppConfig");
const {
  getPropertiesPromise,
  loadTextFilePromise,
  saveTextFilePromise,
  renameFilePromise,
  createDirectoryPromise,
} = require("@tagspaces/tagspaces-common-node/io-node");
const {
  persistIndex,
  createIndex,
} = require("@tagspaces/tagspaces-indexer");
const {
  listDirectoryPromise,
  getFileContentPromise,
} = require("@tagspaces/tagspaces-common-node/io-node");
const pathLib = require("path");
const fs = require("fs");

const testingDir = pathLib.resolve(__dirname, "..");
const indexingDir = pathLib.resolve(__dirname, "..", "indexingLocation");

// ── helpers ──────────────────────────────────────────────────────────────────

function metaPath(filePath) {
  return paths.getMetaFileLocationForFile(filePath);
}

function metaDirPath(dirPath) {
  return paths.getMetaFileLocationForDir(dirPath);
}

async function readJSON(filePath) {
  const content = await loadTextFilePromise(filePath);
  // strip BOM if present
  const clean = content.charCodeAt(0) === 0xfeff ? content.slice(1) : content;
  return JSON.parse(clean);
}

async function writeJSON(filePath, obj) {
  const dir = pathLib.dirname(filePath);
  await createDirectoryPromise(dir);
  await saveTextFilePromise(filePath, JSON.stringify(obj, null, 2), true);
}

function cleanup(...paths) {
  for (const p of paths) {
    try {
      fs.unlinkSync(p);
    } catch (e) {
      // ignore
    }
  }
}

// ── thumbgen ─────────────────────────────────────────────────────────────────

describe("thumbgen", () => {
  test("generates thumbnails for test directory", async () => {
    const success = await processAllThumbnails(testingDir, false);
    if (success) {
      console.log("Thumbnails generated in folder: " + testingDir);
    } else {
      console.warn("Thumbnails not generated for folder: " + testingDir);
    }
    const thumbPath = pathLib.resolve(testingDir, ".ts", "test.jpg.jpg");
    expect(fs.existsSync(thumbPath)).toBe(true);
  });
});

// ── metacleaner ──────────────────────────────────────────────────────────────

describe("metacleaner", () => {
  test("removes orphaned thumbnails but keeps valid ones", async () => {
    const orphanPath = pathLib.resolve(
      testingDir,
      ".ts",
      "file_for_clean.jpg.jpg",
    );
    fs.writeFileSync(orphanPath, "tests");
    expect(fs.existsSync(orphanPath)).toBe(true);

    await cleanMeta(
      testingDir,
      (filePath) => {
        console.log("File cleaned:" + filePath);
      },
      false,
      { considerMetaJSON: false, considerThumb: true },
    );

    expect(fs.existsSync(orphanPath)).toBe(false);

    const thumbPath = pathLib.resolve(testingDir, ".ts", "test.jpg.jpg");
    expect(fs.existsSync(thumbPath)).toBe(true);
  });
});

// ── indexer ───────────────────────────────────────────────────────────────────

describe("indexer", () => {
  test("creates search index for a directory", async () => {
    const directoryIndex = await createIndex({
      path: indexingDir,
      listDirectoryPromise,
      getFileContentPromise,
    });

    expect(directoryIndex).toBeDefined();

    const success = await persistIndex(
      { path: indexingDir, saveTextFilePromise },
      directoryIndex,
    );
    expect(success).toBeTruthy();

    const indexPath = pathLib.resolve(indexingDir, ".ts", "tsi.json");
    expect(fs.existsSync(indexPath)).toBe(true);
  });
});

// ── tag (rename method) ──────────────────────────────────────────────────────

describe("tag (rename method)", () => {
  const testFile = pathLib.resolve(testingDir, "tag_rename_test.jpg");

  beforeEach(() => {
    fs.copyFileSync(
      pathLib.resolve(testingDir, "test.jpg"),
      testFile,
    );
  });

  afterEach(() => {
    // clean up any renamed variants
    const dir = testingDir;
    const files = fs.readdirSync(dir);
    for (const f of files) {
      if (f.startsWith("tag_rename_test")) {
        try {
          fs.unlinkSync(pathLib.resolve(dir, f));
        } catch (e) {
          // ignore
        }
      }
    }
  });

  test("adds tags to filename", async () => {
    const newTags = ["photo", "summer"];
    const fileName = paths.extractFileName(testFile);
    const newFileName = paths.generateFileName(
      fileName,
      newTags,
      AppConfig.tagDelimiter,
      pathLib.sep,
      AppConfig.prefixTagContainer,
      true,
    );
    const newFilePath =
      paths.extractContainingDirectoryPath(testFile) +
      pathLib.sep +
      newFileName;

    await renameFilePromise(testFile, newFilePath);

    expect(fs.existsSync(newFilePath)).toBe(true);
    expect(fs.existsSync(testFile)).toBe(false);

    const extractedTags = paths.extractTags(
      newFilePath,
      AppConfig.tagDelimiter,
    );
    expect(extractedTags).toContain("photo");
    expect(extractedTags).toContain("summer");
  });

  test("merges new tags with existing tags", async () => {
    // first, rename to have initial tags
    const initialTags = ["photo"];
    const fileName = paths.extractFileName(testFile);
    const taggedName = paths.generateFileName(
      fileName,
      initialTags,
      AppConfig.tagDelimiter,
      pathLib.sep,
      AppConfig.prefixTagContainer,
      true,
    );
    const taggedPath =
      paths.extractContainingDirectoryPath(testFile) +
      pathLib.sep +
      taggedName;
    await renameFilePromise(testFile, taggedPath);

    // now merge with additional tags
    const existingTags = paths.extractTags(
      taggedPath,
      AppConfig.tagDelimiter,
    );
    const mergedTags = [...new Set([...existingTags, "summer", "2024"])];
    const mergedName = paths.generateFileName(
      paths.extractFileName(taggedPath),
      mergedTags,
      AppConfig.tagDelimiter,
      pathLib.sep,
      AppConfig.prefixTagContainer,
      true,
    );
    const mergedPath =
      paths.extractContainingDirectoryPath(taggedPath) +
      pathLib.sep +
      mergedName;
    await renameFilePromise(taggedPath, mergedPath);

    const finalTags = paths.extractTags(mergedPath, AppConfig.tagDelimiter);
    expect(finalTags).toContain("photo");
    expect(finalTags).toContain("summer");
    expect(finalTags).toContain("2024");
  });

  test("detects when tags are already present", () => {
    const fileName = "myfile[photo summer].jpg";
    const existingTags = paths.extractTags(fileName, AppConfig.tagDelimiter);
    const mergedTags = [...new Set([...existingTags, "photo"])];
    const newFileName = paths.generateFileName(
      fileName,
      mergedTags,
      AppConfig.tagDelimiter,
      pathLib.sep,
      AppConfig.prefixTagContainer,
      true,
    );
    // same tags → same filename
    expect(newFileName).toBe(fileName);
  });
});

// ── tag (sidecar method) ─────────────────────────────────────────────────────

describe("tag (sidecar method)", () => {
  const testFile = pathLib.resolve(testingDir, "test.jpg");
  const sidecarFile = metaPath(testFile);

  afterEach(() => {
    cleanup(sidecarFile);
  });

  test("creates sidecar JSON with tags for a file", async () => {
    const tags = [
      { title: "photo", type: "sidecar" },
      { title: "nature", type: "sidecar" },
    ];
    await writeJSON(sidecarFile, { tags });

    const sidecar = await readJSON(sidecarFile);
    expect(sidecar.tags).toHaveLength(2);
    expect(sidecar.tags[0].title).toBe("photo");
    expect(sidecar.tags[1].title).toBe("nature");
  });

  test("merges tags without duplicates", async () => {
    // write initial sidecar
    const initial = { tags: [{ title: "photo", type: "sidecar" }] };
    await writeJSON(sidecarFile, initial);

    // load, merge, save
    const sidecar = await readJSON(sidecarFile);
    const existingTitles = sidecar.tags.map((t) => t.title);
    const newTags = ["photo", "summer"]; // photo is duplicate
    const tagsToAdd = newTags.filter((t) => !existingTitles.includes(t));
    sidecar.tags = [
      ...sidecar.tags,
      ...tagsToAdd.map((t) => ({ title: t, type: "sidecar" })),
    ];
    await writeJSON(sidecarFile, sidecar);

    const result = await readJSON(sidecarFile);
    expect(result.tags).toHaveLength(2);
    const titles = result.tags.map((t) => t.title);
    expect(titles).toContain("photo");
    expect(titles).toContain("summer");
  });

  test("creates .ts directory if it does not exist", async () => {
    const tmpFile = pathLib.resolve(testingDir, "sample.tiff");
    const tmpSidecar = metaPath(tmpFile);

    try {
      await writeJSON(tmpSidecar, {
        tags: [{ title: "test", type: "sidecar" }],
      });
      expect(fs.existsSync(tmpSidecar)).toBe(true);
    } finally {
      cleanup(tmpSidecar);
    }
  });

  test("tags a folder via sidecar (tsm.json)", async () => {
    const folderMeta = metaDirPath(indexingDir);
    const original = await readJSON(folderMeta);

    try {
      const updated = { ...original, tags: [{ title: "folder-tag", type: "sidecar" }] };
      await writeJSON(folderMeta, updated);

      const result = await readJSON(folderMeta);
      expect(result.tags).toHaveLength(1);
      expect(result.tags[0].title).toBe("folder-tag");
      // original properties should be preserved
      expect(result.id).toBe(original.id);
    } finally {
      // restore original tsm.json
      await writeJSON(folderMeta, original);
    }
  });
});

// ── describe (sidecar) ───────────────────────────────────────────────────────

describe("describe (sidecar)", () => {
  const testFile = pathLib.resolve(testingDir, "test.jpg");
  const sidecarFile = metaPath(testFile);

  afterEach(() => {
    cleanup(sidecarFile);
  });

  test("sets description on a file", async () => {
    await writeJSON(sidecarFile, { description: "A test image" });

    const sidecar = await readJSON(sidecarFile);
    expect(sidecar.description).toBe("A test image");
  });

  test("preserves existing tags when setting description", async () => {
    const initial = {
      tags: [{ title: "photo", type: "sidecar" }],
      description: "old desc",
    };
    await writeJSON(sidecarFile, initial);

    // load, update description, save
    const sidecar = await readJSON(sidecarFile);
    sidecar.description = "new description";
    await writeJSON(sidecarFile, sidecar);

    const result = await readJSON(sidecarFile);
    expect(result.description).toBe("new description");
    expect(result.tags).toHaveLength(1);
    expect(result.tags[0].title).toBe("photo");
  });

  test("sets description on a folder", async () => {
    const folderMeta = metaDirPath(indexingDir);
    const original = await readJSON(folderMeta);

    try {
      const updated = { ...original, description: "Test folder description" };
      await writeJSON(folderMeta, updated);

      const result = await readJSON(folderMeta);
      expect(result.description).toBe("Test folder description");
      expect(result.id).toBe(original.id);
    } finally {
      await writeJSON(folderMeta, original);
    }
  });

  test("creates sidecar from scratch if none exists", async () => {
    // ensure no sidecar exists
    cleanup(sidecarFile);
    expect(fs.existsSync(sidecarFile)).toBe(false);

    await writeJSON(sidecarFile, { description: "brand new description" });

    expect(fs.existsSync(sidecarFile)).toBe(true);
    const result = await readJSON(sidecarFile);
    expect(result.description).toBe("brand new description");
  });
});

// ── path utility tests (generateFileName, extractTags) ───────────────────────

describe("path utilities for tagging", () => {
  test("generateFileName places tags before extension", () => {
    const result = paths.generateFileName(
      "document.pdf",
      ["work", "important"],
      " ",
      "/",
      "",
      true,
    );
    expect(result).toBe("document[work important].pdf");
  });

  test("extractTags returns tags from filename", () => {
    const tags = paths.extractTags("document[work important].pdf", " ");
    expect(tags).toEqual(["work", "important"]);
  });

  test("cleanFileName removes tags from filename", () => {
    const cleaned = paths.cleanFileName("document[work important].pdf");
    expect(cleaned).toBe("document.pdf");
  });

  test("generateFileName merges into existing tagged file", () => {
    const fileName = "photo[nature].jpg";
    const existingTags = paths.extractTags(fileName, " ");
    const merged = [...new Set([...existingTags, "summer"])];
    const result = paths.generateFileName(fileName, merged, " ", "/", "", true);
    expect(result).toBe("photo[nature summer].jpg");
  });

  test("getMetaFileLocationForFile returns correct sidecar path", () => {
    const result = paths.getMetaFileLocationForFile("/home/user/doc.pdf");
    expect(result).toContain(".ts");
    expect(result).toContain("doc.pdf.json");
  });

  test("getMetaFileLocationForDir returns tsm.json path", () => {
    const result = paths.getMetaFileLocationForDir("/home/user/folder");
    expect(result).toContain(".ts");
    expect(result).toContain("tsm.json");
  });
});

// ── CLI integration (exec) ───────────────────────────────────────────────────

describe("CLI integration", () => {
  const { execSync } = require("child_process");
  const cliPath = pathLib.resolve(__dirname, "..", "..", "bin", "clidev.js");

  function run(args) {
    return execSync(`node "${cliPath}" ${args}`, {
      cwd: pathLib.resolve(__dirname, "..", ".."),
      encoding: "utf-8",
      timeout: 30000,
    });
  }

  test("--version prints version number", () => {
    const output = run("--version");
    const { version } = require("../../package.json");
    expect(output.trim()).toBe(version);
  });

  test("--help shows banner and all commands", () => {
    const output = run("--help");
    expect(output).toContain("tscmd");
    expect(output).toContain("thumbgen");
    expect(output).toContain("indexer");
    expect(output).toContain("metacleaner");
    expect(output).toContain("tag");
    expect(output).toContain("describe");
  });

  test("tag --help shows tag-specific options", () => {
    const output = run("tag --help");
    expect(output).toContain("--tags");
    expect(output).toContain("--method");
    expect(output).toContain("rename");
    expect(output).toContain("sidecar");
  });

  test("describe --help shows describe-specific options", () => {
    const output = run("describe --help");
    expect(output).toContain("--description");
  });

  test("tag sidecar creates sidecar file via CLI", () => {
    const targetFile = pathLib.resolve(testingDir, "test.jpg");
    const sidecar = metaPath(targetFile);
    cleanup(sidecar);

    try {
      run(
        `tag "${targetFile}" -t cli-tag1 cli-tag2 --method sidecar`,
      );
      expect(fs.existsSync(sidecar)).toBe(true);
      const content = JSON.parse(fs.readFileSync(sidecar, "utf-8"));
      const titles = content.tags.map((t) => t.title);
      expect(titles).toContain("cli-tag1");
      expect(titles).toContain("cli-tag2");
    } finally {
      cleanup(sidecar);
    }
  });

  test("describe sets description via CLI", () => {
    const targetFile = pathLib.resolve(testingDir, "test.jpg");
    const sidecar = metaPath(targetFile);
    cleanup(sidecar);

    try {
      run(`describe "${targetFile}" -d "CLI description test"`);
      expect(fs.existsSync(sidecar)).toBe(true);
      const content = JSON.parse(fs.readFileSync(sidecar, "utf-8"));
      expect(content.description).toBe("CLI description test");
    } finally {
      cleanup(sidecar);
    }
  });

  test("describe sets description on multiple files via CLI", () => {
    const file1 = pathLib.resolve(testingDir, "test.jpg");
    const file2 = pathLib.resolve(testingDir, "sample.tiff");
    const sidecar1 = metaPath(file1);
    const sidecar2 = metaPath(file2);
    cleanup(sidecar1, sidecar2);

    try {
      run(`describe "${file1}" "${file2}" -d "batch description"`);
      expect(fs.existsSync(sidecar1)).toBe(true);
      expect(fs.existsSync(sidecar2)).toBe(true);
      const content1 = JSON.parse(fs.readFileSync(sidecar1, "utf-8"));
      const content2 = JSON.parse(fs.readFileSync(sidecar2, "utf-8"));
      expect(content1.description).toBe("batch description");
      expect(content2.description).toBe("batch description");
    } finally {
      cleanup(sidecar1, sidecar2);
    }
  });

  test("describe converts \\n to real newlines", () => {
    const targetFile = pathLib.resolve(testingDir, "test.jpg");
    const sidecar = metaPath(targetFile);
    cleanup(sidecar);

    try {
      run(
        `describe "${targetFile}" -d "# Title\\n\\nA paragraph."`,
      );
      const content = JSON.parse(fs.readFileSync(sidecar, "utf-8"));
      expect(content.description).toBe("# Title\n\nA paragraph.");
    } finally {
      cleanup(sidecar);
    }
  });

  test("describe reads description from a file via -f", () => {
    const targetFile = pathLib.resolve(testingDir, "test.jpg");
    const sidecar = metaPath(targetFile);
    const descFile = pathLib.resolve(testingDir, "_test_desc.md");
    cleanup(sidecar);

    try {
      fs.writeFileSync(descFile, "# From File\n\nMarkdown content.\n");
      run(`describe "${targetFile}" -f "${descFile}"`);
      const content = JSON.parse(fs.readFileSync(sidecar, "utf-8"));
      expect(content.description).toBe(
        "# From File\n\nMarkdown content.\n",
      );
    } finally {
      cleanup(sidecar, descFile);
    }
  });

  test("describe reads description from stdin via -d -", () => {
    const targetFile = pathLib.resolve(testingDir, "test.jpg");
    const sidecar = metaPath(targetFile);
    cleanup(sidecar);

    try {
      const { execSync } = require("child_process");
      execSync(
        `echo "stdin content" | node "${cliPath}" describe "${targetFile}" -d -`,
        {
          cwd: pathLib.resolve(__dirname, "..", ".."),
          encoding: "utf-8",
          timeout: 30000,
        },
      );
      const content = JSON.parse(fs.readFileSync(sidecar, "utf-8"));
      expect(content.description).toBe("stdin content\n");
    } finally {
      cleanup(sidecar);
    }
  });

  test("tag rename renames file via CLI", () => {
    const srcFile = pathLib.resolve(testingDir, "cli_rename_test.jpg");
    fs.copyFileSync(pathLib.resolve(testingDir, "test.jpg"), srcFile);

    try {
      run(`tag "${srcFile}" -t hello --method rename`);
      const expectedPath = pathLib.resolve(
        testingDir,
        "cli_rename_test[hello].jpg",
      );
      expect(fs.existsSync(expectedPath)).toBe(true);
      expect(fs.existsSync(srcFile)).toBe(false);
      // clean up renamed file
      cleanup(expectedPath);
    } catch (e) {
      cleanup(srcFile);
      throw e;
    }
  });

  test("indexer generates index via CLI", () => {
    const output = run(`indexer "${indexingDir}"`);
    expect(output).toContain("Index generated");
    const indexPath = pathLib.resolve(indexingDir, ".ts", "tsi.json");
    expect(fs.existsSync(indexPath)).toBe(true);
  });

  test("metacleaner dry-run lists files without deleting", () => {
    const output = run(`metacleaner --analyze "${testingDir}"`);
    expect(output).toContain("Done cleaning");
  });
});
