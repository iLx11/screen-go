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
let imageDataString
onMounted(() => {
  thresholdValue.value = screenStore.thresholdData
  ctx = imageCanvas.value.getContext('2d')
  img = new Image()
  img.src = screenStore.editorPicData
  // 完整图片中心绘制 canvas 算法
  let rate = img.width / img.height
  if (img.width > imageCanvas.value.width) {
    img.width = imageCanvas.value.width
    img.height = img.width / rate
    if (img.height > imageCanvas.value.height) {
      img.height = imageCanvas.value.height
      img.width = img.height * rate
    }
  }
  // 绘制到中心
  offsetX = (imageCanvas.value.width - img.width) / 2
  offsetY = (imageCanvas.value.height - img.height) / 2
  ctx.drawImage(img, offsetX, offsetY, img.width, img.height)
  originImageData = ctx.getImageData(offsetX, offsetY, img.width, img.height)
  // console.log(originImageData)
  previewSetting()
})

// 阈值预览
const previewSetting = () => {
  let imageData = Object.assign([], originImageData.data)
  imageDataString = JSON.stringify(imageData)
  for (let i = 0; i < imageData.length; i += 4) {
    let avg = 0.299 * imageData[i] + 0.587 * imageData[i + 1] + 0.114 * imageData[i + 2]
    if (avg > screenStore.thresholdData) {
      avg = 254
    } else {
      avg = 0
    }
    imageData[i] = imageData[i + 1] = imageData[i + 2] = avg
  }
  imageCanvas.value.width = imageCanvas.value.width
  imageCanvas.value.height = imageCanvas.value.height
  originImageData.data.set(imageData)
  ctx.putImageData(originImageData, offsetX, offsetY, 0, 0, img.width, img.height)
}

// 确认并退出
const confirmThreshold = () => {
  screenStore.setThresholdShow(false)
  screenStore.setThreshold(thresholdValue.value)
}

// 节流
let timer = null
const delayTime = (callback: Function, delay: number) => {
  if (!timer) {
    timer = setTimeout(() => {
      callback()
      timer = null
      clearTimeout(timer)            
    }, delay)
  }
}
watch(
  () => thresholdValue.value,
  () => {
    delayTime(() => {
      if (thresholdValue.value > 255) thresholdValue.value = 255
      else if (thresholdValue.value < 0) thresholdValue.value = 0
      screenStore.setThreshold(thresholdValue.value)
      // console.log(imageDataString)
      let tempImageData = Object.assign([], JSON.parse(imageDataString))
      // console.log(tempImageData)
      for (let i = 0; i < tempImageData.length; i += 4) {
        if (tempImageData[i] > thresholdValue.value) tempImageData[i] = tempImageData[i + 1] = tempImageData[i + 2] = 255
        else tempImageData[i] = tempImageData[i + 1] = tempImageData[i + 2] = 0
      }
      if (imageCanvas.value.width && imageCanvas.value.width) {
        imageCanvas.value.width = imageCanvas.value.width
        imageCanvas.value.height = imageCanvas.value.height
        originImageData.data.set(tempImageData)
        ctx.putImageData(originImageData, offsetX, offsetY, 0, 0, img.width, img.height)
      }
    }, 320)
  },
  {
    immediate: false
  }
)
</script>

<template>
  <div id="threshold-config-box">
    <canvas ref="imageCanvas"></canvas>
    <div id="threshold-tools">
      <div id="move-box">{{ thresholdValue }}</div>
      <!-- <input type="text" v-model="thresholdValue" /> -->
      <input type="range" class="win10-thumb" min="0" max="255" v-model="thresholdValue" step="2" />
      <div id="confirm-button" @click="confirmThreshold">确认并退出</div>
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
  border-radius: 25px;
  border: 0.2px solid rgba(51, 51, 51, 0.1);
  // box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.4);
  padding: 2.5em;
  overflow: scroll;
  z-index: 999;
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
    position: relative;
    #move-box {
      width: 90px;
      height: 30px;
      position: absolute;
      top: -30%;
      left: 50%;
      transform: translate(-50%, -50%);
      border-radius: 20px;
      border: 0.1px solid rgba(173, 171, 171, 0.4);
      box-shadow: 1.1px 0px 10.8px -34px rgba(0, 0, 0, 0.059), 7px 0px 81px -34px rgba(0, 0, 0, 0.12);
      background: rgba(255, 255, 255, 1);
      display: flex;
      justify-content: center;
      align-items: center;
    }
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

/* === range theme and appearance === */
input[type='range'] {
  font-size: 1.5rem;
  width: 12.5em;
}

input[type='range'] {
  color: #ef233c;
  --thumb-height: 1.125em;
  --track-height: 0.125em;
  --track-color: rgba(0, 0, 0, 0.2);
  --brightness-hover: 180%;
  --brightness-down: 80%;
  --clip-edges: 0.125em;
}

input[type='range'].win10-thumb {
  color: #2b2d42;

  --thumb-height: 1.375em;
  --thumb-width: 0.5em;
  --clip-edges: 0.0125em;
}

/* === range commons === */
input[type='range'] {
  position: relative;
  background: #fff0;
  overflow: hidden;
}

input[type='range']:active {
  cursor: grabbing;
}

input[type='range']:disabled {
  filter: grayscale(1);
  opacity: 0.3;
  cursor: not-allowed;
}

/* === WebKit specific styles === */
input[type='range'],
input[type='range']::-webkit-slider-runnable-track,
input[type='range']::-webkit-slider-thumb {
  -webkit-appearance: none;
  transition: all ease 100ms;
  height: var(--thumb-height);
}

input[type='range']::-webkit-slider-runnable-track,
input[type='range']::-webkit-slider-thumb {
  position: relative;
}

input[type='range']::-webkit-slider-thumb {
  --thumb-radius: calc((var(--thumb-height) * 0.5) - 1px);
  --clip-top: calc((var(--thumb-height) - var(--track-height)) * 0.5 - 0.5px);
  --clip-bottom: calc(var(--thumb-height) - var(--clip-top));
  --clip-further: calc(100% + 1px);
  --box-fill: calc(-100vmax - var(--thumb-width, var(--thumb-height))) 0 0 100vmax currentColor;

  width: var(--thumb-width, var(--thumb-height));
  background: linear-gradient(currentColor 0 0) scroll no-repeat left center / 50% calc(var(--track-height) + 1px);
  background-color: currentColor;
  box-shadow: var(--box-fill);
  border-radius: var(--thumb-width, var(--thumb-height));

  filter: brightness(100%);
  clip-path: polygon(100% -1px, var(--clip-edges) -1px, 0 var(--clip-top), -100vmax var(--clip-top), -100vmax var(--clip-bottom), 0 var(--clip-bottom), var(--clip-edges) 100%, var(--clip-further) var(--clip-further));
}

input[type='range']:hover::-webkit-slider-thumb {
  filter: brightness(var(--brightness-hover));
  cursor: grab;
}

input[type='range']:active::-webkit-slider-thumb {
  filter: brightness(var(--brightness-down));
  cursor: grabbing;
}

input[type='range']::-webkit-slider-runnable-track {
  background: linear-gradient(var(--track-color) 0 0) scroll no-repeat center / 100% calc(var(--track-height) + 1px);
}

input[type='range']:disabled::-webkit-slider-thumb {
  cursor: not-allowed;
}
</style>
