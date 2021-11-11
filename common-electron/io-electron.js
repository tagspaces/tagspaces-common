import http from "http";
const electron = require("electron");
const ipcRenderer = electron.ipcRenderer;
const webFrame = electron.webFrame;
const wsPort = 49352;

function getDevicePaths() {
  return ipcRenderer.invoke("get-device-paths");
}

/**
 * @param language: string
 */
function setLanguage(language) {
  ipcRenderer.send("set-language", language);
}

function showMainWindow() {
  ipcRenderer.send("show-main-window", "notNeededArgument");
}

/**
 * @param zoomLevel: number
 */
function setZoomFactorElectron(zoomLevel) {
  webFrame.setZoomFactor(zoomLevel);
}

function quitApp() {
  ipcRenderer.send("quit-application", "Bye, bye...");
}

function focusWindow() {
  ipcRenderer.send("focus-window", "notNeededArgument");
}

/**
 * @param globalShortcutsEnabled: boolean
 */
function setGlobalShortcuts(globalShortcutsEnabled) {
  ipcRenderer.send("global-shortcuts-enabled", globalShortcutsEnabled);
}

/**
 * @param files: Array<string>
 */
function moveToTrash(files) {
  return ipcRenderer
    .invoke("move-to-trash", files)
    .then((result) => result && result.length > 0);
}

function openDirectory(dirPath) {
  electron.shell.showItemInFolder(dirPath);
}

function showInFileManager(filePath) {
  electron.shell.showItemInFolder(filePath);
}

function openFile(filePath) {
  electron.shell
    .openPath(filePath)
    .then(() => {
      console.log("File successfully opened " + filePath);
      return true;
    })
    .catch((e) => {
      console.log("Opening path " + filePath + " failed with " + e);
    });
}

function openUrl(url) {
  // console.log(url);
  electron.shell.openExternal(url);
}

function selectDirectoryDialog() {
  ipcRenderer.invoke("select-directory-dialog", "noArg");
}

// web service
function isWorkerAvailable() {
  try {
    const res = fetch("http://127.0.0.1:" + wsPort, {
      method: "HEAD",
    });
    return res.status === 200;
  } catch (e) {
    console.debug("isWorkerAvailable:", e);
  }
  return false;
}

/**
 * @param payload: string
 * @param endpoint: string
 * @param token: string
 */
function postRequest(payload, endpoint, token) {
  return new Promise((resolve, reject) => {
    const option = {
      hostname: "127.0.0.1",
      port: wsPort,
      method: "POST",
      path: endpoint,
      headers: {
        Authorization: "Bearer " + token,
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(payload, "utf8"),
      },
    };
    const reqPost = http
      .request(option, (resp) => {
        // .get('http://127.0.0.1:8888/thumb-gen?' + search.toString(), resp => {
        let data = "";

        // A chunk of data has been received.
        resp.on("data", (chunk) => {
          data += chunk;
        });

        // The whole response has been received. Print out the result.
        resp.on("end", () => {
          // console.log(JSON.parse(data).explanation);
          resolve(JSON.parse(data));
        });
      })
      .on("error", (err) => {
        console.log("Error: " + err.message);
        reject(err);
      });
    reqPost.write(payload);
    reqPost.end();
  });
}

/**
 * @param token
 * @param directoryPath: string
 * @param extractText: boolean
 * @param ignorePatterns: Array<string>
 */
function createDirectoryIndexInWorker(
  token,
  directoryPath,
  extractText,
  ignorePatterns
) {
  const payload = JSON.stringify({
    directoryPath,
    extractText,
    ignorePatterns,
  });
  return postRequest(payload, "/indexer", token);
}

/**
 * @param token
 * @param tmbGenerationList: Array<string>
 */
function createThumbnailsInWorker(token, tmbGenerationList) {
  // const search = new URLSearchParams(tmbGenerationList.map(s => ['p', s]));
  const payload = JSON.stringify(tmbGenerationList);
  return postRequest(payload, "/thumb-gen", token);
}

export {
  getDevicePaths,
  setLanguage,
  showMainWindow,
  setZoomFactorElectron,
  quitApp,
  focusWindow,
  setGlobalShortcuts,
  moveToTrash,
  isWorkerAvailable,
  createDirectoryIndexInWorker,
  createThumbnailsInWorker,
};
