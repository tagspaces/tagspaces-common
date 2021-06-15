const { cleanMeta } = require("../metacleaner");

test("clean meta", async () => {
  // const dirPath = "C:\\Users\\smari\\OneDrive\\Картини\\Feedback";
  const dirPath = "/Users/sytolk/Documents/subs";
  await cleanMeta(dirPath);
}, 5000);
