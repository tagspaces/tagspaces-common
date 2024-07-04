const {
  listDirectoryPromise,
  loadTextFilePromise,
  saveTextFilePromise,
} = require("@tagspaces/tagspaces-common-node/io-node");
const { persistIndex, createIndex } = require("@tagspaces/tagspaces-indexer");
const path = require("path");

function handleIndexer(req, res) {
  if (req.method === "POST") {
    let body = "";
    req.on("data", function (data) {
      body += data;
      // console.log("Partial body: " + body);
    });
    req.on("end", () => {
      try {
        // let directoryPath;
        /*if (body.startsWith("directoryPath=")) {
                  directoryPath = decodeURIComponent(body.substr(14));
                } else {*/
        //  const params = JSON.parse(body);
        //  directoryPath = params.directoryPath;
        const { directoryPath, extractText, ignorePatterns } = JSON.parse(body);

        const mode = ["extractThumbPath"];
        if (extractText) {
          mode.push("extractTextContent");
        }
        return createIndex(
          path.resolve(directoryPath),
          listDirectoryPromise,
          loadTextFilePromise,
          mode,
          ignorePatterns ? ignorePatterns : []
        )
          .then((directoryIndex) => {
            return persistIndex(
              { path: directoryPath, saveTextFilePromise },
              directoryIndex
            )
              .then((success) => {
                if (success) {
                  console.log("Index generated in folder: " + directoryPath);
                  res.statusCode = 200;
                  res.setHeader("Content-Type", "application/json");
                  res.setHeader("Cache-Control", "no-store, must-revalidate");
                  // res.write(JSON.stringify(thumbs));
                  res.end(JSON.stringify({ success }));
                }
              })
              .catch((err) => {
                handleError(res, err);
              });
          })
          .catch((err) => {
            handleError(res, err);
          });
      } catch (e) {
        handleError(res, e);
      }
    });
  }
}

function handleError(res, err) {
  console.error(err);
  res.statusCode = 400;
  res.setHeader("Content-Type", "application/json");
  res.end(
    JSON.stringify({
      success: false,
      error: err && err.message ? err.message : err,
    })
  );
}

module.exports = {
  handleIndexer,
};
