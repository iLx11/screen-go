import { app, BrowserWindow, globalShortcut, IpcMainEvent, ipcMain } from 'electron'
import IWindowOption from '../interface/IWindowOption'
import IWindowConfig from '../interface/IWindowConfig'
import { join } from 'path'
const path = require('path')

// 窗口记录数组
interface IGroup {
  [index: number]: {
    windowId: number
    route: string
  }
}

export default class CreateWindow {
  // 路由与主窗口标识
  private static group: IGroup = []
  // 记录主窗口
  private static main: BrowserWindow | null | undefined = null
  // 窗口配置项
  private defaultConfig: IWindowConfig
  // 窗口默认配置
  private defaultOptions: IWindowOption

  constructor() {
    this.defaultConfig = {
      id: null, //唯一 id
      title: '', //窗口标题
      width: null, //宽度
      height: null, //高度
      minWidth: null, //最小宽度
      minHeight: null, //最小高度
      route: '', // 页面路由 URL '/manage?id=123'
      resizable: true, //是否支持调整窗口大小
      maximize: false, //是否最大化
      backgroundColor: '#eee', //窗口背景色
      data: null, //数据
      isMultiWindow: false, //是否支持多开窗口 (如果为 false，当窗体存在，再次创建不会新建一个窗体 只 focus 显示即可，，如果为 true，即使窗体存在，也可以新建一个)
      isMainWin: false, //是否主窗口创建父子窗口 --(当为 true 时会替代当前主窗口)
      parentId: null, //父窗口 id   子窗口永远显示在父窗口顶部 【父窗口可以操作】
      modal: true //模态窗口 -- 模态窗口是禁用父窗口的子窗口，创建模态窗口必须设置 parent 和 modal 选项 【父窗口不能操作】
    }
    this.defaultOptions = {
      width: 900,
      height: 700,
      //窗口是否在屏幕居中. 默认值为 false
      center: true,
      //设置为 false 时可以创建一个无边框窗口 默认值为 true。
      frame: false,
      //窗口是否在创建时显示。 默认值为 true。
      show: true,
      transparent: true,
      maxWidth: null,
      maxHeight: null,
      minWidth: 680,
      minHeight: 500,
      backgroundColor: 'rgba(0,0,0,0)',
      autoHideMenuBar: true,
      resizable: true,
      minimizable: true,
      maximizable: true,
      /* 
        【父窗口不能操作】
         模态窗口 -- 模态窗口是禁用父窗口的子窗口，创
         建模态窗口必须设置 parent 和 modal 选项
      */
      modal: true,
      parent: null,
      webPreferences: {
        // nodeIntegration: true,
        contextIsolation: true,
        // nodeIntegrationInWorker: true,
        webSecurity: false,
        // sandbox: false,
        nodeIntegration: true,
        preload: path.join(__dirname, '../preload/preload.js')
      }
    }
  }

  // 根据 id 的窗口
  public getWindowById = (id: number): any => {
    return BrowserWindow.fromId(id)
  }

  // 创建窗口
  public createWindow(configurations: object, options: object): BrowserWindow {
    // console.info(CreateWindow.group)
    // 判断是否有页面
    let windowId: number = 0
    if (
      CreateWindow.group.some((o: object, i: number) => {
        windowId = i
        return o.route === configurations.route
      })
    ) {
      console.info('window is already created')
      this.getWindowById(windowId + 1)?.blur()
      return
    }
    // 传递的配置与默认配置创建新的对象
    let windowConfig = Object.assign({}, this.defaultConfig, configurations)
    // 传递的选项与默认选项创建新的对象
    let windowOptions = Object.assign({}, this.defaultOptions, options)
    // 设定其他窗口的父窗口
    if (!windowConfig.isMainWin && CreateWindow.main) {
      windowOptions.parent = CreateWindow.main
    }
    // 创建窗口
    let win = new BrowserWindow(windowOptions)
    // console.info(windowOptions)
    console.log('window id:' + win.id)
    // 记录路由与窗口 id
    CreateWindow.group[win.id - 1] = {
      windowId: win.id,
      route: windowConfig.route
    }

    // 是否最大化
    if (windowConfig.maximize && windowConfig.resizable) {
      win.maximize()
    }
    // 是否主窗口
    if (windowConfig.isMainWin) {
      if (CreateWindow.main) {
        console.info('main window already created')
        delete CreateWindow.group[0]
        CreateWindow.main.close()
      }
      // 记录主窗口
      CreateWindow.main = win
    }
    // 窗口被清除之后，清除存储
    let that = this
    win.on('close', () => {
      CreateWindow.group.forEach((o, i) => {
        if(this.getWindowById(o.windowId) == win)
          delete CreateWindow.group[i]
        if(win == that.main)
          app.quit()
      });
      win.setOpacity(0)
    })

    // 加载页面
    let winURL: string
    if (app.isPackaged) {
      // winURL = windowConfig.route ? `app://../../dist/index.html` : `file://${path.join(__dirname, '../../dist/index.html')}`
      win.loadFile(join(__dirname, '../../dist/index.html'), { hash: windowConfig.route })
    } else {
      winURL = windowConfig.route ? `http://localhost:${process.env['VITE_DEV_SERVER_PORT']}/#${windowConfig.route}` : `http://localhost:${process.env['VITE_DEV_SERVER_PORT']}/#`
      win.loadURL(winURL)
    }
    console.info('new window address -> ', winURL)
    win.setMenu(null)
    // 开启开发工具窗口
    // win.webContents.openDevTools()
    // win.on('hide', () => win.webContents.closeDevTools())
    // 全局快捷键注册
    globalShortcut.register('CommandOrControl+Shift+i', function () {
      win.webContents.openDevTools()
    })
    win.once('ready-to-show', () => {
      win.show()
    })
    // 返回创建的窗口
    return win
  }
}
