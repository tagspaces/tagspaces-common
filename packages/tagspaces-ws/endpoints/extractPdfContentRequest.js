const fs = require("fs-extra");
const { extractPDFcontent } = require("@tagspaces/tagspaces-pdf-extraction");
const {
  collectBody,
  safeJsonParse,
  validatePath,
  sendError,
} = require("../security");

function extractPdf(req, res) {
  if (req.method === "POST") {
    collectBody(req, res)
      .then(async (body) => {
        try {
          const { path: userPath } = safeJsonParse(body);
          const safePath = validatePath(userPath);

          if (!safePath.toLowerCase().endsWith(".pdf")) {
            sendError(res, 400, "Only PDF files are supported");
            return;
          }

          const file = fs.readFileSync(safePath);
          const content = await extractPDFcontent(file);

          res.statusCode = content ? 200 : 400;
          res.setHeader("Content-Type", "application/json");
          res.setHeader("Cache-Control", "no-store, must-revalidate");
          res.end(JSON.stringify({ content }));
        } catch (e) {
          sendError(res, 400, "PDF extraction failed", e);
        }
      })
      .catch(() => {});
  }
}

module.exports = {
  extractPdf,
};
