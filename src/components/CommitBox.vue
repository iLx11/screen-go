<script setup lang="ts">
import { useScreenStore } from '../stores/store'
import { getItem, setItem } from '../utils/storage'
import { onMounted, reactive } from 'vue'
import { XBox } from 'ilx1-x-box'
import { resizeImageWithKonva, generate } from 'ilx1-x-tool'
import { useConfigStore } from '@/stores/configStore'

const configStore = useConfigStore()
// const { ipcRenderer } = require('electron')
const win = window as any
const screenStore = useScreenStore()
const presetArray: object[] = reactive([{}, {}, {}])
let presetCount: number = 0

const imgHandle = async () => {
  if (configStore.screenData.baseData == '') {
    XBox.popMes('请先编辑一个图片！')
    return
  }
  if (
    configStore.screenConfig.resizeWidth == 0 ||
    configStore.screenConfig.resizeHeight == 0
  ) {
    XBox.popMes('请设置图片的大小！')
    return
  }
  screenStore.setWaitExecute(true)
  // console.info('-----------------------------')
  // + data:image/png;base64,
  // console.info(screenStore.editorPicData)
  // 缩放图片
  const data = await resizeImageWithKonva(
    configStore.screenConfig.resizeWidth,
    configStore.screenConfig.resizeHeight,
    configStore.screenData.baseData,
    configStore.screenConfig.configArray[4]
  )
  // console.log('pic-data-editor', data)
  // screenStore.setResizePicData(data)
  configStore.screenData.resizeData = data
  screenStore.setResized(true)
  // console.info(data)
  // ----------------------------- 图片取模 ------------------------------------
  // 获取图片取模模式
  const arrData = await generate(
    data,
    configStore.screenConfig.thresholdData,
    ...configStore.screenConfig.configArray
  )

  screenStore.setDataLength(arrData.length)
  screenStore.setResultString(arrData.join(','))
  configStore.showPop('生成成功！')
  
  screenStore.setCountModify(true)
  screenStore.setPreCount(presetCount)
  screenStore.setWaitExecute(false)
}

// 视频取模处理
const videoHandle = async () => {
  if (screenStore.resizeWidth == 0 || screenStore.resizeHeight == 0) {
    XBox.popMes('请设置要取模的大小！')
    return
  }
  // console.info(screenStore.videoPath)
  if (screenStore.videoPath == '') {
    XBox.popMes('请选择一个视频文件！')
    return
  }
  if (screenStore.videoDur == 0 || screenStore.videoFrame == 0) {
    XBox.popMes('请配置时长与帧数！')
    return
  }
  screenStore.setWaitExecute(true)
  const data = await win.api.getVideoFrameData(
    screenStore.videoPath,
    screenStore.resizeWidth,
    screenStore.resizeHeight,
    screenStore.videoDur,
    screenStore.videoFrame,
    screenStore.thresholdData,
    ...screenStore.configArray
  )
  // console.info(data)
  let result = ''
  data.forEach(o => {
    result += `{${o.join(',')}},`
  })
  // console.info(data[0].length)
  screenStore.setDataLength(data[0].length)
  screenStore.setResultString(result)
  XBox.popMes('生成成功！')
  screenStore.setCountModify(true)
  screenStore.setPreCount(presetCount)
  screenStore.setWaitExecute(false)
}

// 图片大小配置预设
const imgPreSet = () => {
  let preA = JSON.parse(getItem('presetArray'))
  if (preA != null) {
    // while (Object.keys(preA[presetCount]).length != 0 && presetCount <= 2) presetCount++
    // if(presetCount == 2) presetCount = 0
    preA[presetCount] = {
      width: screenStore.resizeWidth,
      height: screenStore.resizeHeight,
    }
    setItem('presetArray', JSON.stringify(preA))
  } else {
    presetArray[presetCount] = {
      width: screenStore.resizeWidth,
      height: screenStore.resizeHeight,
    }
    setItem('presetArray', JSON.stringify(presetArray))
  }
  presetCount >= 2 ? (presetCount = 0) : presetCount++
}

// 提交处理
const commit = async () => {
  // 图片取模
  if (!screenStore.curMode) {
    // 处理图片
    await imgHandle()
    // 记录处理的大小预设
    imgPreSet()
    // 视频取模
  } else {
    await videoHandle()
    // 记录处理的大小预设
    imgPreSet()
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
  color: rgba(51, 51, 51, 0.7);
  cursor: pointer;
  background: var(--commit-box-color);
}
</style>
