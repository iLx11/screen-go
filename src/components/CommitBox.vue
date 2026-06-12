<script setup lang="ts">
import { useScreenStore } from '../stores/store'
import { nextTick } from 'vue'
import { XBox } from 'ilx1-x-box'
import { resizeImage, generate } from 'ilx1-x-tool'
import { useConfigStore } from '@/stores/configStore'
import { recordSizePreset } from '@/utils/tools/sizePreset'
import { generateFontData, getUniqueFontText } from '@/utils/tools/fontGenerate'

const configStore = useConfigStore()
const win = window as any
const screenStore = useScreenStore()

const getVideoTimeout = () => {
  const frameCount = Math.ceil(
    Math.max(1, screenStore.videoDur) * Math.max(1, screenStore.videoFrame)
  )
  return Math.max(60000, Math.min(frameCount * 3000 + 30000, 600000))
}

const isPositiveNumber = (value: unknown) => {
  const num = Number(value)
  return Number.isFinite(num) && num > 0
}

const isNonNegativeNumber = (value: unknown) => {
  const num = Number(value)
  return Number.isFinite(num) && num >= 0
}

const closeWaitExecute = async () => {
  screenStore.setWaitCancelable(false)
  screenStore.setWaitExecute(false)
  await nextTick()
  screenStore.resetWaitProgress()
}

const waitTimeout = async (promise: Promise<unknown>, timeout: number) => {
  let timer: ReturnType<typeof setTimeout> | null = null
  try {
    return await Promise.race([
      promise,
      new Promise((resolve, reject) => {
        timer = setTimeout(() => reject(new Error('视频取模超时')), timeout)
      }),
    ])
  } finally {
    if (timer != null) clearTimeout(timer)
  }
}

const getVideoFrameData = async (timeout: number, ...args: unknown[]) => {
  const handler = win.api.getVideoFrameData || win.api.data?.getVideoFrameData
  if (typeof handler != 'function') {
    throw new TypeError('getVideoFrameData is not exposed in preload')
  }
  return await waitTimeout(Promise.resolve(handler(...args)), timeout)
}

const imgHandle = async () => {
  const imageSource = configStore.screenData.baseData || screenStore.editorPicData

  if (imageSource == '') {
    XBox.popMes('请先编辑一个图片！')
    return false
  }
  if (configStore.screenData.baseData == '') {
    configStore.screenData.baseData = imageSource
  }
  if (
    configStore.screenConfig.resizeWidth == 0 ||
    configStore.screenConfig.resizeHeight == 0
  ) {
    XBox.popMes('请设置图片的大小！')
    return false
  }
  screenStore.resetWaitProgress()
  screenStore.setWaitProgressText('处理数据中...')
  screenStore.setWaitProgressVisible(false)
  screenStore.setWaitCancelable(false)
  screenStore.setWaitCanceled(false)
  screenStore.setWaitExecute(true)
  try {
    const configArray = [...configStore.screenConfig.configArray]

    // 缩放图片
    const data = await resizeImage(
      configStore.screenConfig.resizeWidth,
      configStore.screenConfig.resizeHeight,
      imageSource,
      Boolean(configArray[4])
    )
    configStore.screenData.resizeData = data
    screenStore.setWaitProgressText('处理数据中...')
    screenStore.setResized(true)

    // ----------------------------- 图片取模 ------------------------------------
    // 获取图片取模模式
    const arrData = await generate(
      data,
      configStore.screenConfig.thresholdData,
      configArray
    )

    screenStore.setDataLength(arrData.length)
    screenStore.setResultString(arrData.join(','))
    configStore.showPop('生成成功！')
    return true
  } catch (error) {
    console.error(error)
    XBox.popMes('生成失败！')
    return false
  } finally {
    await closeWaitExecute()
  }
}

// 视频取模处理
// 字体取模处理
const fontHandle = async () => {
  const text = getUniqueFontText(screenStore.fontText)
  const width = Math.max(1, Math.floor(Number(screenStore.fontWidth) || 0))
  const height = Math.max(1, Math.floor(Number(screenStore.fontHeight) || 0))
  const fontSize = Math.max(1, Math.floor(Number(screenStore.fontSize) || 0))

  if (!text) {
    XBox.popMes('请输入要取模的字符')
    return false
  }

  screenStore.resetWaitProgress()
  screenStore.setWaitProgressText('处理字体数据中...')
  screenStore.setWaitProgressVisible(false)
  screenStore.setWaitCancelable(false)
  screenStore.setWaitCanceled(false)
  screenStore.setWaitExecute(true)

  try {
    const configArray = [...configStore.screenConfig.configArray]
    screenStore.setFontText(text)
    configArray[4] = 1
    configStore.screenConfig.resizeWidth = width
    configStore.screenConfig.resizeHeight = height
    configStore.screenConfig.configArray = [...configArray]
    screenStore.setResizeWidth(width)
    screenStore.setResizeHeight(height)

    const dataList = generateFontData({
      text,
      fontFamily: screenStore.fontFamily,
      width,
      height,
      fontSize,
      fontWeight: screenStore.fontWeight,
      offsetX: screenStore.fontOffsetX,
      offsetY: screenStore.fontOffsetY,
      configArray,
    })

    if (dataList.length == 0) {
      XBox.popMes('字体取模失败！')
      return false
    }

    const result =
      dataList.length == 1
        ? Array.from(dataList[0]).join(',')
        : dataList.map(item => `{${Array.from(item).join(',')}}`).join(',')

    screenStore.setDataLength(Array.from(dataList[0]).length)
    screenStore.setResultString(result)
    configStore.showPop('生成成功！')
    return true
  } catch (error) {
    console.error(error)
    XBox.popMes('字体取模失败！')
    return false
  } finally {
    await closeWaitExecute()
  }
}

