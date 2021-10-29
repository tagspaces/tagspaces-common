const { extractTextContent } = require("../../common-node/io-node");

test("extractTextContent", async () => {
  const index = extractTextContent('test.md','# TEST \n # TEST \n # TEST2');
  expect(index === "test test2").toBe(true);
  const indexHtml = extractTextContent('test.html','<h1>TEST</h1><h1>TEST</h1><h5>TEST2</h5>');
  expect(indexHtml === "test test2").toBe(true);
  const indexTxt = extractTextContent('test.txt','test test test2 ');
  expect(indexTxt === "test test2").toBe(true);
});
