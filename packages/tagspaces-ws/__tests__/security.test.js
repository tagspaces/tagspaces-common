const fs = require("fs");
const os = require("os");
const pathLib = require("path");
const {
  validatePath,
  validatePaths,
  isDeviceNamespacePath,
  normalizeExtendedLengthPath,
} = require("../security");

/**
 * Path validation is the one part of this package whose correctness differs by
 * platform, and it gates every write the worker makes. The predicates below are
 * pure string logic, so the whole Windows/POSIX matrix is checked from any host.
 */
describe("path validation (cross-platform)", () => {
  describe("device namespaces are blocked", () => {
    test.each([
      ["\\\\?\\C:\\Windows", "Windows extended-length"],
      ["\\\\.\\PhysicalDrive0", "Windows raw device"],
      ["//?/C:/Windows", "extended-length, forward slashes"],
      ["//./PhysicalDrive0", "raw device, forward slashes"],
      ["\\\\?\\UNC\\server\\share", "extended-length UNC"],
    ])("blocks %s (%s)", (input) => {
      expect(isDeviceNamespacePath(input)).toBe(true);
    });
  });

  describe("real user paths are allowed", () => {
    test.each([
      ["C:\\Users\\bob\\Photos", "Windows drive path"],
      ["Z:\\Photos", "Windows mapped network drive"],
      // A plain UNC share is just a remote filesystem and a Windows user can
      // pick one in the directory picker. Blocking it broke network-share
      // locations, which is why the check is narrowed to device namespaces.
      ["\\\\server\\share\\Photos", "Windows UNC network share"],
      ["\\\\nas\\media", "Windows UNC share root"],
      ["/home/user/Photos", "Linux"],
      ["/Users/na/Photos", "macOS"],
      ["//home/user/Photos", "POSIX leading double slash"],
    ])("allows %s (%s)", (input) => {
      expect(isDeviceNamespacePath(input)).toBe(false);
    });
  });

  describe("Windows extended-length results are normalized, not rejected", () => {
    // Windows realpath can return these for long paths; converting back to the
    // conventional form keeps long paths working.
    test.each([
      ["\\\\?\\C:\\very\\long\\path", "C:\\very\\long\\path"],
      ["\\\\?\\UNC\\server\\share\\x", "\\\\server\\share\\x"],
      ["\\\\?\\unc\\server\\share", "\\\\server\\share"],
    ])("%s -> %s", (input, expected) => {
      expect(normalizeExtendedLengthPath(input)).toBe(expected);
    });

    test.each(["C:\\plain\\path", "/home/user", "\\\\server\\share"])(
      "leaves %s untouched",
      (input) => {
        expect(normalizeExtendedLengthPath(input)).toBe(input);
      },
    );
  });

  describe("validatePath on the host platform", () => {
    test("accepts an absolute path and returns it canonicalized", () => {
      const dir = fs.mkdtempSync(pathLib.join(os.tmpdir(), "sec-"));
      try {
        const out = validatePath(dir);
        expect(pathLib.isAbsolute(out)).toBe(true);
        // Canonical: resolving it again is a fixed point.
        expect(validatePath(out)).toBe(out);
      } finally {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    });

    test("collapses .. rather than rejecting it as a substring", () => {
      const dir = fs.mkdtempSync(pathLib.join(os.tmpdir(), "sec-"));
      try {
        const sub = pathLib.join(dir, "a");
        fs.mkdirSync(sub);
        expect(validatePath(pathLib.join(sub, "..", "a"))).toBe(
          validatePath(sub),
        );
      } finally {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    });

    test("accepts a name that merely contains .. ", () => {
      const dir = fs.mkdtempSync(pathLib.join(os.tmpdir(), "sec-"));
      try {
        const odd = pathLib.join(dir, "a..b");
        fs.mkdirSync(odd);
        expect(validatePath(odd)).toBe(fs.realpathSync(odd));
      } finally {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    });

    test("resolves a symlink so a later write cannot be redirected", () => {
      const dir = fs.mkdtempSync(pathLib.join(os.tmpdir(), "sec-"));
      try {
        const real = pathLib.join(dir, "real");
        const link = pathLib.join(dir, "link");
        fs.mkdirSync(real);
        try {
          fs.symlinkSync(real, link, "dir");
        } catch (e) {
          // Windows needs privileges for symlinks; nothing to assert there.
          return;
        }
        expect(validatePath(link)).toBe(validatePath(real));
      } finally {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    });

    test("accepts a path that does not exist yet (.ts about to be created)", () => {
      const dir = fs.mkdtempSync(pathLib.join(os.tmpdir(), "sec-"));
      try {
        const future = pathLib.join(dir, ".ts", "tsi.json");
        expect(validatePath(future)).toBe(
          pathLib.join(fs.realpathSync(dir), ".ts", "tsi.json"),
        );
      } finally {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    });

    test.each([
      ["relative/path", "relative"],
      ["", "empty"],
      [null, "null"],
      [42, "non-string"],
      ["/tmp/with\0null", "null byte"],
    ])("rejects %s (%s)", (input) => {
      expect(() => validatePath(input)).toThrow();
    });

    test("validatePaths rejects a non-array", () => {
      expect(() => validatePaths("/tmp")).toThrow(/array/i);
    });
  });
});
