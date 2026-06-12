const { ipcMain, nativeImage } = require('electron')
const fs = require('fs-extra')
const { spawn } = require('child_process')
const path = require('path')
const os = require('os')

const normalizeAsarBinaryPath = binaryPath => {
  return String(binaryPath).replace(/app\.asar([\\/])/, 'app.asar.unpacked$1')
}

const ffmpegPath = normalizeAsarBinaryPath(require('@ffmpeg-installer/ffmpeg').path)
const ffprobePath = normalizeAsarBinaryPath(require('@ffprobe-installer/ffprobe').path)

const DEFAULT_CONFIG_ARRAY = [1, 2, 0, 0, 1]
const DEFAULT_THRESHOLD = 120
const videoTaskMap = new Map()
const VIDEO_TEMP_DIR_REG = /^video_\d+_[a-f0-9]+$/i
const VIDEO_TEMP_FRAME_REG = /^temp_\d+\.png$/i

const getVideoTempRootPath = () => {
  return path.join(os.tmpdir() || process.cwd(), 'screen-go-video')
}

const removeTempPath = targetPath => {
  try {
    if (fs.existsSync(targetPath)) {
      fs.removeSync(targetPath)
    }
  } catch (error) {
    console.error('Remove temp path failed:', targetPath, error)
  }
}

const removeTempRootIfEmpty = () => {
  try {
    const tempRootPath = getVideoTempRootPath()
    if (fs.existsSync(tempRootPath) && fs.readdirSync(tempRootPath).length == 0) {
      fs.removeSync(tempRootPath)
    }
  } catch (error) {
    console.error('Remove temp root failed:', error)
  }
}

const cleanupVideoTempRoot = () => {
  try {
    const tempRootPath = getVideoTempRootPath()
    if (!fs.existsSync(tempRootPath)) return

    fs.readdirSync(tempRootPath, { withFileTypes: true }).forEach(item => {
      const shouldRemove =
        (item.isDirectory() && VIDEO_TEMP_DIR_REG.test(item.name)) ||
        (item.isFile() && VIDEO_TEMP_FRAME_REG.test(item.name))

      if (shouldRemove) {
        removeTempPath(path.join(tempRootPath, item.name))
      }
    })
    removeTempRootIfEmpty()
  } catch (error) {
    console.error('Cleanup video temp failed:', error)
  }
}

const getVideoTaskKey = event => {
  return event?.sender?.id || 0
}

const createVideoTask = event => {
  const key = getVideoTaskKey(event)
  const oldTask = videoTaskMap.get(key)
  if (oldTask?.process && !oldTask.process.killed) {
    oldTask.cancelled = true
    oldTask.process.kill('SIGTERM')
  }

  const task = {
    cancelled: false,
    process: null,
  }
  videoTaskMap.set(key, task)
  return { key, task }
}

const cancelVideoTask = event => {
  const task = videoTaskMap.get(getVideoTaskKey(event))
  if (!task) return false
  task.cancelled = true
  if (task.process && !task.process.killed) {
    task.process.kill('SIGTERM')
  }
  return true
}

const assertVideoTaskActive = task => {
  if (task?.cancelled) {
    throw new Error('VIDEO_TASK_CANCELLED')
  }
}

const sendVideoProgress = (event, progress, message) => {
  if (!event?.sender || event.sender.isDestroyed()) return
  const value = Math.round(Number(progress))
  event.sender.send('video-frame-progress', {
    progress: Number.isFinite(value) ? Math.max(0, Math.min(value, 100)) : 0,
    message,
  })
}

const getErrorMessage = error => {
  if (error?.message) return String(error.message)
  if (typeof error == 'string') return error
  try {
    return JSON.stringify(error)
  } catch {
    return String(error)
  }
}

const removeEmptyErrorFields = payload => {
  Object.keys(payload).forEach(key => {
    if (payload[key] == null || payload[key] === '') {
      delete payload[key]
    }
  })
  return payload
}

