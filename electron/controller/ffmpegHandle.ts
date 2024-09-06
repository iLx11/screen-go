import { resolve } from 'path'
import ImageToHexArray from './ImageToHexArray'
import { imgEditorHandle } from './picDataEditor'

const { ipcMain } = require('electron')
const fs = require('fs-extra')
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path
const ffprobePath = require('@ffprobe-installer/ffprobe').path

const ffmpeg = require('fluent-ffmpeg')
const path = require('path')

ffmpeg.setFfmpegPath(ffmpegPath)
ffmpeg.setFfprobePath(ffprobePath)

const ffmpegScreenShot = async (videoPath, timeArr, tempPath, sizedata) => {
  //   ffmpeg.setFfmpegPath(pathToFfmpeg)
  // 每间隔2秒截取缩略图kj,mnbnnnn
  // const videoFilePath = path.join(__dirname, '../../dist/video/test.mp4')
  return new Promise((resolve, reject) => {
    // 使用fluent-ffmpeg获取截图
    ffmpeg(videoPath)
      .on('end', () => {
        resolve(true)
        console.info('screeshot ok')
      })
      .on('error', (err) => {
        console.info('error ->', err)
        reject(err)
      })
      .screenshots({
        timestamps: timeArr,
        filename: 'temp_%i.png',
        folder: tempPath,
        size: `${sizedata}`,
      })
  })
}

export const ffmpegListener = async () => {
  // 截取图片并生成数据
  ipcMain.handle(
    'get-video-frame-data',
    async (
      event,
      videoPath,
      width,
      height,
      videoDur,
      videoFrame,
      threshold,
      ...configArray
    ) => {
      // 创建 temp 目录
      const tempDirPath = path.join(__dirname, '../../temp')
      if (!fs.existsSync(tempDirPath)) {
        fs.mkdirSync(tempDirPath)
      }
      // 截取视频图片
      const frameStrArr = genTimestampArr(videoDur, videoFrame)
      const result = await ffmpegScreenShot(
        videoPath,
        frameStrArr,
        tempDirPath,
        `${width}x${height}`
      )
      if (!result) {
        console.info('video frame error')
        return
      }
      let resultData = []
      // 生成图片取模数据
      const files = fs.readdirSync(tempDirPath, {
        withFileTypes: true,
      })

      for (let o of files) {
        try {
          // 读取图片文件
          const imageBuffer = fs.readFileSync(path.join(tempDirPath, o.name))
          // 将图片内容转换为 Base64
          const base64Image = imageBuffer.toString('base64')
          // 处理图片数据
          const arrData = await ImageToHexArray.generate(
            base64Image,
            threshold,
            configArray
          )
          // console.info('------------- do')
          resultData.push(arrData)
        } catch (error) {
          console.error('Error reading image:', error)
          return null
        }
        // 删除文件
        fs.unlinkSync(path.join(tempDirPath, o.name))
      }
      // console.info('------------------- ok ')
      // 删除 temp 目录
      fs.rmdir(tempDirPath)
      return resultData
    }
  )
}

// 生成时间轴字符串数组
const genTimestampArr = (videoDur, videoFrame) => {
  let temp = 1 / videoFrame
  let strArr = []
  for (let i = 0; i < videoDur; i++) {
    for (let j = 0; j < videoFrame; j++) {
      strArr.push(String((i + temp * j).toFixed(2)))
    }
  }
  return strArr
}
