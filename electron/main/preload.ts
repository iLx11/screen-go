const { contextBridge, ipcRenderer } = require('electron')

// 选择视频文件
const selectVideoFile = async () => {
  return await ipcRenderer.invoke('select-video-file')
}

// 视频按帧数取模
const getVideoFrameData = async (
  videPath,
  resizeWidth,
  resizeHeight,
  videoDur,
  videoFrame,
  threshold = 120,
  ...configArray
) => {
  return await ipcRenderer.invoke(
    'get-video-frame-data',
    videPath,
    resizeWidth,
    resizeHeight,
    videoDur,
    videoFrame,
    threshold,
    ...configArray
  )
}

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
const resizeImage = async (
  resizeWidth,
  resizeHeight,
  editorPicData,
  colorMode
) => {
  return await ipcRenderer.invoke(
    'pic-data-editor',
    resizeWidth,
    resizeHeight,
    editorPicData,
    colorMode
  )
}

// 生成数据
const generateResultArray = async (
  picData,
  threshold = 120,
  ...configArray
) => {
  return ipcRenderer.invoke(
    'pic-data-parse',
    picData,
    threshold,
    ...configArray
  )
}

contextBridge.exposeInMainWorld('myApi', {
  getVideoFrameData,
  selectVideoFile,
  minimizeWindow,
  maximizeWindow,
  closeWindow,
  resizeImage,
  generateResultArray,
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