const createVideoErrorPayload = (error, extra = {}) => {
  return removeEmptyErrorFields({
    ...extra,
    name: error?.name || 'Error',
    message: getErrorMessage(error),
    stack: error?.stack,
    code: error?.code,
    phase: error?.phase || extra?.phase,
    errno: error?.errno,
    syscall: error?.syscall,
    path: error?.path,
    exitCode: error?.exitCode,
    stderr: error?.stderr,
    args: error?.args,
    binaryPath: error?.binaryPath,
    ffmpegPath,
    ffprobePath,
    platform: process.platform,
    arch: process.arch,
  })
}

const sendVideoError = (event, error, extra = {}) => {
  if (!event?.sender || event.sender.isDestroyed()) return
  event.sender.send('video-frame-error', createVideoErrorPayload(error, extra))
}

const toPositiveInt = value => {
  const num = Number(value)
  if (!Number.isFinite(num)) return 0
  return Math.max(0, Math.floor(num))
}

const toNonNegativeNumber = value => {
  const num = Number(value)
  if (!Number.isFinite(num)) return 0
  return Math.max(0, num)
}

const runFfmpeg = (args, task = null) => {
  return new Promise((resolve, reject) => {
    if (task?.cancelled) {
      reject(new Error('VIDEO_TASK_CANCELLED'))
      return
    }

    let stderr = ''
    const ffmpegProc = spawn(ffmpegPath, args, { windowsHide: true })
    if (task) task.process = ffmpegProc

    if (ffmpegProc.stderr) {
      ffmpegProc.stderr.setEncoding('utf8')
      ffmpegProc.stderr.on('data', data => {
        stderr += data
      })
    }

    ffmpegProc.on('error', error => {
      reject(
        Object.assign(error, {
          phase: 'spawn-ffmpeg',
          args,
          binaryPath: ffmpegPath,
        })
      )
    })
    ffmpegProc.on('close', code => {
      if (task?.process === ffmpegProc) task.process = null
      if (task?.cancelled) {
        reject(new Error('VIDEO_TASK_CANCELLED'))
        return
      }
      if (code === 0) {
        resolve(true)
        return
      }
      reject(
        Object.assign(new Error(`ffmpeg exited with code ${code}: ${stderr.slice(-1000)}`), {
          phase: 'run-ffmpeg',
          exitCode: code,
          stderr: stderr.slice(-4000),
          args,
          binaryPath: ffmpegPath,
        })
      )
    })
  })
}

const runFfprobe = args => {
  return new Promise((resolve, reject) => {
    let stdout = ''
    let stderr = ''
    const ffprobeProc = spawn(ffprobePath, args, { windowsHide: true })

    if (ffprobeProc.stdout) {
      ffprobeProc.stdout.setEncoding('utf8')
      ffprobeProc.stdout.on('data', data => {
        stdout += data
      })
    }

    if (ffprobeProc.stderr) {
      ffprobeProc.stderr.setEncoding('utf8')
      ffprobeProc.stderr.on('data', data => {
        stderr += data
      })
    }

    ffprobeProc.on('error', error => {
      reject(
        Object.assign(error, {
          phase: 'spawn-ffprobe',
          args,
          binaryPath: ffprobePath,
        })
      )
    })
    ffprobeProc.on('close', code => {
      if (code === 0) {
        resolve(stdout)
        return
      }
      reject(
        Object.assign(new Error(`ffprobe exited with code ${code}: ${stderr.slice(-1000)}`), {
          phase: 'run-ffprobe',
          exitCode: code,
          stderr: stderr.slice(-4000),
          args,
          binaryPath: ffprobePath,
        })
      )
    })
  })
}

const getVideoInfo = async videoPath => {
  const output = await runFfprobe([
    '-v',
    'error',
    '-select_streams',
    'v:0',
    '-show_entries',
    'format=duration:stream=width,height,duration',
    '-of',
    'json',
    videoPath,
  ])
  const data = JSON.parse(output || '{}')
  const stream = data.streams?.[0] || {}
  const duration = toNonNegativeNumber(data.format?.duration || stream.duration)

  return {
    width: toPositiveInt(stream.width),
    height: toPositiveInt(stream.height),
    duration: Number(duration.toFixed(2)),
  }
}

