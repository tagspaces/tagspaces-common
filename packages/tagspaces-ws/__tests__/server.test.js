const fs = require("fs");
const pathLib = require("path");
const jwt = require("jsonwebtoken");
const supertest = require("supertest");
const AppConfig = require("@tagspaces/tagspaces-common/AppConfig");
const { createWS } = require("../ws");
const { execFileSync } = require("child_process");

function isHiddenSync(filePath) {
  try {
    const output = execFileSync("attrib", [filePath], {
      encoding: "utf8", // return string instead of Buffer
      windowsHide: true,
    });

    // attrib output example:
    // "  H    C:\\path\\to\\file"
    const attrs = output.trim().split(/\s+/)[0];

    return attrs.includes("H");
  } catch (err) {
    // file not found, permission denied, etc.
    throw err;
  }
}

describe("Web Server Endpoints", () => {
  let server;
  let request;
  const port = 3001; // Choose a different port if 3000 is in use
  const key = "test-key";
  const payload = {
    provider: "tagspaces",
    date: Math.floor(Date.now() / 1000),
  };
  const token = jwt.sign(payload, key);
  const testDir = pathLib.join(
    __dirname,
    "..",
    "testdata",
    "file-structure",
    "supported-filestypes",
  );

  beforeAll((done) => {
    server = createWS(port, key); // Pass your key if needed
    request = supertest(`http://127.0.0.1:${port}`);
    server.on("listening", done);
  });

  afterAll((done) => {
    server.close(done);
  });

  test("POST /extract-pdf", async () => {
    const pdfFilePath = pathLib.join(testDir, "sample.pdf");
    const response = await request
      .post("/extract-pdf")
      .set("Authorization", "Bearer " + token) // Set your auth header if needed
      .send({ path: pdfFilePath });

    expect(response.status).toBe(200);
  }, 10000);

  test("POST /thumb-gen file", async () => {
    const response = await request
      .post("/thumb-gen?pdfContent=true")
      .set("Authorization", "Bearer " + token) // Set your auth header if needed
      .send([pathLib.join(testDir, "sample.pdf")]);

    expect(response.status).toBe(200);
  });

  test("POST /thumb-gen dir", async () => {
    const response = await request
      .post("/thumb-gen?pdf=false&pdfContent=true")
      .set("Authorization", "Bearer " + token) // Set your auth header if needed
      .send([testDir]);

    expect(response.status).toBe(200);

    const filesToCheck = [
      "sample.gif.jpg",
      "sample.jfif.jpg",
      "sample.jif.jpg",
      "sample.jpeg.jpg",
      "sample.jpg.jpg",
      "sample.png.jpg",
      "sample.svg.jpg",
      "sample.tif.jpg",
      "sample.tiff.jpg",
      "sample.webp.jpg",
      "sample_exif[iptc].jpg.jpg",
    ];
    filesToCheck.forEach((fileName) => {
      const filePath = pathLib.join(testDir, ".ts", fileName);

      const fileExists = fs.existsSync(filePath);
      expect(fileExists).toBe(true);
    });
  });

  test("POST /indexer", async () => {
    fs.writeFileSync(
      pathLib.join(testDir, ".ts", "sample.pdf.json"),
      '{"id":"54dc1af0f43c4670b7138ee133a97396","description":"test descr\\n"}',
    );
    const tsmPath = pathLib.join(testDir, "empty_folder", ".ts", "tsm.json");

    // Ensure parent directory exists
    fs.mkdirSync(pathLib.dirname(tsmPath), { recursive: true });

    fs.writeFileSync(
      tsmPath,
      '{"id":"38179c2452474f8592c5ed7965c0cf73","perspective":"grid","description":"test subdir folder descr\\n"}',
    );
    const response = await request
      .post("/indexer")
      .set("Authorization", "Bearer " + token) // Set your auth header if needed
      .send({ directoryPath: testDir, extractText: true });

    expect(response.status).toBe(200);

    const filePath = pathLib.join(testDir, ".ts", "tsi.json");
    const fileExists = fs.existsSync(filePath);
    expect(fileExists).toBe(true);

    const indexFullText = JSON.parse(
      fs.readFileSync(pathLib.join(testDir, ".ts", "tsi.json"), "utf8").trim(),
    );

    expect(
      indexFullText.some(({ meta }) => meta?.description === "test descr"),
    ).toBe(true);
    expect(
      indexFullText.some(
        ({ meta }) => meta?.description === "test subdir folder descr",
      ),
    ).toBe(true);
  });

  test("POST /indexer honors caller ignorePatterns and global ._ defaults", async () => {
    const os = require("os");
    const dir = fs.mkdtempSync(pathLib.join(os.tmpdir(), "ws-ignore-"));
    try {
      fs.writeFileSync(pathLib.join(dir, "keep.txt"), "keep me");
      fs.writeFileSync(pathLib.join(dir, "ignoreme.log"), "drop me");
      // macOS AppleDouble junk — must be dropped by the global defaults even
      // though the caller never lists it.
      fs.writeFileSync(pathLib.join(dir, "._keep.txt"), "resource fork");

      const response = await request
        .post("/indexer")
        .set("Authorization", "Bearer " + token)
        .send({
          directoryPath: dir,
          extractText: false,
          ignorePatterns: ["*.log"],
          forceFullReindex: true,
        });

      expect(response.status).toBe(200);

      const index = JSON.parse(
        fs.readFileSync(pathLib.join(dir, ".ts", "tsi.json"), "utf8").trim(),
      );
      const names = index.map((e) => e.name);

      expect(names).toContain("keep.txt");
      // caller-supplied pattern reached the index walk
      expect(names).not.toContain("ignoreme.log");
      // global AppConfig.defaultIgnorePatterns applied on the worker path too
      expect(names).not.toContain("._keep.txt");
      expect(names.some((n) => n.startsWith("._"))).toBe(false);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }, 10000);

  test("POST /hide-folder", async () => {
    const metaFolder = pathLib.join(testDir, ".ts");
    const response = await request
      .post("/hide-folder")
      .set("Authorization", "Bearer " + token) // Set your auth header if needed
      .send({ path: metaFolder });
    if (AppConfig.isWin) {
      expect(response.status).toBe(200);
      expect(isHiddenSync(metaFolder)).toBe(true);
    } else {
      expect(response.status).toBe(200);
    }
  });
});
