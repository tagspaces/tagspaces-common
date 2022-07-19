/*
import {
    getLocationPath,
    listMetaDirectoryPromise,
    listDirectoryPromise,
    saveTextFilePromise,
    saveFilePromise,
    saveBinaryFilePromise,
    getPropertiesPromise,
    isDirectory,
    loadTextFilePromise,
    getFileContentPromise,
    extractTextContent,
    createDirectoryPromise,
    copyFilePromise,
    renameFilePromise,
    renameDirectoryPromise,
    deleteFilePromise,
    deleteDirectoryPromise,
    watchDirectory,
    createDirectoryTree,
} from "@tagspaces/tagspaces-common-node/io-node";

import {
    getDevicePaths,
    setLanguage,
    showMainWindow,
    setZoomFactorElectron,
    quitApp,
    focusWindow,
    setGlobalShortcuts,
    moveToTrash,
    openDirectory,
    showInFileManager,
    openFile,
    openUrl,
    selectDirectoryDialog,
    isWorkerAvailable,
    createDirectoryIndexInWorker,
    createThumbnailsInWorker
} from "@tagspaces/tagspaces-common-electron/io-electron";

export {
    getLocationPath,
    listMetaDirectoryPromise,
    listDirectoryPromise,
    saveTextFilePromise,
    saveFilePromise,
    saveBinaryFilePromise,
    getPropertiesPromise,
    isDirectory,
    loadTextFilePromise,
    getFileContentPromise,
    extractTextContent,
    createDirectoryPromise,
    copyFilePromise,
    renameFilePromise,
    renameDirectoryPromise,
    deleteFilePromise,
    deleteDirectoryPromise,
    watchDirectory,
    createDirectoryTree,
    getDevicePaths,
    setLanguage,
    showMainWindow,
    setZoomFactorElectron,
    quitApp,
    focusWindow,
    setGlobalShortcuts,
    moveToTrash,
    openDirectory,
    showInFileManager,
    openFile,
    openUrl,
    selectDirectoryDialog,
    isWorkerAvailable,
    createDirectoryIndexInWorker,
    createThumbnailsInWorker
};
*/

const ioNode = require("@tagspaces/tagspaces-common-node/io-node");
const ioElectron = require("@tagspaces/tagspaces-common-electron/io-electron");

module.exports = {
    ...ioNode,
    ...ioElectron,
};