const getScaleFilter = (width, height, scaleMode) => {
  switch (scaleMode) {
    case 'contain':
      return `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:black`
    case 'cover':
      return `scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height}`
    default:
      return `scale=${width}:${height}`
  }
}

const ffmpegScreenShot = async (
  videoPath,
  timeArr,
  tempPath,
  width,
  height,
  scaleMode,
  onProgress,
  task
) => {
  // 每次只截取一帧，避免 Windows 下命令参数过长
  for (let index = 0; index < timeArr.length; index++) {
    assertVideoTaskActive(task)
    const outputPath = path.join(tempPath, `temp_${index + 1}.png`)
    const args = [
      '-y',
      '-ss',
      String(timeArr[index]),
      '-i',
      videoPath,
      '-frames:v',
      '1',
      '-vf',
      getScaleFilter(width, height, scaleMode),
      outputPath,
    ]

    await runFfmpeg(args, task)
    assertVideoTaskActive(task)
    onProgress?.(index + 1, timeArr.length)
  }

  console.info('screeshot ok')
  return true
}

const normalizeConfigArray = configArray => {
  return DEFAULT_CONFIG_ARRAY.map((defaultValue, index) => {
    const value = Number(configArray?.[index])
    return Number.isFinite(value) ? Math.trunc(value) : defaultValue
  })
}

const formatBytes = (bytes, outputMode) => {
  const data = Array.from(bytes)
  if (outputMode === 0) {
    return data.map(value => `0x${value.toString(16).padStart(2, '0')}`)
  }
  return data
}

const getBitMask = (offset, configArray) => {
  return configArray[2] != 0 ? 1 << (7 - offset) : 1 << offset
}

const getPointValue = (value, configArray) => {
  return configArray[0] !== 0 ? (value === 0 ? 1 : 0) : value
}

const writePoint = (bytes, byteIndex, bitMask, pointValue) => {
  if (pointValue === 0) {
    bytes[byteIndex] |= bitMask
  } else {
    bytes[byteIndex] &= ~bitMask
  }
}

const sampleRow = (points, width, height, configArray) => {
  const bytesPerRow = Math.ceil(width / 8)
  const bytes = new Uint8Array(bytesPerRow * height)

  for (let index = 0; index < points.length; index++) {
    const x = index % width
    const y = Math.floor(index / width)
    const byteIndex = y * bytesPerRow + Math.floor(x / 8)
    const bitMask = getBitMask(x % 8, configArray)
    const pointValue = getPointValue(points[index], configArray)
    writePoint(bytes, byteIndex, bitMask, pointValue)
  }

  return bytes
}

const sampleCol = (points, width, height, configArray) => {
  const bytesPerCol = Math.ceil(height / 8)
  const bytes = new Uint8Array(bytesPerCol * width)

  for (let index = 0; index < points.length; index++) {
    const x = index % width
    const y = Math.floor(index / width)
    const byteIndex = x * bytesPerCol + Math.floor(y / 8)
    const bitMask = getBitMask(y % 8, configArray)
    const pointValue = getPointValue(points[index], configArray)
    writePoint(bytes, byteIndex, bitMask, pointValue)
  }

  return bytes
}

const sampleColRow = (points, width, height, configArray) => {
  const bytes = new Uint8Array(Math.ceil(height / 8) * width)

  for (let index = 0; index < points.length; index++) {
    const x = index % width
    const y = Math.floor(index / width)
    const byteIndex = x + Math.floor(y / 8) * width
    const bitMask = getBitMask(y % 8, configArray)
    const pointValue = getPointValue(points[index], configArray)
    writePoint(bytes, byteIndex, bitMask, pointValue)
  }

  return bytes
}

const sampleRowCol = (points, width, height, configArray) => {
  const bytes = new Uint8Array(Math.ceil(width / 8) * height)

  for (let index = 0; index < points.length; index++) {
    const x = index % width
    const y = Math.floor(index / width)
    const byteIndex = Math.floor(x / 8) * height + y
    const bitMask = getBitMask(x % 8, configArray)
    const pointValue = getPointValue(points[index], configArray)
    writePoint(bytes, byteIndex, bitMask, pointValue)
  }

  return bytes
}

