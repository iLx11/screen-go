<script setup lang="ts">
import { useScreenStore } from '../stores/store'
import { getItem, setItem } from '../utils/storage'
import { onMounted, reactive } from 'vue'
const { ipcRenderer } = require('electron')

const screenStore = useScreenStore()
const presetArray: object[] = reactive([{}, {}, {}])
let presetCount: number = 0

// onMounted(() => {
//   ipcRenderer.on('pic-data-done', (event: any, data: any) => {
//     console.log(event)
//     console.log(data)
//   })
// })
const commit = async () => {
  if (screenStore.editorPicData != '') {
    if (screenStore.resizeWidth != 0 && screenStore.resizeHeight != 0) {
      const data = await ipcRenderer.invoke('pic-data-editor', screenStore.resizeWidth, screenStore.resizeHeight, screenStore.editorPicData)
      console.log('pic-data-editor', data)
      screenStore.setResizePicData(data)
        screenStore.setResized(true)
        // 图片取模
        // const hexArrData = await ImageToHexArray.generate(data, screenStore.configArray)
        const arrData = await ipcRenderer.invoke('pic-data-parse', data, screenStore.configArray[0],  screenStore.configArray[1], screenStore.configArray[2], screenStore.configArray[3])
        screenStore.setResultString(arrData.join(','))
        screenStore.showText('生成成功！')
        screenStore.setCountModify(true)
        screenStore.setPreCount(presetCount)
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
  background: rgba(245, 178, 153, 0.4);
}
</style>
