
const { app, protocol, BrowserWindow, globalShortcut } = require('electron')
// 需在当前文件内开头引入 Node.js 的 'path' 模块
const path = require('path')
require('../controller/windowControl')
require('../controller/picDataEditor')
// require('./EditorConfig')
app.commandLine.appendSwitch("--ignore-certificate-errors", "true");
// Scheme must be registered before the app is ready
protocol.registerSchemesAsPrivileged([
    { scheme: "app", privileges: { secure: true, standard: true } }
]);

const createWindow = () => {
    const win = new BrowserWindow({
        //窗口是否在屏幕居中. 默认值为 false
        center: true,
        //设置为 false 时可以创建一个无边框窗口 默认值为 true。
        frame: false,
        //窗口是否在创建时显示。 默认值为 true。
        show: true,
        width: 999,
        height: 773,
        transparent: true,
        maxWidth: 999,
        maxHeight: 773,
        minWidth: 688,
        minHeight: 560,
        webPreferences: {
            // nodeIntegration: true,
            // contextIsolation:false,
            // nodeIntegrationInWorker: true,
            // webSecurity: false,
            // sandbox: false,
            nodeIntegration: true,
            preload: path.join(__dirname, './preload.js'),
        }
    })
    win.setMenu(null)
    if (app.isPackaged) {
        win.loadURL(`file://${path.join(__dirname, '../dist/index.html')}`)
        // win.webContents.openDevTools()

    } else {
        // win.loadURL('http://127.0.0.1:5173/')
        win.loadURL('http://localhost:5173/')
        win.webContents.openDevTools()
    } 
    globalShortcut.register("CommandOrControl+Shift+i", function () {
        win.webContents.openDevTools();
    });

}

app.whenReady().then(() => {

    createWindow()

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
})



