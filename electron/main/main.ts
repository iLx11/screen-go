const {
  app,
  protocol,
  BrowserWindow,
  ipcMain,
  shell,
} = require('electron')
// 需在当前文件内开头引入 Node.js 的 'path' 模块
const path = require('path')

import { windowControlListener } from '../controller/windowControl'
import CreateWindow from '../controller/createWindow'
import { setItem, getItem, delItem } from '../controller/storage'
import { fileReadListener } from '../controller/fileRead'
import { ffmpegListener } from '../controller/ffmpegHandle'
import { getFilePath } from '../controller/selectDialog'

import ImageToHexArray from '../controller/ImageToHexArray'



// 窗口监听
windowControlListener()
// 文件读取
fileReadListener()
// 视频处理监听
ffmpegListener()

ipcMain.on('set-item', (event, name: string, item: string) => {
  setItem(name, item)
})

ipcMain.on('del-item', (event, name: string) => {
  delItem(name)
})

ipcMain.handle('get-item', async (event, name: string) => {
  return await getItem(name)
})

// 跳转到下载页面
ipcMain.on('latest-download', (event, link: string) => {
  shell.openExternal(link)
})

// 创建其他窗口
ipcMain.on('window-create', (event, optionObj: object, configObj: object) => {
  let cw = new CreateWindow()
  cw.createWindow(optionObj, configObj)
})

// 选取文件
ipcMain.handle('select-video-file', async () => {
  return await getFilePath()
})

// pinia
ipcMain.on('store-set', (event, objData) => {
  // 遍历窗口发送
  for (const cur of BrowserWindow.getAllWindows()) {
    if (cur != BrowserWindow.fromWebContents(event.sender)) {
      cur.webContents.send('store-get', objData)
    }
  }
})

// 创建主窗口
const createMainWindow = async () => {
  let mainW = new CreateWindow()
  mainW.createWindow(
    {
      route: '/home',
      isMainWin: true,
    },
    {
      width: 999,
      height: 773,
      minWidth: 688,
      minHeight: 560,
    }
  )
}

app.commandLine.appendSwitch('--ignore-certificate-errors', 'true')
// Scheme must be registered before the app is ready
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { secure: true, standard: true } },
])


let resizeData = ``

app.whenReady().then(async () => {
  // 创建窗口
  createMainWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow()
  })
  // const arrData = await ImageToHexArray.generate(
  //   resizeData,
  //   120,
  //   [ 1, 2, 0, 0, 1 ]
  // )
  // console.info(arrData)
})

// 关闭所有窗口
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
