const {
  processAllThumbnails,
} = require("@tagspaces/tagspaces-workers/tsnodethumbgen");
const {
  collectBody,
  safeJsonParse,
  validatePaths,
  sendError,
} = require("../security");

function handleThumbGen(req, res) {
  const baseURL = "http://127.0.0.1/";
  const reqUrl = new URL(req.url, baseURL);

  const generatePdf = reqUrl.searchParams.has("pdf")
    ? reqUrl.searchParams.get("pdf")
    : false;

  const extractPdfContent = reqUrl.searchParams.has("pdfContent")
    ? reqUrl.searchParams.get("pdfContent")
    : false;

  if (req.method === "POST") {
    collectBody(req, res)
      .then(async (body) => {
        try {
          let arrayPaths;
          if (body.startsWith("p=")) {
            arrayPaths = [decodeURIComponent(body.substr(2))];
          } else {
            arrayPaths = safeJsonParse(body);
          }

          const safePaths = validatePaths(arrayPaths);

          let extractPDFfunction;
          if (
            extractPdfContent &&
            safePaths.some((p) => p.toLowerCase().endsWith(".pdf"))
          ) {
            extractPDFfunction =
              require("@tagspaces/tagspaces-pdf-extraction").extractPDFcontent;
          }

          const thumbs = [];
          let statusCode = 200;
          for (const filePath of safePaths) {
            const success = await processAllThumbnails(
              filePath,
              generatePdf,
              extractPDFfunction,
            );
            if (success) {
              if (typeof success === "object") {
                thumbs.push(success);
              }
            } else {
              console.warn("Thumbnails not generated");
              statusCode = 400;
            }
          }

          res.statusCode = statusCode;
          res.setHeader("Content-Type", "application/json");
          res.setHeader("Cache-Control", "no-store, must-revalidate");
          res.end(JSON.stringify(thumbs));
        } catch (e) {
          sendError(res, 400, "Thumbnail generation failed", e);
        }
      })
      .catch(() => {});
  }
}

module.exports = {
  handleThumbGen,
};
