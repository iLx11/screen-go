import { buffer } from 'stream/consumers'

const sharp = require('sharp')

export default class ImageToHexArray {
  static configArray
  static threshold
  static generate = async (picData, thresholdData, config) => {
    // console.info('thresholdData', thresholdData)
    // console.info('config', config)
    this.configArray = config
    this.threshold = thresholdData
    // console.info('basetoimagedata ----------------')
    const picImageData = await this.base64ToImageData(picData)
    const bufferData = this.imageDataToHexArray(picImageData)
    return this.configArray[3] == 0
      ? this.hex2hex(bufferData.toString('hex'))
      : bufferData
  }

  // ImageData 对象转 hexArray
  static imageDataToHexArray = (imageData) => {
    // 创建 ImageData 对象，重新构建 data
    const pimage = this.createImageData(imageData)
    // 获取像素数据、高度、宽度和透明度等信息
    let pixels = pimage.data
    let height = pimage.height
    let width = pimage.width
    let pixelsLen = pixels.length

    // ------------------ 根据配置选用取模方式 --------------------------
    // 单色图片取模
    if (this.configArray[4] == 1) {
      // 设置黑白像素的阈值，高于则转为黑点，低于则转为白点
      let threshold = this.threshold
      // console.info(threshold)
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
      return this.imageSamplingArr[this.configArray[1]](
        unpackedBuffer,
        width,
        height
      )
    } else {
      // 彩色图片取模, pixels 为图片的 r, g, b, a 信息
      return this.colorImageSampling(pixels, width, height)
    }
  }

  static colorImageSampling = (pixels, width, height) => {
    // console.info('unpackedBufferL -> ', unpackedBuffer.length)
    // 缓冲数组，作为存储 16 位真彩色
    const buffer = Buffer.alloc(width * height * 2)
    // console.info('bufferL -> ', buffer.length);
    let i = 0,
      j = 0
    while (i < buffer.length && j < pixels.length) {
      buffer[i] |= (pixels[j] >> 3) << 3
      buffer[i] |= pixels[j + 1] >> 5
      buffer[i + 1] |= (pixels[j + 1] >> 2) << 5
      buffer[i + 1] |= pixels[j + 2] >> 3
      if (this.configArray[0] == 0 || this.configArray[2] == 1) {
        buffer[i] = ~buffer[i]
        buffer[i + 1] = ~buffer[i + 1]
      }
      i += 2
      j += 4
    }
    return buffer
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
      let pageShift = 0x01 << x % 8
      if (this.configArray[2] != 0) pageShift = 0x01 << (7 - (x % 8))
      // 计算字节位置，后面的 page 的字节需要加上前面的 page 的位置
      byte = page * Math.floor(width / 8) + Math.floor(x / 8)
      // 根据转换后的像素值设置缓冲区的相应位
      if (this.configArray[0] !== 0)
        unpackedBuffer[i] === 0
          ? (unpackedBuffer[i] = 1)
          : (unpackedBuffer[i] = 0)
      if (unpackedBuffer[i] === 0) {
        buffer[byte] |= pageShift
      } else {
        buffer[byte] &= ~pageShift
      }
    }
    // console.info('buffer', buffer)
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
      let pageShift = 0x01 << y % 8
      if (this.configArray[2] != 0) pageShift = 0x01 << (7 - (y % 8))
      // 计算字节位置，后面的 page 的字节需要加上前面的 page 的位置
      byte = page * Math.floor(height / 8) + Math.floor(y / 8)
      // 根据转换后的像素值设置缓冲区的相应位
      if (this.configArray[0] !== 0)
        unpackedBuffer[i] === 0
          ? (unpackedBuffer[i] = 1)
          : (unpackedBuffer[i] = 0)
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
      if (this.configArray[2] != 0) pageShift = 0x01 << (7 - (y - 8 * page))
      // 计算字节位置，后面的 page 的字节需要加上前面的 page 的位置
      page === 0 ? (byte = x) : (byte = x + width * page)
      // 根据转换后的像素值设置缓冲区的相应位
      if (this.configArray[0] !== 0)
        unpackedBuffer[i] === 0
          ? (unpackedBuffer[i] = 1)
          : (unpackedBuffer[i] = 0)
      if (unpackedBuffer[i] === 0) {
        buffer[byte] |= pageShift
      } else {
        buffer[byte] &= ~pageShift
      }
    }
    // console.info(buffer.toString('base64'))
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
      let pageShift = 0x01 << x % 8
      if (this.configArray[2] != 0) pageShift = 0x01 << (7 - (x % 8))
      // 计算字节位置，后面的 page 的字节需要加上前面的 page 的位置
      byte = page * height + y
      // 根据转换后的像素值设置缓冲区的相应位
      if (this.configArray[0] !== 0)
        unpackedBuffer[i] === 0
          ? (unpackedBuffer[i] = 1)
          : (unpackedBuffer[i] = 0)
      if (unpackedBuffer[i] === 0) {
        buffer[byte] |= pageShift
      } else {
        buffer[byte] &= ~pageShift
      }
    }
    // 返回转换后的lcd数据
    return buffer
  }

  // 取模方式数组
  static imageSamplingArr = [
    this.ImageSamplingRow,
    this.ImageSamplingCol,
    this.ImageSamplingColRow,
    this.ImageSamplingRowCol,
  ]

  // 创建 ImageData 对象
  static createImageData = (imageData) => {
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
    imageData.data = buffer
    // imageData.data.set(buffer)
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

  // Buffer 转 ImageData 对象
  static bufferToImageData = async (buffer) => {
    // 使用 sharp 从 Buffer 中读取图像
    const { data, info } = await sharp(buffer)
      // 获取原始像素数据（未压缩的像素格式）
      .raw()
      // 确保包含 Alpha 通道（透明度）
      .ensureAlpha()
      // 返回像素数据和图像信息
      .toBuffer({ resolveWithObject: true })

    // 根据 sharp 返回的图片信息构建 ImageData 结构
    const channels = info.channels // 图像的通道数（如 3 = RGB, 4 = RGBA）
    // console.log(data)
    // 创建类似于浏览器中的 ImageData 对象
    return {
      width: info.width,
      height: info.height,
      // 像素数据
      data: new Uint8ClampedArray(data),
      channels,
    }
  }

  // base64 转 ImageData 对象
  static base64ToImageData = async (base64Data) => {
    return await this.bufferToImageData(this.base64ToBuffer(base64Data))
  }

  // base64 转 buffer
  static base64ToBuffer = (base64Data) => {
    // 将 Base64 转换为 Buffer
    return Buffer.from(
      base64Data.replace(/^data:image\/\w+;base64,/, ''),
      'base64'
    )
  }

  // 缩放图片
  static resizeImage = async (width, height, picData, colorMode) => {
    if (width == 0 || height == 0) return
    // base64 转 buffer
    const bufferData = this.base64ToBuffer(picData)
    let resultBuffer
    // 图片裁剪
    if (!colorMode) {
      resultBuffer = await sharp(bufferData)
        .resize({ width, height, fastShrinkOnLoad: true })
        .toBuffer()
    } else {
      resultBuffer = await sharp(bufferData)
        .resize(width, height)
        .greyscale()
        .toBuffer()
    }
    return resultBuffer.toString('base64')
  }

  // 十六进制数据加 '0x'
  static hex2hex = (hex) => {
    for (var bytes = [], c = 0; c < hex.length; c += 2) {
      bytes.push('0x' + hex.substr(c, 2))
    }
    return bytes
  }
}
