const { ipcMain, BrowserWindow } = require('electron')
// 最小化
ipcMain.on('window-min', event => {
  const webContent = event.sender
  const win = BrowserWindow.fromWebContents(webContent)
  win.minimize()
})

// 最大化
ipcMain.on('window-max', event => {
  const webContent = event.sender
  const win = BrowserWindow.fromWebContents(webContent)
  if (win.isMaximized()) {
    win.restore()
  } else {
    win.maximize()
  }
})

// 关闭
ipcMain.on('window-close', event => {
  const webContent = event.sender
  const win = BrowserWindow.fromWebContents(webContent)
  win.close()
})