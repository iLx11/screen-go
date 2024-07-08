const { dialog } = require('electron')
import { writeJsonSync, readJsonSync } from 'fs-extra'
const path = require('path')

export const getFilePath = async () => {
  let filePath = await  dialog.showOpenDialog({
    title: "选择一个文件",
      buttonLabel: "确认选择",
      // defaultPath: app.getPath('pictures'),
      // 多选文件
      // properties: ["multiSelections"],
      filters: [
          // 文件类型
          {name: "应用/文件", extensions:[]},
      ]
  })
  return filePath
}

export const getConfigFile = async () => {
  let filePath = await dialog.showOpenDialog({
    title: "选择配置文件",
      buttonLabel: "确认选择",
      filters: [
          {name: "JSON配置文件", extensions:['json']},
      ]
  })
  if(filePath == undefined) return
  return readJsonSync(path.join(filePath.filePaths[0]))
}

export const writeConfigFile = async (fileName: string, context: string) => {
  // 选择文件夹
  let dirPath = await selectDir()
  if(dirPath == '' && dirPath == undefined) return
  writeJsonSync(path.join(dirPath, `${fileName}.json`), context)
}

const selectDir = async () => {
  let path = await dialog.showOpenDialog({
    properties: ['openDirectory']
  }).then(result => {
    if (!result.canceled) {
      return result.filePaths[0]
    }
  }).catch(err => {
    console.error(err);
  });
  return path
}