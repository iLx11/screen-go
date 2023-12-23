<script setup lang="ts">
import { useScreenStore } from '../stores/store'
import { getItem, setItem } from '../utils/storage'
import { onMounted, reactive } from 'vue'
// const { ipcRenderer } = require('electron')
const win = window as any
const screenStore = useScreenStore()
const presetArray: object[] = reactive([{}, {}, {}])
let presetCount: number = 0

const commit = async () => {
  if (screenStore.editorPicData != '') {
    if (screenStore.resizeWidth != 0 && screenStore.resizeHeight != 0) {
      screenStore.setWaitExecute(true)
      // 缩放图片
      const data = await win.myApi.resizeImage(screenStore.resizeWidth, screenStore.resizeHeight, screenStore.editorPicData, screenStore.configArray[4])
      // console.log('pic-data-editor', data)
      screenStore.setResizePicData(data)
      screenStore.setResized(true)
      // ----------------------------- 图片取模 ------------------------------------
      // 获取图片取模模式
      const arrData = await win.myApi.generateResultArray(data, screenStore.thresholdData, screenStore.configArray[0], screenStore.configArray[1], screenStore.configArray[2], screenStore.configArray[3], screenStore.configArray[4])
       
      screenStore.setDataLength(arrData.length)
      screenStore.setResultString(arrData.join(','))
      screenStore.showText('生成成功！')
      screenStore.setCountModify(true)
      screenStore.setPreCount(presetCount)
      screenStore.setWaitExecute(false)
      let preA = JSON.parse(getItem('presetArray'))
      if (preA != null) {
        // while (Object.keys(preA[presetCount]).length != 0 && presetCount <= 2) presetCount++
        // if(presetCount == 2) presetCount = 0
        preA[presetCount] = {
          width: screenStore.resizeWidth,
          height: screenStore.resizeHeight
        }
        setItem('presetArray', JSON.stringify(preA))
      } else {
        presetArray[presetCount] = {
          width: screenStore.resizeWidth,
          height: screenStore.resizeHeight
        }
        setItem('presetArray', JSON.stringify(presetArray))
      }
      presetCount >= 2 ? (presetCount = 0) : presetCount++
    } else {
      screenStore.showText('请设置图片的大小！')
    }
  } else {
    screenStore.showText('请先编辑一个图片！')
  }
}
</script>

<template>
  <div id="commit-box-content" @click="commit">提交生成</div>
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
  background: var(--commit-box-color)
}
</style>
