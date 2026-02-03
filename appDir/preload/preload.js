"use strict";
const { ipcRenderer: ipcRenderer$1 } = require("electron");
const store = {
  setItem(name, item) {
    ipcRenderer$1.send("set-item", name, item);
  },
  async getItem(name) {
    return ipcRenderer$1.invoke("get-item", name);
  },
  delItem(name) {
    ipcRenderer$1.send("del-item", name);
  }
};
const w = {
  createNewWindow(opt, cfg) {
    ipcRenderer$1.send("window-create", opt, cfg);
  },
  async getScreenSize() {
    return ipcRenderer$1.invoke("get-screen-size");
  },
  setWindowOnTop(state) {
    ipcRenderer$1.send("window-on-top", state);
  },
  minimizeWindow() {
    ipcRenderer$1.send("window-min");
  },
  maximizeWindow(state, size) {
    ipcRenderer$1.send("window-max", state, size);
  },
  closeWindow() {
    ipcRenderer$1.send("window-close");
  },
  hideWindow() {
    ipcRenderer$1.send("window-hide");
  },
  // 获取窗口位置
  async getWindowPosition() {
    return await ipcRenderer$1.invoke("get-window-position");
  }
};
const data = {
  async getVideoFrameData() {
    return await ipcRenderer$1.invoke("get-video-frame-data");
  }
};
const file = {
  async getImgPath() {
    return await ipcRenderer$1.invoke("img-path");
  },
  async getFilePath() {
    return await ipcRenderer$1.invoke("select-file");
  },
  async getDirPath() {
    return await ipcRenderer$1.invoke("select-dir");
  },
  async readClipboard() {
    return await ipcRenderer$1.invoke("read-clipboard");
  },
  async writeClipboard(text) {
    return await ipcRenderer$1.invoke("write-clipboard", text);
  },
  async openPath(path) {
    return await ipcRenderer$1.invoke("open-path", path);
  },
  async readShortcutsFile(path) {
    return await ipcRenderer$1.invoke("get-shortcut", path);
  },
  async writeConfigFile(context) {
    return await ipcRenderer$1.invoke("write-config", context);
  },
  async getConfigFile() {
    return await ipcRenderer$1.invoke("get-config");
  },
  async selectVideoFile() {
    return await ipcRenderer$1.invoke("select-video-file");
  }
};
const config = {
  setConfigStore(obj) {
    ipcRenderer$1.send("store-set", obj);
  },
  storeChangeListener: (callback) => ipcRenderer$1.on("store-get", (event, data2) => {
    callback(data2);
  })
};
const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("api", {
  data,
  ...file,
  ...store,
  ...w,
  ...config
});
window.addEventListener("DOMContentLoaded", () => {
  const replaceText = (selector, text) => {
    const element = document.getElementById(selector);
    if (element) element.innerText = text;
  };
  for (const dependency of ["chrome", "node", "electron"]) {
    replaceText(`${dependency}-version`, process.versions[dependency]);
  }
});
