const fs = require("fs");
const pathLib = require("path");
const jwt = require("jsonwebtoken");
const supertest = require("supertest");
const AppConfig = require("@tagspaces/tagspaces-common/AppConfig");
const { createWS } = require("../ws");

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
    "supported-filestypes"
  );

  beforeAll((done) => {
    server = createWS(port, key); // Pass your key if needed
    request = supertest(`http://127.0.0.1:${port}`);
    server.on("listening", done);
  });

  afterAll((done) => {
    server.close(done);
  });

  test("POST /thumb-gen", async () => {
    const response = await request
      .post("/thumb-gen")
      .set("Authorization", "Bearer " + token) // Set your auth header if needed
      .send([testDir]);

    expect(response.status).toBe(200);
    const filesToCheck = [
      "sample.avif.jpg",
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
    const response = await request
      .post("/indexer")
      .set("Authorization", "Bearer " + token) // Set your auth header if needed
      .send({ directoryPath: testDir });

    expect(response.status).toBe(200);

    const filePath = pathLib.join(testDir, ".ts", "tsi.json");
    const fileExists = fs.existsSync(filePath);
    expect(fileExists).toBe(true);
  });

  test("POST /hide-folder", async () => {
    const response = await request
      .post("/hide-folder")
      .set("Authorization", "Bearer " + token) // Set your auth header if needed
      .send({ path: pathLib.join(testDir, ".ts") });
    if (AppConfig.isWin) {
      expect(response.status).toBe(200);
    } else {
      expect(response.status).toBe(400);
    }
  });
  /*
  test('POST /watch-folder', async () => {
      const response = await request
          .post('/watch-folder')
          .set('Authorization', 'Bearer test-key') // Set your auth header if needed
          .send({ path: "/path/to/watch" });

      expect(response.status).toBe(200);
      // Add more assertions based on expected response
  });
   */
});
