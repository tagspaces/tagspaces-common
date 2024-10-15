"use strict";
import ws from "http";
import { verifyAuth } from "./auth.js";
import { watchFolder } from "./endpoints/watchFolderRequest.js";
import { hideFolder } from "./endpoints/hideFolderRequest.js";
import { defaultRequest } from "./endpoints/defaultRequest.js";
import { handleIndexer } from "./endpoints/indexerRequest.js";
import { handleThumbGen } from "./endpoints/thumbGenRequest.js";
import {
  startNewChatSession,
  sendPromptMessage,
} from "./endpoints/llamaRequest.js";

/**
 * curl -d '["/Users/sytolk/IdeaProjects/tagspaces/tests/testdata-tmp/file-structure/supported-filestypes/sample.png","/Users/sytolk/IdeaProjects/tagspaces/tests/testdata-tmp/file-structure/supported-filestypes/sample.jpg"]' -H "Content-Type: application/json" -X POST http://127.0.0.1:2000/thumb-gen
 * curl -d '{"directoryPath":"/Users/sytolk/IdeaProjects/tagspaces/tests/testdata-tmp/file-structure/supported-filestypes/"}' -H "Content-Type: application/json" -X POST http://127.0.0.1:2000/indexer
 */
export function createWS(port, key) {
  const hostname = "127.0.0.1";

  const requestHandler = (req, res) => {
    const baseURL = "http://" + req.headers.host + "/";
    const reqUrl = new URL(req.url, baseURL);
    if (reqUrl.pathname === "/thumb-gen") {
      if (!verifyAuth(req.headers.authorization, res, key)) {
        return;
      }
      handleThumbGen(req, res);
    } else if (reqUrl.pathname === "/indexer") {
      if (!verifyAuth(req.headers.authorization, res, key)) {
        return;
      }
      handleIndexer(req, res);
    } else if (reqUrl.pathname === "/llama-session") {
      if (!verifyAuth(req.headers.authorization, res, key)) {
        return;
      }
      startNewChatSession(req, res);
    } else if (reqUrl.pathname === "/llama-message") {
      if (!verifyAuth(req.headers.authorization, res, key)) {
        return;
      }
      sendPromptMessage(req, res);
    } else if (reqUrl.pathname === "/watch-folder") {
      if (!verifyAuth(req.headers.authorization, res, key)) {
        return;
      }
      watchFolder(req, res);
    } else if (reqUrl.pathname === "/hide-folder") {
      if (!verifyAuth(req.headers.authorization, res, key)) {
        return;
      }
      hideFolder(req, res);
    } else {
      defaultRequest(req, res);
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
  return server;
}
