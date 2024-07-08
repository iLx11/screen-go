import { BrowserWindow } from 'electron'

export default interface IWindowOption {
  width: number
  height: number
  maxWidth: number
  maxHeight: number
  minWidth: number
  minHeight: number
  center: boolean
  transparent: boolean
  backgroundColor: string
  autoHideMenuBar: boolean
  resizable: boolean
  minimizable: boolean
  maximizable: boolean
  frame: boolean
  show: boolean
  parent?: BrowserWindow
  modal: boolean
  webPreferences: {
    contextIsolation: boolean //上下文隔离
    nodeIntegration: boolean //启用 Node 集成（是否完整的支持 node）
    webSecurity: boolean
    preload: string
  }
}
