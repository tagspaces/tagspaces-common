const fs = require("fs");
const pathLib = require("path");
const jwt = require("jsonwebtoken");
const supertest = require("supertest");
const { createWS } = require("../ws");
const { ISSUER, AUDIENCE } = require("../auth");

describe("Web Server Endpoints", () => {
  let server;
  let request;
  const port = 3001; // Choose a different port if 3000 is in use
  const key = "test-key";

  /**
   * Mint a token the same way the Electron main process does: bound to one
   * endpoint via `sub`, short-lived, HS256.
   */
  function mint(sub, overrides = {}) {
    return jwt.sign({ iss: ISSUER, aud: AUDIENCE, sub }, overrides.key || key, {
      algorithm: "HS256",
      expiresIn: overrides.expiresIn || "60s",
    });
  }

  const token = mint("/indexer");
  const thumbToken = mint("/thumb-gen");
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

  test("POST /thumb-gen file", async () => {
    const response = await request
      .post("/thumb-gen?pdfContent=true")
      .set("Authorization", "Bearer " + thumbToken)
      .send([pathLib.join(testDir, "sample.pdf")]);

    expect(response.status).toBe(200);
  });

  test("POST /thumb-gen dir", async () => {
    const response = await request
      .post("/thumb-gen?pdf=false&pdfContent=true")
      .set("Authorization", "Bearer " + thumbToken)
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
      .set("Authorization", "Bearer " + token)
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

  // --- Authentication ---

  test("rejects a request with no Authorization header", async () => {
    const response = await request
      .post("/indexer")
      .send({ directoryPath: testDir });
    expect(response.status).toBe(401);
  });

  test("rejects a token signed with the wrong key", async () => {
    const forged = mint("/indexer", { key: "not-the-key" });
    const response = await request
      .post("/indexer")
      .set("Authorization", "Bearer " + forged)
      .send({ directoryPath: testDir });
    expect(response.status).toBe(401);
  });

  test("rejects an expired token", async () => {
    const expired = mint("/indexer", { expiresIn: "-10s" });
    const response = await request
      .post("/indexer")
      .set("Authorization", "Bearer " + expired)
      .send({ directoryPath: testDir });
    expect(response.status).toBe(401);
  });

  test("rejects an alg:none token", async () => {
    const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
    const unsigned =
      b64({ alg: "none", typ: "JWT" }) +
      "." +
      b64({
        iss: ISSUER,
        aud: AUDIENCE,
        sub: "/indexer",
        iat: Math.floor(Date.now() / 1000),
      }) +
      ".";
    const response = await request
      .post("/indexer")
      .set("Authorization", "Bearer " + unsigned)
      .send({ directoryPath: testDir });
    expect(response.status).toBe(401);
  });

  test("rejects the legacy shipped-token shape (no iss/aud/exp/sub)", async () => {
    // This is the token that used to be built into the release package. It must
    // not work any more, even against a server that holds the matching key.
    const legacy = jwt.sign(
      { provider: "tagspaces", date: Math.floor(Date.now() / 1000) },
      key,
    );
    const response = await request
      .post("/indexer")
      .set("Authorization", "Bearer " + legacy)
      .send({ directoryPath: testDir });
    expect(response.status).toBe(401);
  });

  test("rejects a token minted for a different endpoint", async () => {
    const response = await request
      .post("/indexer")
      .set("Authorization", "Bearer " + thumbToken)
      .send({ directoryPath: testDir });
    expect(response.status).toBe(401);
  });

  // --- Transport guards ---

  test("rejects a foreign Host header (DNS rebinding)", async () => {
    // The socket is destroyed without a reply, so the client sees a transport
    // error rather than a status code.
    await expect(
      request
        .post("/indexer")
        .set("Host", "attacker.example")
        .set("Authorization", "Bearer " + token)
        .send({ directoryPath: testDir }),
    ).rejects.toThrow();
  });

  test.each([
    ["Origin", "http://attacker.example"],
    ["Referer", "http://attacker.example/"],
    ["Sec-Fetch-Site", "cross-site"],
    ["Sec-Fetch-Mode", "cors"],
    ["Cookie", "a=b"],
  ])("rejects a browser-originated request (%s)", async (header, value) => {
    const response = await request
      .post("/indexer")
      .set(header, value)
      .set("Authorization", "Bearer " + token)
      .send({ directoryPath: testDir });
    expect(response.status).toBe(403);
  });

  // --- Routing ---

  test("unknown paths get a bare 404 that does not identify the server", async () => {
    const response = await request.get("/does-not-exist");
    expect(response.status).toBe(404);
    expect(response.text).toBeFalsy();
  });

  test("the old catch-all landing page is gone", async () => {
    // GET / used to answer 200 with "Hello from the TagSpaces WS" to anyone,
    // which made the port trivial to fingerprint. It is authenticated now.
    const anon = await request.get("/");
    expect(anon.status).toBe(401);

    const authed = await request
      .get("/")
      .set("Authorization", "Bearer " + mint("/"));
    expect(authed.status).toBe(204);
    expect(authed.text).toBeFalsy();
  });

  test("rejects a wrong method on a known route", async () => {
    const response = await request
      .get("/indexer")
      .set("Authorization", "Bearer " + token);
    expect(response.status).toBe(405);
  });

  test("rejects a non-JSON content type", async () => {
    const response = await request
      .post("/indexer")
      .set("Authorization", "Bearer " + token)
      .set("Content-Type", "application/x-www-form-urlencoded")
      .send("p=" + encodeURIComponent(testDir));
    expect(response.status).toBe(415);
  });

  // --- Path validation ---

  test.each([
    ["relative path", "relative/path"],
    ["UNC path", "\\\\server\\share"],
    ["device path", "\\\\?\\C:\\Windows"],
  ])("refuses to index a %s", async (_label, directoryPath) => {
    const response = await request
      .post("/indexer")
      .set("Authorization", "Bearer " + token)
      .send({ directoryPath });
    expect(response.status).toBe(400);
  });
});
