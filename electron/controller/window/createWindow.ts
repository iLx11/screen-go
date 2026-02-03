import {
  app,
  BrowserWindow,
  globalShortcut,
  BrowserWindowConstructorOptions,
} from 'electron'
import IWindowConfig from '../../interface/IWindowOption'
import { join } from 'path'
const path = require('path')

// 是否开发环境
const DEV = true

// 窗口记录数组
interface IWindowMap {
  windowId: number
  route: string
  windowName: string
  window: BrowserWindow
}

export default class CreateWindow {
  // 路由与主窗口标识
  private static windowMap: Map<string, IWindowMap> = new Map()
  // 窗口配置项
  private defaultConfig: IWindowConfig

  constructor() {
    this.defaultConfig = {
      // 页面路由
      route: '',
      parentId: null,
      isMainWin: false,
      width: 900,
      height: 700,
      //窗口是否在屏幕居中. 默认值为 false
      center: true,
      transparent: true,
      //设置为 false 时可以创建一个无边框窗口 默认值为 true。
      frame: false,
      titleBarStyle: 'hidden',
      backgroundColor: '#00000000',
      //窗口是否在创建时显示。 默认值为 true。
      show: false,
      maxWidth: null,
      maxHeight: null,
      minWidth: null,
      minHeight: null,
      autoHideMenuBar: true,
      resizable: true,
      minimizable: true,
      maximizable: true,
      windowName: '',
      /* 
        【父窗口不能操作】
         模态窗口 -- 模态窗口是禁用父窗口的子窗口，创
         建模态窗口必须设置 parent 和 modal 选项
      */
      modal: false,
      parent: null,
      titleBarOverlay: false,
      maximize: false,
      webPreferences: {
        devTools: DEV,
        // nodeIntegration: true,
        contextIsolation: true,
        // nodeIntegrationInWorker: true,
        webSecurity: false,
        // sandbox: false,
        nodeIntegration: true,
        preload: path.join(__dirname, '../preload/preload.js'),
        // 禁用离屏渲染
        offscreen: false,
        // 防止后台渲染节流
        backgroundThrottling: false,
      },
    }
  }

  /********************************************************************************
   * @brief: 遍历窗口发送
   * @param {any} data 发送的数据
   * @param {BrowserWindow} curWindow 当前窗口
   * @return {*}
   ********************************************************************************/
  public static travWindowSend = (
    data: any,
    curWindow: BrowserWindow = null
  ) => {
    CreateWindow.windowMap.forEach((value, key) => {
      // 排除当前窗口
      if (curWindow && value.window == curWindow) {
        return
      }
      value.window.webContents.send('store-get', data)
    })
  }

  /********************************************************************************
   * @brief: 按名称发送给窗口
   * @param {string} windowName 窗口名称
   * @param {any} data 发送的数据
   * @return {*}
   ********************************************************************************/
  public static sendToWindow = (windowName: string, data: any) => {
    if (CreateWindow.windowMap.has(windowName)) {
      CreateWindow.windowMap
        .get(windowName)
        .window.webContents.send('store-get', data)
    }
  }

  /********************************************************************************
   * @brief: 获取主窗口
   * @param {*} BrowserWindow
   * @return {*}
   ********************************************************************************/
  public static getMainWindow = (): BrowserWindow => {
    return CreateWindow.windowMap.get('main').window
  }

  /********************************************************************************
   * @brief: 根据 id 获取窗口
   * @param {number} id
   * @return {*}
   ********************************************************************************/
  public getWindowById = (id: number): any => {
    return BrowserWindow.fromId(id)
  }

  /********************************************************************************
   * @brief: 防抖函数
   * @param {*} func
   * @param {*} wait
   * @return {*}
   ********************************************************************************/
  public debounce = (func, wait) => {
    let timeout
    return function () {
      const context = this
      const args = arguments
      clearTimeout(timeout)
      timeout = setTimeout(() => {
        func.apply(context, args)
      }, wait)
    }
  }

