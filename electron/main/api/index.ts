import type { IStore, IWindow, IFile, IConfig, IData, IUpdate } from './types'
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
  async getVideoFrameData(...args) {
    return await ipcRenderer.invoke('get-video-frame-data', ...args)
  },
  async getVideoInfo(videoPath) {
    return await ipcRenderer.invoke('get-video-info', videoPath)
  },
  async cancelVideoFrameData() {
    return await ipcRenderer.invoke('cancel-video-frame-data')
  },
  videoFrameProgressListener(callback) {
    const listener = (event, data) => {
      callback(data)
    }
    ipcRenderer.on('video-frame-progress', listener)
    return () => {
      ipcRenderer.removeListener('video-frame-progress', listener)
    }
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
  async saveBinFile(data: number[], fileName?: string) {
    return await ipcRenderer.invoke('save-bin-file', data, fileName)
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

export const update: IUpdate = {
  async getSoftwareUpdateState() {
    return await ipcRenderer.invoke('get-software-update-state')
  },
  async resetSoftwareUpdateState() {
    return await ipcRenderer.invoke('reset-software-update-state')
  },
  async checkSoftwareUpdate() {
    return await ipcRenderer.invoke('check-software-update')
  },
  async downloadSoftwareUpdate() {
    return await ipcRenderer.invoke('download-software-update')
  },
  async cancelSoftwareUpdate() {
    return await ipcRenderer.invoke('cancel-software-update')
  },
  async installSoftwareUpdate() {
    return await ipcRenderer.invoke('install-software-update')
  },
  async openSoftwareUpdatePage() {
    return await ipcRenderer.invoke('open-software-update-page')
  },
  softwareUpdateListener(callback) {
    const listener = (event, data) => {
      callback(data)
    }
    ipcRenderer.on('software-update-state', listener)
    ipcRenderer.on('softwareUpdate', listener)
    return () => {
      ipcRenderer.removeListener('software-update-state', listener)
      ipcRenderer.removeListener('softwareUpdate', listener)
    }
  },
}
