import { resolve } from 'path'
import { resizeImageWithKonva, generate } from 'ilx1-x-tool'

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
  // ÿ���2���ȡ����ͼkj,mnbnnnn
  // const videoFilePath = path.join(__dirname, '../../dist/video/test.mp4')
  return new Promise((resolve, reject) => {
    // ʹ��fluent-ffmpeg��ȡ��ͼ
    ffmpeg(videoPath)
      .on('end', () => {
        resolve(true)
        console.info('screeshot ok')
      })
      .on('error', err => {
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
  // ��ȡͼƬ����������
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
      // ���� temp Ŀ¼
      const tempDirPath = path.join(__dirname, '../../temp')
      if (!fs.existsSync(tempDirPath)) {
        fs.mkdirSync(tempDirPath)
      }
      // ��ȡ��ƵͼƬ
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
      // ����ͼƬȡģ����
      const files = fs.readdirSync(tempDirPath, {
        withFileTypes: true,
      })

      for (let o of files) {
        try {
          // ��ȡͼƬ�ļ�
          const imageBuffer = fs.readFileSync(path.join(tempDirPath, o.name))
          // ��ͼƬ����ת��Ϊ Base64
          const base64Image = imageBuffer.toString('base64')
          // ����ͼƬ����
          const arrData = await generate(base64Image, threshold, configArray)
          // console.info('------------- do')
          resultData.push(arrData)
        } catch (error) {
          console.error('Error reading image:', error)
          return null
        }
        // ɾ���ļ�
        fs.unlinkSync(path.join(tempDirPath, o.name))
      }
      // console.info('------------------- ok ')
      // ɾ�� temp Ŀ¼
      fs.rmdir(tempDirPath)
      return resultData
    }
  )
}

// ����ʱ�����ַ�������
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
