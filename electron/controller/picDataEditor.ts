const { ipcMain } = require('electron')

// 图片裁剪
const sharp = require('sharp')
const Crypto = require("crypto");
const os = require('os')
const fs = require('fs-extra')
const path = require('path')
import ImageToHexArray from './ImageToHexArray'

let resultPicData = ''

const imgEditorHandle = async (width, height, picData, colorMode) => {
  if (width == 0 || height == 0) return
  // console.info('图片：', picData)
  let hashname = Crypto.createHash('md5').update('angular-cir-img').digest('hex') + '.bmp'
  // temp 图片的原始路径
  let originFilePath = path.join(os.tmpdir(), hashname)
  // base64 转 buffer
  let dataBuffer = Buffer.from(picData.replace(/^data:image\/\w+;base64,/, ''), 'base64')
  //
  fs.writeFileSync(originFilePath, dataBuffer)

  // 裁剪后写入的目录
  let filePath = path.join(
    // 临时文件夹目录
    os.tmpdir(),
    Crypto.createHash('md5').update('angular-cir-img-zoom').digest('hex') + '.bmp'
  )

  // 图片裁剪
  if (!colorMode) {
    sharp(originFilePath)
      .resize(width, height)
      .toBuffer()
      .then((outputBuffer) => {
        let base64String = outputBuffer.toString('base64')
        resultPicData = base64String
        // 写入后读取临时文件
        // const readable = fs.readFileSync(filePath, "binary");
        // const base64 = Buffer.from(readable, "binary").toString("base64");
        // // base64 = `data:image/png;base64,${base64}`
        // resultPicData = base64;
      })
  } else {
    sharp(originFilePath)
      .resize(width, height)
      .greyscale()
      .toBuffer()
      .then((outputBuffer) => {
        let base64String = outputBuffer.toString('base64')
        resultPicData = base64String
      })
  }
}
export const picDataListener = () => {
  // 缩放图片
  ipcMain.handle('pic-data-editor', async (event, width, height, picData, colorMode) => {
    imgEditorHandle(width, height, picData, colorMode)
    await new Promise((resolve) => setTimeout(resolve, 700))
    return resultPicData
  })

  // 生成结果数组
  ipcMain.handle('pic-data-parse', async (event, data, threshold, ...configArray) => {
    // console.info('configArray------------->', configArray)
    const result = await ImageToHexArray.generate(data, threshold, configArray)
    return result
  })
}
