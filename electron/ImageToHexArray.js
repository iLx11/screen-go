const os = require('os')
const path = require('path')
const Crypto = require('crypto') 
// png 文件转像素
const pngparse = require('pngparse')
const mime = require('mime') 
const Jimp = require('jimp')
const fs = require('fs-extra')

module.exports.ImageToHexArray = class {
  static configArray
  static generate = (picData, config) => {
    this.configArray = config
    return new Promise((resolve, reject) => {
      this.convert(this.generateTemFile(picData), function (err, hex) {
        if (!err) {
          // let dataList = hex.split(',')
          resolve(hex)
        } else {
          reject(err)
        }
      })
    })
  }
  static convert(filename, callback) {
    let _this = this
    let ext = mime.getType(filename)
    if (ext == 'image/png') {
      _this.pngtolcd(filename, function (err, buffer) {
        err ? callback(err, null) : callback(null, _this.configArray[3] == 0 ? _this.hex2hex(buffer.toString('hex')) : buffer)
      })
    } else {
      new Jimp(filename, function (err, image) {
        let uname = 'krambil'
        let hashname = Crypto.createHash('md5').update(uname).digest('hex') + '.png'
        let tmppath = path.join(os.tmpdir(), hashname)
        if (!err) {
          image.write(tmppath, function (err, status) {
            if (err) return callback(err, null)
            _this.pngtolcd(tmppath, function (err, buffer) {
              err ? callback(err, null) : callback(null, _this.configArray[3] == 0 ? _this.hex2hex(buffer.toString('hex')) : buffer)
            })
          })
        } else {
          callback(err, null)
        }
      })
    }
  }
  // 根据 base64 生成临时文件
  static generateTemFile(base64) {
    let hashname = Crypto.createHash('md5').update('angular-tmp-img').digest('hex') + '.bmp'
    let temFilePath = path.join(os.tmpdir(), hashname)
    let dataBuffer = Buffer.from(base64.replace(/^data:image\/\w+;base64,/, ''), 'base64')
    fs.writeFileSync(temFilePath, dataBuffer)
    return temFilePath
  }
  // 图片取模
  static pngtolcd = (filename, callback) => {
    let _this = this
    pngparse.parseFile(filename, function (err, img) {
      if (err) {
        return callback(err)
      }
      let buffer = _this.imageDataToHexArray(img)
      callback(err, buffer)
    })
  }

  // ImageData 对象转 hexArray
  static imageDataToHexArray = (imageData) => {
    // 创建 ImageData 对象，重新构建 data
    const pimage = this.createImageDate(imageData)
    // 获取像素数据、高度、宽度和透明度等信息
    let pixels = pimage.data
    let height = pimage.height
    let width = pimage.width
    let pixelsLen = pixels.length
    // 设置黑白像素的阈值，高于则转为黑点，低于则转为白点
    let threshold = 120
    let unpackedBuffer = []
    let depth = 4
    let pixelVal
    // 遍历像素数据
    for (let i = 0; i < pixelsLen; i += depth) {
      pixelVal = pixels[i + 1] = pixels[i + 2] = pixels[i]
      // 根据像素值与阈值的比较，将像素值转换为0或1
      pixelVal > threshold ? (pixelVal = 1) : (pixelVal = 0)
      // 存储转换后的像素值到数组中
      unpackedBuffer[i / depth] = pixelVal
    }
    // 根据配置选用取模方式
    return this.imageSamplingArr[this.configArray[1]](unpackedBuffer, width, height)
  }
  //------------------------------ 逐行式 ------------------------------------
  static ImageSamplingRow = (unpackedBuffer, width, height) => {
    // 创建一个缓冲区，用于存储转换后的字节数据
    const buffer = Buffer.alloc((width * height) / 8)
    for (let i = 0; i < unpackedBuffer.length; i++) {
      let x = Math.floor(i % width)
      let y = Math.floor(i / width)
      let byte = 0
      // 确定取模的 page
      let page = y
      // 每个 page 的字节的位
      let pageShift = 0x01 << (x % 8)
      if(this.configArray[2] != 0) pageShift = 0x01 << (7 - (x % 8))
      // 计算字节位置，后面的 page 的字节需要加上前面的 page 的位置
      byte = page * Math.floor(width / 8) + Math.floor(x / 8)
      // 根据转换后的像素值设置缓冲区的相应位
      if(this.configArray[0] !== 0) unpackedBuffer[i] === 0 ? unpackedBuffer[i] = 1 : unpackedBuffer[i] = 0
      if (unpackedBuffer[i] === 0) {
        buffer[byte] |= pageShift
      } else {
        buffer[byte] &= ~pageShift
      }
    }
    console.log('buffer', buffer)
    // 返回转换后的lcd数据
    return buffer
  }
  //------------------------------ 逐列式 ------------------------------------
  static ImageSamplingCol = (unpackedBuffer, width, height) => {
    // 创建一个缓冲区，用于存储转换后的字节数据
    const buffer = Buffer.alloc((width * height) / 8)
    for (let i = 0; i < unpackedBuffer.length; i++) {
      let x = Math.floor(i % width)
      let y = Math.floor(i / width)
      let byte = 0
      // 确定取模的 page
      let page = x
      // 每个 page 的字节的位
      let pageShift = 0x01 << (y % 8)
      if(this.configArray[2] != 0) pageShift = 0x01 << (7 - (y % 8))
      // 计算字节位置，后面的 page 的字节需要加上前面的 page 的位置
      byte = page * Math.floor(height / 8) + Math.floor(y / 8)
      // 根据转换后的像素值设置缓冲区的相应位
      if(this.configArray[0] !== 0) unpackedBuffer[i] === 0 ? unpackedBuffer[i] = 1 : unpackedBuffer[i] = 0
      if (unpackedBuffer[i] === 0) {
        buffer[byte] |= pageShift
      } else {
        buffer[byte] &= ~pageShift
      }
    }
    // 返回转换后的lcd数据
    return buffer
  }
  //------------------------------ 列行式 ------------------------------------
  static ImageSamplingColRow = (unpackedBuffer, width, height) => {
    // 创建一个缓冲区，用于存储转换后的字节数据
    const buffer = Buffer.alloc((width * height) / 8)
    for (let i = 0; i < unpackedBuffer.length; i++) {
      let x = Math.floor(i % width)
      let y = Math.floor(i / width)
      let byte = 0
      // 确定取模的 page
      let page = Math.floor(y / 8)
      // 每个 page 的字节的位
      let pageShift = 0x01 << (y - 8 * page)
      if(this.configArray[2] != 0) pageShift = 0x01 << (7 - (y - 8 * page))
      // 计算字节位置，后面的 page 的字节需要加上前面的 page 的位置
      page === 0 ? (byte = x) : (byte = x + width * page)
      // 根据转换后的像素值设置缓冲区的相应位
      if(this.configArray[0] !== 0) unpackedBuffer[i] === 0 ? unpackedBuffer[i] = 1 : unpackedBuffer[i] = 0
      if (unpackedBuffer[i] === 0) {
        buffer[byte] |= pageShift
      } else {
        buffer[byte] &= ~pageShift
      }
    }
    // 返回转换后的lcd数据
    return buffer
  }
  //------------------------------ 行列式 ------------------------------------
  static ImageSamplingRowCol = (unpackedBuffer, width, height) => {
    // 创建一个缓冲区，用于存储转换后的字节数据
    const buffer = Buffer.alloc((width * height) / 8)
    for (let i = 0; i < unpackedBuffer.length; i++) {
      let x = Math.floor(i % width)
      let y = Math.floor(i / width)
      let byte = 0
      // 确定取模的 page
      let page = Math.floor(x / 8)
      // 每个 page 的字节的位
      let pageShift = 0x01 << (x % 8)
      if(this.configArray[2] != 0) pageShift = 0x01 << (7 - (x % 8))
      // 计算字节位置，后面的 page 的字节需要加上前面的 page 的位置
      byte = page * height + y
      // 根据转换后的像素值设置缓冲区的相应位
      if(this.configArray[0] !== 0) unpackedBuffer[i] === 0 ? unpackedBuffer[i] = 1 : unpackedBuffer[i] = 0
      if (unpackedBuffer[i] === 0) {
        buffer[byte] |= pageShift
      } else {
        buffer[byte] &= ~pageShift
      }
    }
    // 返回转换后的lcd数据
    return buffer
  }
  static imageSamplingArr = [this.ImageSamplingRow, this.ImageSamplingCol, this.ImageSamplingColRow, this.ImageSamplingRowCol]
  // 创建 ImageData 对象
  static createImageDate = (imageData) => {
    // 创建一个缓冲区，用于存储图像数据
    let buffer = Buffer.alloc(imageData.width * imageData.height * 4)
    // 重组 ImageData 的数据
    for (let y = 0, pos = 0; y < imageData.height; y++) {
      for (let x = 0; x < imageData.width; x++) {
        buffer.writeUInt32BE(this.getPixel(imageData, x, y), pos)
        pos += 4
      }
    }
    // 更新图像数据为缓冲区中的数据
    // imageData.data = buffer
    imageData.data.set(buffer)
    return imageData
    // return new ImageData(new Uint8ClampedArray(buffer), imageData.width, imageData.height)
  }
  // 获取指定位置的像素值
  static getPixel = (image, x, y) => {
    x = x | 0
    y = y | 0
    // 检查坐标是否越界，如果越界返回 0
    if (x < 0 || y < 0 || x >= image.width || y >= image.height) return 0
    let index = (y * image.width + x) * image.channels,
      r,
      g,
      b,
      a
    // 根据通道数获取相应的颜色值
    switch (image.channels) {
      case 1:
        r = g = b = image.data[index]
        a = 255
        break
      case 2:
        r = g = b = image.data[index]
        a = image.data[index + 1]
        break
      case 3:
        r = image.data[index]
        g = image.data[index + 1]
        b = image.data[index + 2]
        a = 255
        break
      case 4:
        r = image.data[index]
        g = image.data[index + 1]
        b = image.data[index + 2]
        a = image.data[index + 3]
        break
    }
    // 将颜色值转换为十六进制像素值并返回
    return ((r << 24) | (g << 16) | (b << 8) | a) >>> 0
  }
  static hex2hex = (hex) => {
    for (var bytes = [], c = 0; c < hex.length; c += 2) {
      bytes.push('0x' + hex.substr(c, 2))
    }
    return bytes
  }

  static pngtohexarray = (filename, callback) => {
    this.pngtolcd(filename, function (err, buffer) {
      if (err) {
        callback(err, null)
      } else {
        callback(null, this.hex2hex(buffer.toString('hex')))
      }
    })
  }
}
