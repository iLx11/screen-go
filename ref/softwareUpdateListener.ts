import { ipcMain } from 'electron'
import SoftwareUpdateService from './softwareUpdateService'

export const softwareUpdateListener = () => {
  // 获取当前软件更新状态
  ipcMain.handle('get-software-update-state', async () => {
    return SoftwareUpdateService.getState()
  })

  // 重置软件更新状态
  ipcMain.handle('reset-software-update-state', async () => {
    return await SoftwareUpdateService.resetState()
  })

  // 检查软件是否有更新
  ipcMain.handle('check-software-update', async () => {
    return await SoftwareUpdateService.checkUpdate()
  })

  // 下载远程软件安装包
  ipcMain.handle('download-software-update', async () => {
    return await SoftwareUpdateService.downloadUpdate()
  })

  // 取消软件更新下载
  ipcMain.handle('cancel-software-update', async () => {
    return await SoftwareUpdateService.cancelDownload()
  })

  // 启动已下载好的新版本安装包
  ipcMain.handle('install-software-update', async () => {
    return await SoftwareUpdateService.installUpdate()
  })

  // 打开远程下载页面
  ipcMain.handle('open-software-update-page', async () => {
    return await SoftwareUpdateService.openDownloadPage()
  })
}
