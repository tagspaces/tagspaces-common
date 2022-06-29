const { createWebDAVServer } = require("./webdavserver-v2");
const clone = require("./git_clone");

clone("https://github.com/tagspaces/testdata", "testdata", (dataDir) => {
  // const dataDir = path.resolve(__dirname, "../../__tests__/common-aws/buckets");
  const server = createWebDAVServer(
    "basic",
    dataDir,
    8080
  );
  server
    .start()
    .then(() => {
      console.log("Server started");
      return true;
    })
    .catch((e) => console.error(e));

  process.on("SIGTERM", () => {
    server.stop();
    process.exit(0);
  });
  process.on("SIGINT", () => {
    server.stop();
    process.exit(0);
  });
});
