import fs from "fs";
import pathLib from "path";
import jwt from "jsonwebtoken";
import supertest from "supertest";
import AppConfig from "@tagspaces/tagspaces-common/AppConfig";
import fswin from "fswin";
import { createWS } from "../build/ws.js";

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
    fs.unlinkSync(filePath);
    expect(fs.existsSync(filePath)).toBe(false);
  });

  /**
   * indexer cannot work with relative paths: /Users/sytolk/IdeaProjects/tagspaces/release/app/node_modules/@tagspaces/Downloads/Music
   */
  /*test("POST /indexer relative path", async () => {
    const dir = "./testdata/file-structure/supported-filestypes";
    const response = await request
      .post("/indexer")
      .set("Authorization", "Bearer " + token) // Set your auth header if needed
      .send({ directoryPath: dir });

    expect(response.status).toBe(200);

    const filePath = pathLib.join(dir, ".ts", "tsi.json");
    const pathAbsolute = pathLib.resolve(filePath);
    const fileExists = fs.existsSync(pathAbsolute);
    expect(fileExists).toBe(true);
  });*/

  test("POST /hide-folder", async () => {
    const metaFolder = pathLib.join(testDir, ".ts");
    const response = await request
      .post("/hide-folder")
      .set("Authorization", "Bearer " + token) // Set your auth header if needed
      .send({ path: metaFolder });
    if (AppConfig.isWin) {
      expect(response.status).toBe(200);
      const attrs = fswin.getAttributesSync(metaFolder);
      expect(attrs.IS_HIDDEN).toBe(true);
    } else {
      expect(response.status).toBe(200);
    }
  });

  test("POST /llama-session", async () => {
    const response = await request
      .post("/llama-session")
      .set("Authorization", "Bearer " + token) // Set your auth header if needed
      .send({ path: "/Users/sytolk/Downloads/gemma-2-2b-it-Q4_K_M.gguf" });

    expect(response.status).toBe(200);
    // Add more assertions based on expected response
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
