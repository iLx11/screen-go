<script setup lang="ts">
import { useScreenStore } from '../store/store'
import ImageToHexArray from '../utils/ImageToHexArray'
import { imgEditorHandle } from '../utils/imgTools'
import { getItem, setItem } from '../../db/electron-store'
import { reactive } from 'vue'

const screenStore = useScreenStore()
const presetArray: object[] = reactive([{}, {}, {}])
let presetCount: number = 0

const commit = () => {
  if (screenStore.editorPicData != '') {
    if (screenStore.resizeWidth != 0 && screenStore.resizeHeight != 0) {
      imgEditorHandle(screenStore.resizeWidth, screenStore.resizeHeight, screenStore.editorPicData, async (base64) => {
        screenStore.setResizePicData(base64)
        screenStore.setResized(true)
        // 图片取模
        const data = await ImageToHexArray.generate(base64, screenStore.configArray)
        screenStore.setResultString(data.join(','))
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
      })
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
