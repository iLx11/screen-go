<script setup lang="ts">
import { useScreenStore } from '../stores/store'
import { getItem, setItem } from '../utils/storage'
import { onMounted, reactive, ref, watch } from 'vue'
// const { ipcRenderer } = require('electron')
const win = window as any
const screenStore = useScreenStore()
const presetArray: object[] = reactive([{}, {}, {}])
const imageCanvas = ref(null)
const thresholdValue = ref<number>(120)
let ctx
let img
let offsetX
let offsetY
let originImageData
let imageData
onMounted(() => {
  ctx = imageCanvas.value.getContext('2d')
  img = new Image()
  img.src = screenStore.editorPicData
  // 完整图片中心绘制 canvas 算法
  let rate = img.width / img.height
  if(img.width > imageCanvas.value.width) {
    img.width = imageCanvas.value.width
    img.height = img.width / rate
    if(img.height > imageCanvas.value.height){
      img.height = imageCanvas.value.height
      img.width = img.height * rate
    }
  }
  // 绘制到中心
  offsetX = (imageCanvas.value.width - img.width) / 2
  offsetY = (imageCanvas.value.height - img.height) / 2
  ctx.drawImage(img, offsetX, offsetY, img.width, img.height)
  previewSetting()
})

const previewSetting = () => {
  originImageData = ctx.getImageData(offsetX, offsetY, img.width, img.height)
  imageData = originImageData
  console.log(originImageData)
  for(let i = 0; i < imageData.data.length; i += 4) {
    let avg = 0.299 * imageData.data[i] + 0.587 * imageData.data[i+1] + 0.114 * imageData.data[i+2]
    if(avg > screenStore.thresholdData)  {
      avg = 255
    } else {
      avg = 0
    }
    imageData.data[i] = imageData.data[i + 1] = imageData.data[i + 2] = avg
  }
  imageCanvas.value.width = imageCanvas.value.width
  imageCanvas.value.height = imageCanvas.value.height
  ctx.putImageData(imageData, offsetX, offsetY, 0, 0, img.width, img.height)
}

watch(() => thresholdValue.value, () => {
  screenStore.setThreshold(thresholdValue.value)
  imageData = originImageData
  console.log(originImageData)
  for(let i = 0; i < imageData.data.length; i += 4) {
    if(imageData.data[i] > thresholdValue.value) 
      imageData.data[i] = imageData.data[i + 1] = imageData.data[i + 2] = 255
    else 
      imageData.data[i] = imageData.data[i + 1] = imageData.data[i + 2] = 0
  }
  imageCanvas.value.width = imageCanvas.value.width
  imageCanvas.value.height = imageCanvas.value.height
  // ctx.putImageData(imageData, offsetX, offsetY, 0, 0, img.width, img.height)
}, {
  immediate: false
})

</script>

<template>
  <div id="threshold-config-box">
    <canvas ref="imageCanvas"></canvas>
    <div id="threshold-tools">
      <input type="text" v-model="thresholdValue">
      <div id="confirm-button" @click="test">确认并退出</div>
    </div>
  </div>
</template>

<style lang="scss">
#threshold-config-box {
  width: 87%;
  height: 87%;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  box-shadow: 1.1px 0px 10.8px -34px rgba(0, 0, 0, 0.059), 7px 0px 81px -34px rgba(0, 0, 0, 0.12);
  background: rgba(255, 255, 255, 1);
  border-radius: 14px;
  border: 0.2px solid rgba(51, 51, 51, 0.1);
  // box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.4);
  padding: 2.5em;
  overflow: scroll;
  z-index: 99999;
  display: flex;
  flex-flow: column nowrap;
  justify-content: space-between;
  align-items: center;
  canvas {
    width: 100%;
    height: 80%;
    border-radius: 12px;
    box-shadow: 0 0 0 2px rgba(51, 51, 51, 0.1);
  }
  #threshold-tools {
    width: 100%;
    display: grid;
    grid-template-rows: repeat(2, 1fr);
    grid-template-columns: 1fr;
    justify-content: center;
    align-items: center;
    justify-items: center;
    text-align: center;
    input {
      width: 30%;
      font-size: 30px;
      border: none;
      text-align: center;
      color: rgba(51, 51, 51, 0.8);
    }
    #confirm-button {
      width: 20%;
      height: 80%;
      border-radius: 12px;
      background: rgba(51, 51, 51, 0.1);
      box-shadow: 0 0 0 1.5px rgba(51, 51, 51, 0.1);
      cursor: pointer;
      display: flex;
      justify-content: center;
      align-items: center;
    }
  }
}
</style>
