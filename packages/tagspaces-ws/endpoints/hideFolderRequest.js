const { execFile } = require("child_process");
const { AppConfig } = require("@tagspaces/tagspaces-common");
const {
  collectBody,
  safeJsonParse,
  validatePath,
  sendError,
} = require("../security");

function hideFolder(req, res) {
  if (req.method === "POST") {
    collectBody(req, res)
      .then(async (body) => {
        try {
          const data = safeJsonParse(body);
          const dirPath = validatePath(data.path);

          function resSuccess(succeeded) {
            res.statusCode = 200;
            res.setHeader("Content-Type", "application/json");
            res.setHeader("Cache-Control", "no-store, must-revalidate");
            res.end(JSON.stringify({ success: succeeded }));
          }

          if (AppConfig.isWin) {
            execFile("attrib", ["+h", dirPath], (err) => {
              if (err) {
                console.error("attrib error:", err.message);
                return resSuccess(false);
              }
              resSuccess(true);
            });
          } else {
            resSuccess(true);
          }
        } catch (e) {
          sendError(res, 400, "Hide folder failed", e);
        }
      })
      .catch(() => {});
  }
}

module.exports = {
  hideFolder,
};
