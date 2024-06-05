const fsWin = require("fswin");

function hideFolder(req, res) {
  if (req.method === "POST") {
    let body = "";
    req.on("data", function (data) {
      body += data;
      // console.log("Partial body: " + body);
    });
    req.on("end", async () => {
      // console.log('Body: ' + parse(body));
      try {
        const data = JSON.parse(body);
        const dirPath = data.path;

        fsWin.setAttributes(dirPath, { IS_HIDDEN: true }, function (succeeded) {
          res.statusCode = 200;
          res.setHeader("Content-Type", "application/json");
          res.setHeader("Cache-Control", "no-store, must-revalidate");
          res.end(JSON.stringify({ success: succeeded }));
        });
      } catch (e) {
        console.log(e);
        res.statusCode = 400;
        res.end();
      }
    });
  }
}
module.exports = {
  hideFolder,
};