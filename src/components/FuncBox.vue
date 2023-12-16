<script setup lang="ts">
import { useScreenStore } from '../stores/store'
import { getItem, setItem } from '../utils/storage'
import { onMounted, reactive, ref } from 'vue'

// const { ipcRenderer } = require('electron')
const win = window as any
const screenStore = useScreenStore()
const modeStyle = ref<boolean>(true)

// 单色取模
const monochromeMode = () => {
  modeStyle.value = true
  screenStore.setConfigArray(4, 1)
}

// 彩色取模
const chromeMode = () => {
  modeStyle.value = false
  screenStore.setConfigArray(4, 0)
}

// 单色阈值调整
const thresholdShow = () => {
  if(screenStore.configArray[4] == 0) {
    screenStore.showText('彩色取模不支持调整阈值！')
    return
  }
  if(screenStore.editorPicData == '') {
    screenStore.showText('请先编辑一张图片')
    return 
  }
  screenStore.setThresholdShow(true)
}
</script>

<template>
  <div id="func-box-content">
    <div id="mode-func">
      <div :class="{ 'style-mode': modeStyle }" @click="monochromeMode">单色取模</div>
      <div :class="{ 'style-mode': !modeStyle }" @click="chromeMode">彩色取模</div>
    </div>
    <div id="func-division"></div>
    <div id="image-control">
      <div @click="thresholdShow">单色阈值<br />调整</div>
      <div>图片裁剪</div>
    </div>
  </div>
</template>

<style lang="scss">
.style-mode {
  background-color: var(--editor-box-color) !important;
  // color: white;
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.8);
}

#func-box-content {
  width: 100%;
  height: 100%;
  display: flex;
  flex-flow: column nowrap;
  justify-content: space-around;
  align-items: center;
  border: none;
  font-size: 16px;
  color: rgba(51, 51, 51, 0.7);
  cursor: pointer;
  position: relative;
  // background: var(--commit-box-color);
  #mode-func {
    width: 94%;
    height: 40%;
    // box-shadow: 2.6px 0.5px 10px rgba(0, 0, 0, 0.023), 21px 4px 80px rgba(0, 0, 0, 0.07);
    display: grid;
    grid-template-rows: repeat(1fr, 2);
    grid-template-columns: 1fr;
    justify-content: center;
    row-gap: 5px;
    padding: 2px;
    // background: rgba(255, 255, 255, 0.8);

    div {
      font-size: 12px;
      display: flex;
      justify-content: center;
      align-items: center;
      background: var(--pop-box-color);
      border: none;
      // box-shadow: 0 0 0 0.2px rgba(51, 51, 51, 0.7);
      border-radius: 8px;
      transition: all 0.6s ease-in-out;
    }
  }
  #func-division {
    width: 100%;
    height: 3px;
    background: rgba(255, 255, 255, 1);
  }
  #image-control {
    width: 92%;
    height: 50%;
    // box-shadow: 2.6px 0.5px 10px rgba(0, 0, 0, 0.023), 21px 4px 80px rgba(0, 0, 0, 0.07);
    display: grid;
    grid-template-rows: repeat(1fr, 2);
    grid-template-columns: 1fr;
    justify-content: center;
    row-gap: 5px;
    padding: 2px;
    background: rgba(255, 255, 255, 0.8);
    div {
      display: flex;
      justify-content: center;
      align-items: center;
      background: var(--pop-box-color);
      border: none;
      // box-shadow: 0 0 0 0.2px rgba(51, 51, 51, 0.7);
    }
    div:nth-child(1) {
      font-size: 12px;
      text-align: center;
    }
    div:nth-child(2) {
      font-size: 11px;
      text-align: center;
    }
  }
}

</style>
