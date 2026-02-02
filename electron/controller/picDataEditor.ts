// const { ipcMain } = require('electron')

// // import ImageToHexArray from './ImageToHexArray'
// import { resizeImage, generate } from 'ilx1-x-tool'

// export const picDataListener = () => {
//   // 缩放图片
//   ipcMain.handle(
//     'pic-data-editor',
//     async (event, width, height, picData, colorMode) => {
//       const result = await ImageToHexArray.resizeImage(
//         width,
//         height,
//         picData,
//         colorMode
//       )
//       return result
//     }
//   )

//   // 生成结果数组
//   ipcMain.handle(
//     'pic-data-parse',
//     async (event, data, threshold, ...configArray) => {
//       // console.info('configArray------------->', configArray)
//       const result = await ImageToHexArray.generate(
//         data,
//         threshold,
//         configArray
//       )
//       return result
//     }
//   )
// }
