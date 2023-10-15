const { contextBridge, ipcRenderer } = require('electron')

// 最小化
const minimizeWindow = () => {
  ipcRenderer.send('window-min')
}

// 最大化
const maximizeWindow = () => {
  ipcRenderer.send('window-max')
}

// 关闭窗口
const closeWindow = () => {
  ipcRenderer.send('window-close')
}

// 裁剪图片
const resizeImage = async (resizeWidth, resizeHeight, editorPicData) => {
  const data = await ipcRenderer.invoke('pic-data-editor', resizeWidth, resizeHeight, editorPicData)
  return data
}

// 生成数据
const generateResultArray = async ( picData, configArray0,  configArray1, configArray2, configArray3) => {
  const data = ipcRenderer.invoke('pic-data-parse', picData, configArray0,  configArray1, configArray2, configArray3)
  return data
}

contextBridge.exposeInMainWorld('myApi', {
  // handleSend: handleSend
  minimizeWindow,
  maximizeWindow,
  closeWindow,
  resizeImage,
  generateResultArray
})
// 所有的 Node.js API接口 都可以在 preload 进程中被调用.
// 它拥有与Chrome扩展一样的沙盒。
window.addEventListener('DOMContentLoaded', () => {
  const replaceText = (selector, text) => {
    const element = document.getElementById(selector)
    if (element) element.innerText = text
  }

  for (const dependency of ['chrome', 'node', 'electron']) {
    replaceText(`${dependency}-version`, process.versions[dependency])
  }
})
