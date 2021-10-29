"use strict";
const ws = require("http");
const jwt = require("jsonwebtoken");
// const { parse } = require('querystring');
const {
  processAllThumbnails,
} = require("@tagspaces/tagspaces-workers/tsnodethumbgen");
// const { indexer } = require("tagspaces-workers/tsnodeindexer");
const {
  persistIndex,
  createIndex,
} = require("@tagspaces/tagspaces-platforms/indexer");

/**
 * curl -d '["/Users/sytolk/IdeaProjects/tagspaces/tests/testdata-tmp/file-structure/supported-filestypes/sample.png","/Users/sytolk/IdeaProjects/tagspaces/tests/testdata-tmp/file-structure/supported-filestypes/sample.jpg"]' -H "Content-Type: application/json" -X POST http://127.0.0.1:2000/thumb-gen
 * curl -d '{"directoryPath":"/Users/sytolk/IdeaProjects/tagspaces/tests/testdata-tmp/file-structure/supported-filestypes/"}' -H "Content-Type: application/json" -X POST http://127.0.0.1:2000/indexer
 */
module.exports.createWS = function (port, key) {
  const hostname = "127.0.0.1";

  const verifyAuth = (token, res) => {
    if (!token) {
      console.error("No Auth header provided!");
    } else {
      try {
        const PREFIX = "Bearer ";
        if (token.startsWith(PREFIX)) {
          token = token.slice(PREFIX.length);
        }
        const decoded = jwt.verify(token, key);
        if (decoded) {
          return true;
        }
      } catch (err) {
        console.error(err);
      }
    }
    res.statusCode = 401;
    res.end();
    return false;
  };

  const requestHandler = (req, res) => {
    const baseURL = "http://" + req.headers.host + "/";
    const reqUrl = new URL(req.url, baseURL);
    if (reqUrl.pathname === "/thumb-gen") {
      if (!verifyAuth(req.headers.authorization, res)) {
        return;
      }
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
                const success = await processAllThumbnails(path, generatePdf);
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
            res.statusCode = 400;
            res.end();
          }
        });
      }
    } else if (reqUrl.pathname === "/indexer") {
      if (!verifyAuth(req.headers.authorization, res)) {
        return;
      }
      if (req.method === "POST") {
        let body = "";
        req.on("data", function (data) {
          body += data;
          // console.log("Partial body: " + body);
        });
        req.on("end", async () => {
          try {
            // let directoryPath;
            /*if (body.startsWith("directoryPath=")) {
              directoryPath = decodeURIComponent(body.substr(14));
            } else {*/
            //  const params = JSON.parse(body);
            //  directoryPath = params.directoryPath;
            const { directoryPath, extractText, ignorePatterns } =
              JSON.parse(body);

            const mode = ["extractThumbPath"];
            if (extractText) {
              mode.push('extractTextContent');
            }
            createIndex(
              directoryPath,
              mode,
              ignorePatterns ? ignorePatterns : []
            ).then((directoryIndex) => {
              persistIndex(directoryPath, directoryIndex).then((success) => {
                if (success) {
                  console.log("Index generated in folder: " + directoryPath);
                  res.statusCode = 200;
                  res.setHeader("Content-Type", "application/json");
                  res.setHeader("Cache-Control", "no-store, must-revalidate");
                  // res.write(JSON.stringify(thumbs));
                  res.end(JSON.stringify({ success }));
                }
              });
            });
          } catch (e) {
            console.log(e);
            res.statusCode = 400;
            res.setHeader("Content-Type", "application/json");
            res.end({ success: false, error: e.message });
          }
        });
      }
    } else {
      res.statusCode = 200;
      res.setHeader("Content-Type", "text/html");
      res.end(
        "<!DOCTYPE html>\n" +
          "<html>\n" +
          "<head>\n" +
          "  <title>TagSpaces WS</title>\n" +
          '  <meta charset="utf-8">\n' +
          '  <meta name="viewport"\n' +
          '    content="user-scalable=no, initial-scale=1, maximum-scale=1, minimum-scale=1, width=device-width">\n' +
          "</head>\n" +
          '<body style="overflow: hidden; margin: 0; padding: 0;">\n' +
          "  <div\n" +
          '    style="text-align: center; width: 100%; height: 100%; position:absolute; background-color: #F5F5F5; user-select: none;"\n' +
          '    class="appBackgroundTile">\n' +
          '    <div style="top:45%; width: 100%; text-align: center; position:absolute;">\n' +
          '      <svg style="vertical-align: middle" xmlns="http://www.w3.org/2000/svg" version="1.1" width="100" height="100">\n' +
          '        <g id="layer1" transform="matrix(0.33346217,0,0,0.33346217,-0.01300084,-250.91)">\n' +
          '          <rect style="fill:none;fill-opacity:1;stroke:none" id="rect3052-8-1" width="299.42227" height="299.42227"\n' +
          '            x="-0.019505024" y="752.95935" />\n' +
          '          <path style="fill:#ffffff;fill-opacity:1;stroke:none"\n' +
          '            d="m 181.90177,787.75394 70.88695,43.53834 C 180.29225,977.67059 187.41436,950.59754 124.58989,989.154 L 65.05006,905.90077 Z"\n' +
          '            id="rect3052-8-2-2" />\n' +
          '          <ellipse style="fill:#616577;fill-opacity:1;stroke:none" id="path4875-4-7-5-6-2" cx="192.4187"\n' +
          '            cy="851.11481" rx="15.970615" ry="15.782593" />\n' +
          "          <path\n" +
          '            style="fill:none;stroke:#a466aa;stroke-width:27.50978279;stroke-linecap:butt;stroke-linejoin:miter;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:1"\n' +
          '            d="M 159.73623,964.91671 134.54529,941.61879" id="path3108-5-39-8" />\n' +
          "          <path\n" +
          '            style="fill:none;stroke:#ffffff;stroke-width:34.19813538;stroke-linecap:butt;stroke-linejoin:miter;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:1"\n' +
          '            d="m 162.16161,795.17204 90.03628,0.34544 0,86.1724 -115.50748,117.79375 -88.457192,-81.6665 z"\n' +
          '            id="path3923-1-1-4-9-8" />\n' +
          "          <path\n" +
          '            style="fill:#f7901e;fill-opacity:1;stroke:#33b5be;stroke-width:27.50978279;stroke-linecap:butt;stroke-linejoin:miter;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:1"\n' +
          '            d="m 204.81469,910.87834 -50.38182,-45.3016" id="path3108-9-1-76-7" />\n' +
          "          <path\n" +
          '            style="fill:#616577;fill-opacity:1;stroke:#f7901e;stroke-width:27.50978279;stroke-linecap:butt;stroke-linejoin:miter;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:1"\n' +
          '            d="M 182.93838,938.7066 144.48907,904.40668" id="path3108-0-7-9-8" />\n' +
          "          <path\n" +
          '            style="fill:none;stroke:#616577;stroke-width:31.96374702;stroke-linecap:butt;stroke-linejoin:miter;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:1"\n' +
          '            d="m 164.34385,800.70161 83.03644,0 0,79.10209 -110.49206,113.42316 -82.031957,-75.83333 z"\n' +
          '            id="path3923-1-1-4-9" />\n' +
          "        </g>\n" +
          "      </svg><br>\n" +
          '      <span style="font-family: arial; font-size: 15px;">Hello from the TagSpaces WS <br />I am used for search index creation and thumbnail generation</span>\n' +
          "    </div>\n" +
          "  </div>\n" +
          "</body>\n" +
          "</html>"
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
