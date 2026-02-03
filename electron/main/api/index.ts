import type { IStore, IWindow, IFile, IConfig, IData } from './types'
const { ipcRenderer } = require('electron')

export const store: IStore = {
  setItem(name, item) {
    ipcRenderer.send('set-item', name, item)
  },
  async getItem(name) {
    return ipcRenderer.invoke('get-item', name)
  },
  delItem(name) {
    ipcRenderer.send('del-item', name)
  },
}

export const w: IWindow = {
  createNewWindow(opt, cfg) {
    ipcRenderer.send('window-create', opt, cfg)
  },
  async getScreenSize() {
    return ipcRenderer.invoke('get-screen-size')
  },
  setWindowOnTop(state) {
    ipcRenderer.send('window-on-top', state)
  },
  minimizeWindow() {
    ipcRenderer.send('window-min')
  },
  maximizeWindow(state, size?) {
    ipcRenderer.send('window-max', state, size)
  },
  closeWindow() {
    ipcRenderer.send('window-close')
  },
  hideWindow() {
    ipcRenderer.send('window-hide')
  },
  // 获取窗口位置
  async getWindowPosition() {
    return await ipcRenderer.invoke('get-window-position')
  },
}

export const data: IData = {
  async getVideoFrameData() {
    return await ipcRenderer.invoke('get-video-frame-data')
  },
}

export const file: IFile = {
  async getImgPath() {
    return await ipcRenderer.invoke('img-path')
  },
  async getFilePath() {
    return await ipcRenderer.invoke('select-file')
  },
  async getDirPath() {
    return await ipcRenderer.invoke('select-dir')
  },
  async readClipboard() {
    return await ipcRenderer.invoke('read-clipboard')
  },
  async writeClipboard(text: string) {
    return await ipcRenderer.invoke('write-clipboard', text)
  },
  async openPath(path: string) {
    return await ipcRenderer.invoke('open-path', path)
  },
  async readShortcutsFile(path: string) {
    return await ipcRenderer.invoke('get-shortcut', path)
  },
  async writeConfigFile(context: string) {
    return await ipcRenderer.invoke('write-config', context)
  },
  async getConfigFile() {
    return await ipcRenderer.invoke('get-config')
  },
  async selectVideoFile() {
    return await ipcRenderer.invoke('select-video-file')
  },
}

export const config: IConfig = {
  setConfigStore(obj) {
    ipcRenderer.send('store-set', obj)
  },
  storeChangeListener: callback =>
    ipcRenderer.on('store-get', (event, data) => {
      callback(data)
    }),
}
