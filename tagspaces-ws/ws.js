"use strict";
const ws = require("http");
// const { parse } = require('querystring');
const workers = require("tagspaces-workers/tsnodethumbgen");

/**
 * curl -d '["/Users/sytolk/IdeaProjects/tagspaces/tests/testdata-tmp/file-structure/supported-filestypes/sample.png","/Users/sytolk/IdeaProjects/tagspaces/tests/testdata-tmp/file-structure/supported-filestypes/sample.jpg"]' -H "Content-Type: application/json" -X POST http://127.0.0.1:2000/thumb-gen
 */
module.exports.createWS = function (port) {
  const hostname = "127.0.0.1";

  const requestHandler = (req, res) => {
    const baseURL = "http://" + req.headers.host + "/";
    const reqUrl = new URL(req.url, baseURL);
    if (reqUrl.pathname === "/thumb-gen") {
      const generatePdf = reqUrl.searchParams.has("pdf")
        ? reqUrl.searchParams.get("pdf")
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

            const thumbs = [];
            if (arrayPaths && arrayPaths.length > 0) {
              for (const path of arrayPaths) {
                const success = await workers.processAllThumbnails(
                  path,
                  generatePdf
                );
                if (success) {
                  // console.log("Thumbnails generated");
                  if (typeof success === "object") {
                    thumbs.push(success);
                  }
                } else {
                  console.warn("Thumbnails not generated");
                }
              }
            }

            res.statusCode = 200;
            res.setHeader("Content-Type", "application/json");
            res.setHeader("Cache-Control", "no-store, must-revalidate");
            // res.write(JSON.stringify(thumbs));
            res.end(JSON.stringify(thumbs));
          } catch (e) {
            console.log(e);
          }
        });
      }
    } else {
      res.statusCode = 200;
      res.setHeader("Content-Type", "text/html");
      res.end(
        "<h1>Hello from Tagspaces WS.</h1>" +
          "<p>" +
          '<form name="thumbgen" action="thumb-gen" method="post">\n' +
          '  <label for="p">Generate Thumbnails file/folder:</label>\n' +
          '  <input type="text" name="p"/>\n' +
          "  <button>Submit</button>\n" +
          "</form>" +
          "</p>"
      );
    }
  };

  const server = ws.createServer(requestHandler);

  const errorHandler = (error) => {
    if (error.syscall !== "listen") {
      throw error;
    }
    const address = server.address();
    const bind =
      typeof address === "string" ? "pipe " + address : "port: " + port;
    switch (error.code) {
      case "EACCES":
        console.error(bind + " requires elevated privileges.");
        process.exit(1);
        break;
      case "EADDRINUSE":
        console.error(bind + " is already in use.");
        process.exit(1);
        break;
      default:
        throw error;
    }
  };
  server.on("error", errorHandler);
  server.listen(port, hostname, () => {
    console.log(
      `Server running at http://${hostname}:${port}/ and will accept connections from ${hostname} only`
    );
  });
};