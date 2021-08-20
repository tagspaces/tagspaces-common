const { hasIndex } = require("../../common-node/indexer");

test("hasIndex", async () => {
  const dirPath = "C:\\Users\\smari\\OneDrive\\Desktop";
  // const dirPath = "/Users/sytolk/Documents/subs";
  const indexExist = await hasIndex(dirPath);
  console.log("indexExist:" + indexExist);
}); //, 5000);
