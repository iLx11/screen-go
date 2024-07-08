import { readJsonSync } from 'fs-extra'
import { join } from 'path'
import { ipcMain } from 'electron'

const readShortcutsFile = (filePath: string) => {
  return readJsonSync(join(__dirname, `../../dist/shortcuts/${filePath}`))
}
export const fileReadListener = async () => {
  ipcMain.handle('get-shortcut', async (event, filePath: string) => {
    return await readShortcutsFile(filePath)
  })
}