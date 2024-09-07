"use strict";
const { contextBridge, ipcRenderer } = require("electron");
const selectVideoFile = async () => {
  return await ipcRenderer.invoke("select-video-file");
};
const getVideoFrameData = async (videPath, resizeWidth, resizeHeight, videoDur, videoFrame, threshold = 120, ...configArray) => {
  return await ipcRenderer.invoke(
    "get-video-frame-data",
    videPath,
    resizeWidth,
    resizeHeight,
    videoDur,
    videoFrame,
    threshold,
    ...configArray
  );
};
const minimizeWindow = () => {
  ipcRenderer.send("window-min");
};
const maximizeWindow = () => {
  ipcRenderer.send("window-max");
};
const closeWindow = () => {
  ipcRenderer.send("window-close");
};
const resizeImage = async (resizeWidth, resizeHeight, editorPicData, colorMode) => {
  return await ipcRenderer.invoke(
    "pic-data-editor",
    resizeWidth,
    resizeHeight,
    editorPicData,
    colorMode
  );
};
const generateResultArray = async (picData, threshold = 120, ...configArray) => {
  return ipcRenderer.invoke(
    "pic-data-parse",
    picData,
    threshold,
    ...configArray
  );
};
contextBridge.exposeInMainWorld("myApi", {
  getVideoFrameData,
  selectVideoFile,
  minimizeWindow,
  maximizeWindow,
  closeWindow,
  resizeImage,
  generateResultArray
});
window.addEventListener("DOMContentLoaded", () => {
  const replaceText = (selector, text) => {
    const element = document.getElementById(selector);
    if (element)
      element.innerText = text;
  };
  for (const dependency of ["chrome", "node", "electron"]) {
    replaceText(`${dependency}-version`, process.versions[dependency]);
  }
});
