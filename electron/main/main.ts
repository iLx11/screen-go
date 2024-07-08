const { app, protocol, BrowserWindow, ipcMain, dialog, shell } = require('electron')
// 需在当前文件内开头引入 Node.js 的 'path' 模块
const path = require('path')

import { windowControlListener } from '../controller/windowControl'
import CreateWindow from '../controller/createWindow'
import { getFilePath, getConfigFile, writeConfigFile } from '../controller/fileDialog'
import { picDataListener } from '../controller/picDataEditor'
import { setItem, getItem, delItem } from "../controller/storage"
import { fileReadListener } from "../controller/fileRead"
// 窗口监听
windowControlListener()
// 图片处理监听
picDataListener()
// 文件读取
fileReadListener()

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

// 选择文件夹
ipcMain.handle('write-config', async (event, fileName: string, context: string) => {
  return await writeConfigFile(fileName, context)
})

// 选取文件
ipcMain.handle('select-file', async () => {
  return await getFilePath()
})

// pinia
ipcMain.on('store-set', (event, objData) => {
  // 遍历窗口发送
  for(const cur of BrowserWindow.getAllWindows()) {
    if(cur != BrowserWindow.fromWebContents(event.sender)) {
      cur.webContents.send('store-get', objData)
    }
  }
})


// 创建主窗口
const createMainWindow = async () => {
  let mainW = new CreateWindow()
  mainW.createWindow({
    route: '/home',
    isMainWin: true,
  }, {
    width: 999,
    height: 773,
    minWidth: 688,
    minHeight: 560,
  })
}

app.commandLine.appendSwitch('--ignore-certificate-errors', 'true')
// Scheme must be registered before the app is ready
protocol.registerSchemesAsPrivileged([{ scheme: 'app', privileges: { secure: true, standard: true } }])

app.whenReady().then(() => {
  // 创建窗口
  createMainWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow()
  })
})

// 关闭所有窗口
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
