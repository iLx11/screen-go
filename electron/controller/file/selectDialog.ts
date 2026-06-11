import { dialog, ipcMain } from 'electron'
import { writeFileSync, writeJsonSync, readJsonSync } from 'fs-extra'
const path = require('path')

export const getFilePath = async () => {
  let filePath = await dialog.showOpenDialog({
    title: '选择一个文件',
    buttonLabel: '确认选择',
    properties: ['openFile'],
    filters: [
      {
        name: '视频资源',
        extensions: [
          'mp4',
          'avi',
          'mkv',
          'mov',
          'flv',
          'wmv',
          'webm',
          'mpeg',
          'mpg',
          'ogv',
          '3gp',
          'm4v',
          'asf',
          'rm',
          'rmvb',
          'ts',
        ],
      },
    ],
  })
  return filePath
}

export const getDirPath = async () => {
  let dirPath = await dialog.showOpenDialog({
    title: '选择一个文件夹',
    buttonLabel: '确认选择',
    properties: ['openDirectory'],
  })
  return dirPath
}

export const getConfigFile = async () => {
  let filePath = await dialog.showOpenDialog({
    title: '选择配置文件',
    buttonLabel: '确认选择',
    filters: [{ name: 'JSON配置文件', extensions: ['json'] }],
  })
  if (filePath == undefined) return
  return readJsonSync(path.join(filePath.filePaths[0]))
}

export const writeConfigFile = async (fileName: string, context: string) => {
  // 选择文件夹
  let dirPath = await saveConfigFile()
  if (dirPath == '' && dirPath == undefined) return
  writeJsonSync(path.join(dirPath, `${fileName}.json`), context)
}

// 保存文件
const saveConfigFile = async () => {
  const savePath = await dialog.showSaveDialog({
    title: '保存配置文件',
    defaultPath: 'multipad.json', // 默认文件名
    buttonLabel: '保存',
    filters: [{ name: 'config Files', extensions: ['json'] }],
  })
  if (!savePath.canceled) {
    return savePath.filePath
  }
  return ''
}

const saveBinFile = async (data: number[], fileName = 'screen-go.bin') => {
  const savePath = await dialog.showSaveDialog({
    title: '保存 BIN 文件',
    defaultPath: fileName,
    buttonLabel: '保存',
    filters: [{ name: 'BIN 文件', extensions: ['bin'] }],
  })

  if (savePath.canceled || !savePath.filePath) return false

  const bytes = data.map(value => Number(value) & 0xff)
  writeFileSync(savePath.filePath, Buffer.from(bytes))
  return true
}

export const fileListener = () => {
  ipcMain.handle('select-video-file', async (event, arg) => {
    let filePath = await getFilePath()
    return filePath
  })
  ipcMain.handle('save-bin-file', async (event, data, fileName) => {
    return await saveBinFile(Array.isArray(data) ? data : [], fileName)
  })
}