const sampleMono = (bitmap, width, height, threshold, configArray) => {
  const points = new Uint8Array(width * height)

  for (let index = 0, pointIndex = 0; index < bitmap.length; index += 4, pointIndex++) {
    const b = bitmap[index]
    const g = bitmap[index + 1]
    const r = bitmap[index + 2]
    const gray = 0.299 * r + 0.587 * g + 0.114 * b
    points[pointIndex] = gray > threshold ? 1 : 0
  }

  switch (configArray[1]) {
    case 0:
      return sampleRow(points, width, height, configArray)
    case 1:
      return sampleCol(points, width, height, configArray)
    case 2:
      return sampleColRow(points, width, height, configArray)
    case 3:
      return sampleRowCol(points, width, height, configArray)
    default:
      return sampleColRow(points, width, height, configArray)
  }
}

const sampleColor = (bitmap, configArray) => {
  const bytes = new Uint8Array((bitmap.length / 4) * 2)
  let outIndex = 0

  for (let index = 0; index < bitmap.length; index += 4) {
    const b = bitmap[index]
    const g = bitmap[index + 1]
    const r = bitmap[index + 2]
    const color = ((r >> 3) << 11) | ((g >> 2) << 5) | (b >> 3)
    let high = (color >> 8) & 0xff
    let low = color & 0xff

    if (configArray[0] == 0 || configArray[2] == 1) {
      high = ~high & 0xff
      low = ~low & 0xff
    }

    bytes[outIndex++] = high
    bytes[outIndex++] = low
  }

  return bytes
}

const getFrameIndex = name => {
  const match = name.match(/temp_(\d+)\.png$/i)
  return match ? Number(match[1]) : 0
}

const generateFrameData = (imageBuffer, width, height, threshold, configArray) => {
  const config = normalizeConfigArray(configArray)
  const thresholdValue = Number(threshold)
  const image = nativeImage.createFromBuffer(imageBuffer)

  if (image.isEmpty()) {
    throw new Error('视频帧图片解析失败')
  }

  const targetWidth = Number(width)
  const targetHeight = Number(height)
  const resizedImage =
    targetWidth > 0 && targetHeight > 0
      ? image.resize({ width: targetWidth, height: targetHeight, quality: 'best' })
      : image
  const size = resizedImage.getSize()
  const bitmap = resizedImage.toBitmap()
  const bytes =
    config[4] === 1
      ? sampleMono(
          bitmap,
          size.width,
          size.height,
          Number.isFinite(thresholdValue) ? thresholdValue : DEFAULT_THRESHOLD,
          config
        )
      : sampleColor(bitmap, config)

  return formatBytes(bytes, config[3])
}

