const { extractTextContent } = require("../../common-node/io-node");

test("extractTextContent", async () => {
  const index = extractTextContent('test.md','# TEST \n # TEST \n # TEST2');
  expect(index === "test test2").toBe(true);
  const indexHtml = extractTextContent('test.html','<h1>TEST</h1><h1>TEST</h1><h5>TEST2</h5>');
  expect(indexHtml === "test test2").toBe(true);
  const indexTxt = extractTextContent('test.txt','test test test2 ');
  expect(indexTxt === "test test2").toBe(true);

  const md = '[github](http://github.com) not link inline14\n' +
      '\n' +
      'new line nn\n' +
      '\n' +
      'gggggggg125\n' +
      '\n' +
      '*   [ ] hh\n' +
      '\n' +
      '*   [ ] jj2\n' +
      '\n' +
      'mm126\n' +
      '\n' +
      '$$\n' +
      '\\begin{aligned}\n' +
      'T( (v_1 + v_2) \\otimes w) &= T(v_1 \\otimes w) + T(v_2 \\otimes w) \\\\\n' +
      'T( v \\otimes (w_1 + w_2)) &= T(v \\otimes w_1) + T(v \\otimes w_2) \\\\\n' +
      'T( (\\alpha v) \\otimes w ) &= T( \\alpha ( v \\otimes w) ) \\\\\n' +
      'T( v \\otimes (\\alpha w) ) &= T( \\alpha ( v \\otimes w) ) \\\\\n' +
      '\\end{aligned}\n' +
      '$$';
  const indexMd = extractTextContent('test.md',md);
  expect(indexMd === "githubhttpgithubcom not link inline14  new line nn gggggggg125 mm126 beginalignedt v1  v2 otimes w  tv1 otimes w  tv2 otimes w t v otimes w1  w2  tv otimes w1  tv otimes w2 t alpha v otimes w   t alpha  v otimes w  t v otimes alpha w   t alpha  v otimes w  endaligned").toBe(true);
});
