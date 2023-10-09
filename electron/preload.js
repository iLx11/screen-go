const { contextBridge, ipcRenderer } = require('electron')
// const handleSend = async (vue_params) => {
//   let fallback = await ipcRenderer.invoke('sent-event', vue_params)
//   return fallback
// }
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
contextBridge.exposeInMainWorld('myApi', {
  // handleSend: handleSend
  minimizeWindow,
  maximizeWindow,
  closeWindow
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