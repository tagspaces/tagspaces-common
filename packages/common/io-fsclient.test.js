const fs = require("fs-extra");
const os = require("os");
const pathLib = require("path");
const { createFsClient } = require("@tagspaces/tagspaces-common/io-fsclient");

// These tests exercise moveDirectoryPromise specifically — see the bug
// where a failure in the inner deleteDirectoryPromise was swallowed by
// `.catch(error => resolve(newDirPath))`, causing the UI to think the
// move succeeded even when the source folder remained on disk.

describe("io-fsclient moveDirectoryPromise", () => {
  let tmpRoot;
  let fsClient;

  beforeEach(async () => {
    tmpRoot = await fs.mkdtemp(pathLib.join(os.tmpdir(), "ts-iofsclient-"));
    fsClient = createFsClient(fs, pathLib.sep);
  });

  afterEach(async () => {
    if (tmpRoot && fs.existsSync(tmpRoot)) {
      await fs.rm(tmpRoot, { recursive: true, force: true });
    }
  });

  test("moves a folder into an empty destination parent", async () => {
    const source = pathLib.join(tmpRoot, "source");
    const targetParent = pathLib.join(tmpRoot, "targetParent");
    const dest = pathLib.join(targetParent, "source");
    await fs.ensureDir(source);
    await fs.writeFile(pathLib.join(source, "a.txt"), "hello");
    await fs.ensureDir(targetParent);

    const result = await fsClient.moveDirectoryPromise({ path: source }, dest);

    expect(result).toBe(dest);
    expect(fs.existsSync(source)).toBe(false);
    expect(fs.existsSync(dest)).toBe(true);
    expect(await fs.readFile(pathLib.join(dest, "a.txt"), "utf8")).toBe("hello");
  });

  test("merges into an existing destination (overwrites same-named files, keeps unique dest files), and removes the source", async () => {
    const source = pathLib.join(tmpRoot, "source");
    const dest = pathLib.join(tmpRoot, "existingDest");
    await fs.ensureDir(source);
    await fs.writeFile(pathLib.join(source, "shared.txt"), "from-source");
    await fs.writeFile(pathLib.join(source, "only-in-source.txt"), "src-only");
    await fs.ensureDir(dest);
    await fs.writeFile(pathLib.join(dest, "shared.txt"), "from-dest");
    await fs.writeFile(pathLib.join(dest, "only-in-dest.txt"), "dest-only");

    await fsClient.moveDirectoryPromise({ path: source }, dest);

    // Source folder must be gone — this is the user-visible bug.
    expect(fs.existsSync(source)).toBe(false);
    // Source file wins on name collisions (merge with source-wins).
    expect(await fs.readFile(pathLib.join(dest, "shared.txt"), "utf8")).toBe(
      "from-source",
    );
    // Files unique to source are present in dest.
    expect(
      await fs.readFile(pathLib.join(dest, "only-in-source.txt"), "utf8"),
    ).toBe("src-only");
    // Files unique to old dest are preserved (the "merge, don't replace"
    // semantic the user explicitly asked us to keep).
    expect(
      await fs.readFile(pathLib.join(dest, "only-in-dest.txt"), "utf8"),
    ).toBe("dest-only");
  });

  test("rejects when moving into the same path", async () => {
    const source = pathLib.join(tmpRoot, "same");
    await fs.ensureDir(source);

    await expect(
      fsClient.moveDirectoryPromise({ path: source }, source),
    ).rejects.toMatch(/same directory/i);

    expect(fs.existsSync(source)).toBe(true);
  });

  test("regression: rejects (does NOT silently resolve) when the source delete fails", async () => {
    // Reproduce the original bug-class: copy succeeds, delete-source fails.
    // Prior to the fix, .catch swallowed this and the promise resolved as
    // success — the UI removed the source from the listing while the
    // folder was still on disk. The fix must propagate the error.
    const source = pathLib.join(tmpRoot, "source");
    const dest = pathLib.join(tmpRoot, "target", "source");
    await fs.ensureDir(source);
    await fs.writeFile(pathLib.join(source, "a.txt"), "hello");

    // Force a delete failure by hijacking the underlying fs.rm.
    // We inject the failure only for the source path so the cleanup in
    // afterEach can still tear the temp dir down via the unhijacked impl.
    const realRm = fs.rm;
    const rmSpy = jest
      .spyOn(fs, "rm")
      .mockImplementation((target, opts, cb) => {
        // Signature: fs.rm(path, options, callback). With fs-extra options
        // is sometimes omitted; handle both.
        const callback = typeof opts === "function" ? opts : cb;
        if (target === source) {
          return callback(
            Object.assign(new Error("simulated EBUSY on source"), {
              code: "EBUSY",
            }),
          );
        }
        return realRm.call(fs, target, opts, cb);
      });

    try {
      await expect(
        fsClient.moveDirectoryPromise({ path: source }, dest),
      ).rejects.toBeDefined();

      // Copy already happened (dest populated)…
      expect(fs.existsSync(dest)).toBe(true);
      expect(await fs.readFile(pathLib.join(dest, "a.txt"), "utf8")).toBe(
        "hello",
      );
      // …and crucially the source is still on disk. The user-visible
      // contract: a rejected promise lets the renderer suppress its
      // optimistic UI removal and surface the failure, so the on-disk
      // state and the UI stay consistent.
      expect(fs.existsSync(source)).toBe(true);
    } finally {
      rmSpy.mockRestore();
    }
  });
});
