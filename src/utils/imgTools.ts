import Img2lcd from './ImageToHexArray.js'

// 图片裁剪
var Jimp = require('jimp')
import Crypto from 'crypto'
const os = require('os')
const fs = require('fs-extra')
const path = require('path')
// const fs = require('fs');

// const Crypto = getCrypto()

// function getCrypto() {
//   try {
//     return window.crypto;
//   } catch {
//     return crypto;
//   }
// }
const DIC_DIG = {
  '0': 0,
  '1': 1,
  '2': 2,
  '3': 3,
  '4': 4,
  '5': 5,
  '6': 6,
  '7': 7,
  '8': 8,
  '9': 9,
  a: 10,
  b: 11,
  c: 12,
  d: 13,
  e: 14,
  f: 15,
  A: 10,
  B: 11,
  C: 12,
  D: 13,
  E: 14,
  F: 15
}
// 图片裁剪后生成 base64
export const imgEditorHandle = async (width: number, height: number, picData: string, callBack: Function) => {
  // console.info('图片：', picData)
  let hashname = Crypto.createHash('md5').update('angular-cir-img').digest('hex') + '.bmp'
  // temp 图片的原始路径
  let originFilePath = path.join(os.tmpdir(), hashname)
  let dataBuffer = Buffer.from(picData.replace(/^data:image\/\w+;base64,/, ''), 'base64')
  fs.writeFileSync(originFilePath, dataBuffer)
  // console.info('文件生成在哪里？', originFilePath)
  let filePath = path.join(os.tmpdir(), Crypto.createHash('md5').update('angular-cir-img-zoom').digest('hex') + '.bmp')
  // console.info('裁剪后的文件路径：', filePath)
  // console.info('裁剪：', width, height)
  Jimp.read(originFilePath, async (err, lenna) => {
    if (err) throw err
    lenna
      .resize(width, height) // resize
      .quality(60) // set JPEG quality
      .greyscale() // set greyscale
      .write(filePath) // save
    // FIXME: 处理图片延时
    setTimeout(async () => {
      const readable = fs.readFileSync(filePath, 'binary')
      let base64 = Buffer.from(readable, 'binary').toString('base64')
      // base64 = `data:image/png;base64,${base64}`
      callBack(base64)
    }, 500)
  })
}

// 生成二进制 bin 文件
export const generateLCDBin = (src, output) => {
  return new Promise((resolve, reject) => {
    // Img2lcd.convert(src, function (err, hex) {
    //   if (!err) {
    //     var dataList = hex.split(',')
    //     generateToB(dataList, output)
    //     resolve(output)
    //   } else {
    //     reject(err)
    //   }
    // })
  })
}

// 生成二进制文件
const generateToB = (data, output) => {
  // 先使用any处理错误
  let buf: any = ['=']
  for (let value of data) {
    buf.push(convertToHexInt(value.substring(2, value.length)))
  }
  fs.writeFileSync(output, Buffer.from(buf))
}

// 将字符串转换为16进制数字
const convertToHexInt = (str) => {
  var value = 0
  var length = str.length
  for (let i = 0; i < length; i++) {
    value = value * 16 + DIC_DIG[str[i]]
  }
  return value
}
