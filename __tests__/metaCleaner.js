const { cleanMeta } = require("../metacleaner");

test("clean meta", async () => {
  // const dirPath = "C:\\Users\\smari\\OneDrive\\Картини\\Feedback";
  const dirPath = "/Users/sytolk/Documents/subs";
  const files = [];
  await cleanMeta(
    dirPath,
    (filePath) => {
      files.push(filePath);
    },
    true,
    { considerMetaJSON: false, considerThumb: true }
  );
  console.log(JSON.stringify(files));
}); //, 5000);