  /********************************************************************************
   * @brief: 移动依附窗口
   * @param {BrowserWindow} win
   * @return {*}
   ********************************************************************************/
  public moveDepWindow = (win: BrowserWindow) => {
    // 设置下窗口的位置
    if (CreateWindow.windowMap.get('bottom')) {
      const bottomWin: BrowserWindow =
        CreateWindow.windowMap.get('bottom').window
      bottomWin.setBounds({
        x: win.getPosition()[0],
        y: win.getPosition()[1] + win.getSize()[1],
        width: 680,
        height: 400,
      })
    }
    // 设置右窗口的位置
    if (CreateWindow.windowMap.get('right')) {
      const rightWin: BrowserWindow = CreateWindow.windowMap.get('right').window
      rightWin.setBounds({
        x: win.getPosition()[0] + win.getSize()[0],
        y: win.getPosition()[1],
        width: rightWin.getSize()[0],
        height: rightWin.getSize()[1],
      })
    }
  }

  /********************************************************************************
   * @brief: 创建窗口
   * @param {object} configurations
   * @param {object} options
   * @return {*}
   ********************************************************************************/
  public createWindow(configurations: IWindowConfig): BrowserWindow {
    // // console.info(CreateWindow.group)
    // 判断是否有窗口名
    if (!configurations.windowName) {
      console.info('window name is required')
      return
    }
    // 判断是否有页面
    if (CreateWindow.windowMap.has(configurations.windowName)) {
      console.info('window is already created')
      CreateWindow.windowMap.get(configurations.windowName).window.blur()
      return
    }
    // 传递的配置与默认配置创建新的对象
    let windowConfig = Object.assign({}, this.defaultConfig, configurations)

    // 设定其他窗口的父窗口
    if (!windowConfig.isMainWin) {
      windowConfig.parent = CreateWindow.getMainWindow()
    }
    // 创建窗口
    let win = new BrowserWindow(windowConfig as BrowserWindowConstructorOptions)
    win.setTitle('')
    // // console.info(windowConfig)
    console.log('window id:' + win.id)
    // 记录路由与窗口 id
    CreateWindow.windowMap.set(windowConfig.windowName, {
      windowId: win.id,
      route: windowConfig.route,
      windowName: windowConfig.windowName,
      window: win,
    })

    // 判断主窗口,并移动依附窗口
    // if (windowConfig.isMainWin) {
    //   win.on(
    //     'move',
    //     this.debounce(() => {
    //       this.moveDepWindow(win)
    //     }, 10)
    //   )
    // }

    // 是否最大化
    if (windowConfig.maximize && windowConfig.resizable) {
      win.maximize()
    }

    if (process.platform == 'darwin') {
      // 以编程方式隐藏红绿灯控件
      win.setWindowButtonVisibility(false)
    }

    // 窗口被清除之后，清除存储
    win.on('close', () => {
      // 当主窗口关闭时，退出应用程序
      if (win == CreateWindow.windowMap.get('main').window) {
        app.quit()
        return
      }
      CreateWindow.windowMap.forEach((value, key) => {
        if (value.window == win) {
          win.webContents.closeDevTools()
          CreateWindow.windowMap.delete(key)
        }
      })
      win.setOpacity(0)
    })
    // 显示窗口
    win.on('ready-to-show', () => {
      win.show()
      win.focus()
    })

    // 加载页面
    let winURL: string
    if (app.isPackaged) {
      // winURL = windowConfig.route ? `app://../../dist/index.html` : `file://${path.join(__dirname, '../../dist/index.html')}`
      win.loadFile(join(__dirname, '../../dist/index.html'), {
        hash: windowConfig.route,
      })
    } else {
      winURL = windowConfig.route
        ? `${process.env.VITE_DEV_SERVER_URL}/#${windowConfig.route}`
        : `${process.env.VITE_DEV_SERVER_URL}}/#`
      // // console.info(process.env)
      win.loadURL(winURL)
    }
    // console.info('new window address -> ', winURL)
    win.setMenu(null)
    // 配置开发环境调试信息
    if (DEV) {
      // 解决 Windows 无法正常打开开发者工具的问题 ↓
      // let devtools = new BrowserWindow()
      // win.webContents.setDevToolsWebContents(devtools.webContents)
      // 打开开发者工具
      // win.webContents.openDevTools({ mode: 'detach' })
      win.webContents.once('did-finish-load', () => {
        win.webContents.openDevTools({ mode: 'detach' })
      })
      win.on('hide', () => win.webContents.closeDevTools())
      // 全局快捷键注册
      globalShortcut.register('CommandOrControl+Shift+i', function () {
        win.webContents.openDevTools()
      })
    }
    // 返回创建的窗口
    return win
  }
}
