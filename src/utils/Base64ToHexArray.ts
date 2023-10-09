// import { createCanvas, loadImage } from 'canvas'
// // const { createCanvas, loadImage } = require('canvas');

// export default class Base64ToHexArray {
//   public static generate = (picData) => {
//     return new Promise((resolve, reject) => {
//       this.base64ToImageData(picData)
//         .then((res) => {
//           let buffer = this.imageDataToHexArray(res)
//           resolve(this
//             .hex2hex(buffer.toString('hex')).join(','))
//         })
//         .catch((err) => {
//           console.log('err', err)
//           reject('img error!')
//         })
//     })
//   }

//   // base64 转为 ImageData 对象
//   private static base64ToImageData = async (picData) => {
//     // 创建一个画布对象
//     const canvas = createCanvas(1, 1)
//     const context = canvas.getContext('2d')
//     // 加载图像数据
//     const image = await loadImage(`data:image/png;base64,${picData}`)
//     canvas.width = image.width
//     canvas.height = image.height
//     // 在画布上绘制图像
//     context.drawImage(image, 0, 0)
//     // 获取图像数据
//     const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
//     // 返回 ImageData 对象
//     return imageData
//   }

//   // ImageData 对象转 hexArray
//   private static imageDataToHexArray = (imageData) => {
//     // 创建 ImageData 对象，重新构建 data
//     const pimage = this.createImageDate(imageData)
//     // 获取像素数据、高度、宽度和透明度等信息
//     let pixels = pimage.data
//     let height = pimage.height
//     let width = pimage.width
//     let pixelsLen = pixels.length

//     // 设置黑白像素的阈值，高于则转为黑点，低于则转为白点
//     let threshold = 120
//     let unpackedBuffer = []
//     let depth = 4
//     let pixelVal
//     // 遍历像素数据
//     for (let i = 0; i < pixelsLen; i += depth) {
//       pixelVal = pixels[i + 1] = pixels[i + 2] = pixels[i]
//       // 根据像素值与阈值的比较，将像素值转换为0或1
//       pixelVal > threshold ? (pixelVal = 1) : (pixelVal = 0)
//       // 存储转换后的像素值到数组中
//       unpackedBuffer[i / depth] = pixelVal
//     }
//     return this.ImageSamplingColRow(unpackedBuffer, width, height)
//   }
//   private static ImageSamplingColRow = (unpackedBuffer, width, height) => {
//     // 创建一个缓冲区，用于存储转换后的字节数据
//     const buffer = Buffer.alloc((width * height) / 8)
//     // 列行式
//     for (let i = 0; i < unpackedBuffer.length; i++) {
//       let x = Math.floor(i % width)
//       let y = Math.floor(i / width)
//       let byte = 0
//       // 确定取模的 page
//       let page = Math.floor(y / 8)
//       // 每个 page 的字节的位
//       let pageShift = 0x01 << (y - 8 * page)
//       // 计算字节位置，后面的 page 的字节需要加上前面的 page 的位置
//       page === 0 ? (byte = x) : (byte = x + width * page)
//       // 根据转换后的像素值设置缓冲区的相应位
//       if (unpackedBuffer[i] === 0) {
//         buffer[byte] |= pageShift
//       } else {
//         buffer[byte] &= ~pageShift
//       }
//     }
//     // 返回转换后的lcd数据
//     return buffer
//   }
//   // 创建 ImageData 对象
//   private static createImageDate = (imageData) => {
//     // 创建一个缓冲区，用于存储图像数据
//     let buffer = Buffer.alloc(imageData.width * imageData.height * 4)
//     // 重组 ImageData 的数据
//     for (let y = 0, pos = 0; y < imageData.height; y++) {
//       for (let x = 0; x < imageData.width; x++) {
//         buffer.writeUInt32BE(this.getPixel(imageData, x, y), pos)
//         pos += 4
//       }
//     }
//     // 更新图像数据为缓冲区中的数据
//     // imageData.data = buffer
//     imageData.data.set(buffer);
//     return imageData
//     // return new ImageData(new Uint8ClampedArray(buffer), imageData.width, imageData.height)
//   }
//   // 获取指定位置的像素值
//   private static getPixel = (image, x, y) => {
//     x = x | 0
//     y = y | 0
//     // 检查坐标是否越界，如果越界返回 0
//     if (x < 0 || y < 0 || x >= image.width || y >= image.height) return 0
//     let index = (y * image.width + x) * image.channels,
//       r,
//       g,
//       b,
//       a
//     // 根据通道数获取相应的颜色值
//     switch (image.channels) {
//       case 1:
//         r = g = b = image.data[index]
//         a = 255
//         break
//       case 2:
//         r = g = b = image.data[index]
//         a = image.data[index + 1]
//         break
//       case 3:
//         r = image.data[index]
//         g = image.data[index + 1]
//         b = image.data[index + 2]
//         a = 255
//         break
//       case 4:
//         r = image.data[index]
//         g = image.data[index + 1]
//         b = image.data[index + 2]
//         a = image.data[index + 3]
//         break
//     }
//     // 将颜色值转换为十六进制像素值并返回
//     return ((r << 24) | (g << 16) | (b << 8) | a) >>> 0
//   }
//   private static hex2hex = (hex) => {
//     for (var bytes = [], c = 0; c < hex.length; c += 2) {
//       bytes.push('0x' + hex.substr(c, 2))
//     }
//     return bytes
//   }
// }