export const ffmpegListener = async () => {
  cleanupVideoTempRoot()

  ipcMain.handle('get-video-info', async (event, videoPath) => {
    try {
      if (!videoPath) return null
      return await getVideoInfo(videoPath)
    } catch (error) {
      console.error('Error reading video info:', error)
      sendVideoError(event, error, {
        phase: error?.phase || 'get-video-info',
        videoPath,
      })
      return null
    }
  })

  // 获取视频帧取模数据
  ipcMain.handle(
    'get-video-frame-data',
    async (
      event,
      videoPath,
      width,
      height,
      videoStart,
      videoDur,
      videoFrame,
      scaleMode,
      threshold,
      ...configArray
    ) => {
      // 创建临时目录
      const tempDirPath = path.join(
        getVideoTempRootPath(),
        `video_${Date.now()}_${Math.random().toString(16).slice(2)}`
      )

      const { key, task } = createVideoTask(event)

      try {
        const targetWidth = toPositiveInt(width)
        const targetHeight = toPositiveInt(height)
        const targetStart = toNonNegativeNumber(videoStart)
        const targetDur = toPositiveInt(videoDur)
        const targetFrame = toPositiveInt(videoFrame)

        if (!targetWidth || !targetHeight || !targetDur || !targetFrame) {
          sendVideoError(event, new Error('视频配置错误'), {
            phase: 'validate-video-config',
            videoPath,
            width,
            height,
            videoStart,
            videoDur,
            videoFrame,
            scaleMode,
            threshold,
            configArray,
          })
          sendVideoProgress(event, 100, '视频配置错误')
          return null
        }

        fs.ensureDirSync(tempDirPath)
        sendVideoProgress(event, 0, '准备视频取模...')

        // 获取视频帧图片
        const frameStrArr = genTimestampArr(targetStart, targetDur, targetFrame)
        assertVideoTaskActive(task)
        const result = await ffmpegScreenShot(
          videoPath,
          frameStrArr,
          tempDirPath,
          targetWidth,
          targetHeight,
          scaleMode,
          (current, total) => {
            if (task.cancelled) return
            sendVideoProgress(
              event,
              total > 0 ? (current / total) * 70 : 0,
              `正在截取视频帧 ${current}/${total}`
            )
          },
          task
        )
        assertVideoTaskActive(task)
        if (!result) {
          console.info('video frame error')
          sendVideoError(event, new Error('视频帧截取失败'), {
            phase: 'capture-video-frame',
            videoPath,
            tempDirPath,
          })
          sendVideoProgress(event, 100, '视频取模失败')
          return null
        }

        let resultData = []
        // 读取图片并取模
        const files = fs
          .readdirSync(tempDirPath, {
            withFileTypes: true,
          })
          .filter(file => file.isFile() && file.name.toLowerCase().endsWith('.png'))
          .sort((a, b) => getFrameIndex(a.name) - getFrameIndex(b.name))

        if (files.length == 0) {
          sendVideoError(event, new Error('视频帧文件为空'), {
            phase: 'read-video-frame-files',
            videoPath,
            tempDirPath,
          })
          sendVideoProgress(event, 100, '视频取模失败')
          return null
        }

        for (let index = 0; index < files.length; index++) {
          assertVideoTaskActive(task)
          const o = files[index]
          const imageBuffer = fs.readFileSync(path.join(tempDirPath, o.name))
          const arrData = generateFrameData(
            imageBuffer,
            targetWidth,
            targetHeight,
            threshold,
            configArray
          )
          resultData.push(arrData)
          if (task.cancelled) return null
          sendVideoProgress(
            event,
            70 + ((index + 1) / files.length) * 30,
            `正在生成取模数据 ${index + 1}/${files.length}`
          )
        }

        sendVideoProgress(event, 100, '视频取模完成')
        return resultData
      } catch (error) {
        if (error?.message === 'VIDEO_TASK_CANCELLED') {
          sendVideoProgress(event, 100, '已取消视频取模')
          return null
        }
        console.error('Error reading image:', error)
        sendVideoError(event, error, {
          phase: error?.phase || 'get-video-frame-data',
          videoPath,
          tempDirPath,
          width,
          height,
          videoStart,
          videoDur,
          videoFrame,
          scaleMode,
          threshold,
          configArray,
        })
        sendVideoProgress(event, 100, '视频取模失败')
        return null
      } finally {
        if (videoTaskMap.get(key) === task) {
          videoTaskMap.delete(key)
        }
        removeTempPath(tempDirPath)
        removeTempRootIfEmpty()
      }
    }
  )

  ipcMain.handle('cancel-video-frame-data', async event => {
    const cancelled = cancelVideoTask(event)
    if (cancelled) {
      sendVideoProgress(event, 100, '正在取消视频取模...')
    }
    return cancelled
  })
}

// 生成时间戳字符串数组
const genTimestampArr = (videoStart, videoDur, videoFrame) => {
  const start = toNonNegativeNumber(videoStart)
  const dur = toPositiveInt(videoDur)
  const frame = toPositiveInt(videoFrame)
  const temp = 1 / frame
  const strArr = []

  for (let i = 0; i < dur; i++) {
    for (let j = 0; j < frame; j++) {
      strArr.push(String((start + i + temp * j).toFixed(2)))
    }
  }

  return strArr
}