// 视频取模处理
const videoHandle = async () => {
  if (
    !isPositiveNumber(screenStore.resizeWidth) ||
    !isPositiveNumber(screenStore.resizeHeight)
  ) {
    XBox.popMes('请设置要取模的大小！')
    return false
  }
  if (screenStore.videoPath == '') {
    XBox.popMes('请选择一个视频文件！')
    return false
  }
  if (
    !isPositiveNumber(screenStore.videoDur) ||
    !isPositiveNumber(screenStore.videoFrame)
  ) {
    XBox.popMes('请配置时长与帧数！')
    return false
  }
  if (!isNonNegativeNumber(screenStore.videoStart)) {
    XBox.popMes('请配置视频开始时间！')
    return false
  }
  if (
    isPositiveNumber(screenStore.videoTotalDur) &&
    Number(screenStore.videoStart) >= Number(screenStore.videoTotalDur)
  ) {
    XBox.popMes('开始时间不能超过视频时长！')
    return false
  }

  screenStore.resetWaitProgress()
  screenStore.setWaitProgressText('准备视频取模...')
  screenStore.setWaitProgressVisible(true)
  screenStore.setWaitCancelable(true)
  screenStore.setWaitCanceled(false)
  screenStore.setWaitExecute(true)
  try {
    const data = await getVideoFrameData(
      getVideoTimeout(),
      screenStore.videoPath,
      screenStore.resizeWidth,
      screenStore.resizeHeight,
      screenStore.videoStart,
      screenStore.videoDur,
      screenStore.videoFrame,
      screenStore.videoScaleMode,
      screenStore.thresholdData,
      ...screenStore.configArray
    )
    if (!Array.isArray(data) || data.length == 0) {
      const isCanceled = screenStore.waitCanceled
      await closeWaitExecute()
      XBox.popMes(isCanceled ? '已取消视频取模！' : '视频取模失败！')
      screenStore.setWaitCanceled(false)
      return false
    }

    let result = ''
    data.forEach(o => {
      result += `{${Array.from(o).join(',')}},`
    })
    screenStore.setDataLength(Array.from(data[0]).length)
    screenStore.setResultString(result)
    await closeWaitExecute()
    screenStore.setWaitCanceled(false)
    XBox.popMes('生成成功！')
    return true
  } catch (error) {
    console.error(error)
    const isCanceled = screenStore.waitCanceled
    await closeWaitExecute()
    XBox.popMes(isCanceled ? '已取消视频取模！' : '生成失败！')
    screenStore.setWaitCanceled(false)
    return false
  } finally {
    screenStore.setWaitExecute(false)
  }
}

// 图片大小配置预设
const imgPreSet = () => {
  const width = screenStore.curMode
    ? screenStore.resizeWidth
    : configStore.screenConfig.resizeWidth
  const height = screenStore.curMode
    ? screenStore.resizeHeight
    : configStore.screenConfig.resizeHeight

  recordSizePreset(width, height)
  screenStore.setCountModify(true)
}

// 提交处理
const commit = async () => {
  if (screenStore.waitExecute) return
  if (screenStore.workMode == 'font') {
    await fontHandle()
    return
  }
  // 图片取模
  if (!screenStore.curMode) {
    // 处理图片
    const isSuccess = await imgHandle()
    // 记录处理的大小预设
    if (isSuccess) imgPreSet()
    // 视频取模
  } else {
    const isSuccess = await videoHandle()
    // 记录处理的大小预设
    if (isSuccess) imgPreSet()
  }
}
</script>

<template>
  <div
    id="commit-box-content"
    @click="commit"
  >
    提交生成
  </div>
</template>

<style lang="scss">
#commit-box-content {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  border: none;
  font-size: 20px;
  font-weight: bold;
  color: rgba(255, 255, 255);
  cursor: pointer;
  background: var(--commit-box-color);
}
</style>
