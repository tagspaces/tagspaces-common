const fs = require("fs-extra");
const {
  extractPDFcontent,
} = require("@tagspaces/tagspaces-workers/pdfTextExtractor");

function extractPdf(req, res) {
  if (req.method === "POST") {
    // console.log('POST');
    let body = "";
    req.on("data", function (data) {
      body += data;
      // console.log("Partial body: " + body);
    });
    req.on("end", async () => {
      // console.log('Body: ' + parse(body));
      try {
        const { path } = JSON.parse(body);
        const file = fs.readFileSync(path);
        const content = await extractPDFcontent(file);
        res.statusCode = content ? 200 : 400;
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Cache-Control", "no-store, must-revalidate");
        // res.write(JSON.stringify(thumbs));
        res.end(JSON.stringify({content}));
      } catch (e) {
        console.log(e);
        res.statusCode = 400;
        res.end();
      }
    });
  }
}

module.exports = {
  extractPdf,
};
