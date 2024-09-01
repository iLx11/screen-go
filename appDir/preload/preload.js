"use strict";
const { contextBridge, ipcRenderer } = require("electron");
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
  const data = await ipcRenderer.invoke("pic-data-editor", resizeWidth, resizeHeight, editorPicData, colorMode);
  return data;
};
const generateResultArray = async (picData, threshold = 120, ...configArray) => {
  const data = ipcRenderer.invoke("pic-data-parse", picData, threshold, ...configArray);
  return data;
};
contextBridge.exposeInMainWorld("myApi", {
  // handleSend: handleSend
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
