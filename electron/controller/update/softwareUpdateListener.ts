import { ipcMain } from 'electron'
import SoftwareUpdateService from './softwareUpdateService'

export const softwareUpdateListener = () => {
  ipcMain.handle('get-software-update-state', async () => {
    return SoftwareUpdateService.getState()
  })

  ipcMain.handle('reset-software-update-state', async () => {
    return await SoftwareUpdateService.resetState()
  })

  ipcMain.handle('check-software-update', async () => {
    return await SoftwareUpdateService.checkUpdate()
  })

  ipcMain.handle('download-software-update', async () => {
    return await SoftwareUpdateService.downloadUpdate()
  })

  ipcMain.handle('cancel-software-update', async () => {
    return await SoftwareUpdateService.cancelDownload()
  })

  ipcMain.handle('install-software-update', async () => {
    return await SoftwareUpdateService.installUpdate()
  })

  ipcMain.handle('open-software-update-page', async () => {
    return await SoftwareUpdateService.openDownloadPage()
  })
}
