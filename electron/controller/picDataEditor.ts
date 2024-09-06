const { ipcMain } = require('electron')

// 图片裁剪
const sharp = require('sharp')
const Crypto = require('crypto')
const os = require('os')
const fs = require('fs-extra')
const path = require('path')
import ImageToHexArray from './ImageToHexArray'

export const imgEditorHandle = async (width, height, picData, colorMode) => {
  if (width == 0 || height == 0) return
  // console.info('图片：', picData)
  let hashname =
    Crypto.createHash('md5').update('angular-cir-img').digest('hex') + '.bmp'
  // temp 图片的原始路径
  let originFilePath = path.join(os.tmpdir(), hashname)
  // base64 转 buffer
  let dataBuffer = Buffer.from(
    picData.replace(/^data:image\/\w+;base64,/, ''),
    'base64'
  )
  // base64 写为字节流图片
  await fs.writeFile(originFilePath, dataBuffer)

  return new Promise((resolve, reject) => {
    // 图片裁剪
    if (!colorMode) {
      sharp(originFilePath)
        .resize(width, height)
        .toBuffer()
        .then((outputBuffer) => {
          resolve(outputBuffer.toString('base64'))
        })
    } else {
      sharp(originFilePath)
        .resize(width, height)
        .greyscale()
        .toBuffer()
        .then((outputBuffer) => {
          resolve(outputBuffer.toString('base64'))
        })
    }
  })
}
export const picDataListener = () => {
  // 缩放图片
  ipcMain.handle(
    'pic-data-editor',
    async (event, width, height, picData, colorMode) => {
      const result = await imgEditorHandle(width, height, picData, colorMode)
      return result
    }
  )

  // 生成结果数组
  ipcMain.handle(
    'pic-data-parse',
    async (event, data, threshold, ...configArray) => {
      // console.info('configArray------------->', configArray)
      const result = await ImageToHexArray.generate(
        data,
        threshold,
        configArray
      )
      return result
    }
  )
}
