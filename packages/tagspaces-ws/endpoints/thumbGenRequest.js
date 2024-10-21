const {
  processAllThumbnails,
} = require("@tagspaces/tagspaces-workers/tsnodethumbgen");

function handleThumbGen(req, res) {
  const baseURL = "http://" + req.headers.host + "/";
  const reqUrl = new URL(req.url, baseURL);

  const generatePdf = reqUrl.searchParams.has("pdf")
    ? reqUrl.searchParams.get("pdf")
    : false;

  const extractPdfContent = reqUrl.searchParams.has("pdfContent")
    ? reqUrl.searchParams.get("pdfContent")
    : false;

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
        let arrayPaths;
        // handle html form data
        if (body.startsWith("p=")) {
          arrayPaths = [decodeURIComponent(body.substr(2))];
        } else {
          arrayPaths = JSON.parse(body);
        }
        let extractPDFfunction;
        if (extractPdfContent) {
          extractPDFfunction =
            require("@tagspaces/tagspaces-pdf-extraction").extractPDFcontent;
        }

        const thumbs = [];
        let statusCode = 200;
        if (arrayPaths && arrayPaths.length > 0) {
          for (const path of arrayPaths) {
            const success = await processAllThumbnails(
              path,
              generatePdf,
              extractPDFfunction
            );
            if (success) {
              // console.log("Thumbnails generated");
              if (typeof success === "object") {
                thumbs.push(success);
              }
            } else {
              console.warn("Thumbnails not generated");
              statusCode = 400;
            }
          }
        }

        res.statusCode = statusCode;
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Cache-Control", "no-store, must-revalidate");
        // res.write(JSON.stringify(thumbs));
        res.end(JSON.stringify(thumbs));
      } catch (e) {
        console.log(e);
        res.statusCode = 400;
        res.end();
      }
    });
  }
}

module.exports = {
  handleThumbGen,
};
