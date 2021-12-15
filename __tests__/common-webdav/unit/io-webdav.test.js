const {
  configure,
  isDirectory,
  listDirectoryPromise,
  getPropertiesPromise,
  loadTextFilePromise,
} = require("../../../common-webdav/io-webdav");

beforeAll(async () => {
  configure({
    username: "webdav",
    password: "1234",
    port: 8000,
  });
});

test("isDirectory", async () => {
  const isDir = await isDirectory("/bucket1");
  expect(isDir).toBe(true);
  const isFile = await isDirectory("/bucket1/.gitkeep");
  expect(isFile).toBe(false);
});

test("listDirectoryPromise", async () => {
  const list = await listDirectoryPromise("/bucket1");
  console.log(JSON.stringify(list));
});

test("getPropertiesPromise", async () => {
  const props = await getPropertiesPromise("/bucket1");
  expect(props.isFile).toBe(false);
});
test("loadTextFilePromise", async () => {
  const txt = await loadTextFilePromise(
    "/bucket1/image.png._S3rver_metadata.json"
  );
  expect(
    txt === "{\n" + '  "content-type": "application/octet-stream"\n' + "}"
  ).toBe(true);
});
