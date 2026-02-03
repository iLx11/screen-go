import { app, protocol, BrowserWindow, ipcMain, shell } from 'electron'
import { windowControlListener } from '../controller/window/windowControl'
import CreateWindow from '../controller/window/createWindow'
// import { fileReadListener } from '../controller/fileRead'
import { ffmpegListener } from '../controller/media/ffmpegHandle'
import { fileListener } from '../controller/file/selectDialog'
import { storeListener } from '../controller/store/storage'

// 窗口监听
windowControlListener()
// 文件读取
fileListener()
// 视频处理监听
ffmpegListener()
// 存储
storeListener()

// pinia
ipcMain.on('store-set', (event, objData) => {
  // 遍历窗口发送
  CreateWindow.travWindowSend(
    objData,
    BrowserWindow.fromWebContents(event.sender),
  )
})

app.commandLine.appendSwitch('--ignore-certificate-errors', 'true')
// Scheme must be registered before the app is ready
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { secure: true, standard: true } },
])

app.whenReady().then(() => {
  // 创建窗口
  createMainWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow()
  })
})

const WINDOW_WIDTH = 1000
const WINDOW_HEIGHT = 830

// 创建主窗口
const createMainWindow = async () => {
  let mainW = new CreateWindow()
  console.info('createMainWindow')
  mainW.createWindow({
    route: '/',
    isMainWin: true,
    maxWidth: WINDOW_WIDTH,
    maxHeight: WINDOW_HEIGHT,
    width: WINDOW_WIDTH,
    height: WINDOW_HEIGHT,
    minWidth: WINDOW_WIDTH,
    minHeight: WINDOW_HEIGHT,
    resizable: true,
    windowName: 'main',
  })
}

// 关闭所有窗口
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
