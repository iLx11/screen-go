<script setup lang="ts">
import { onMounted, ref, onUnmounted } from 'vue'
// import os from 'os'
const win = window as any
defineProps<{ title?: string }>()

// let isMac = ref<boolean>(os.platform() == 'darwin')


let closeWindow = () => {
  win.myApi.closeWindow()
}
let maximizeMainWin = () => {
  win.myApi.maximizeWindow()
}
let minimizeMainWindow = () => {
  win.myApi.minimizeWindow()
}

</script>
<template>
  <div class="topBar">
    <div class="winTool">
      <div @click="minimizeMainWindow">
        <div class="window-tools tool1"></div>
      </div>
      <div @click="maximizeMainWin">
        <div class="window-tools tool3"></div>
      </div>
      <div @click="closeWindow">
        <div class="window-tools tool4"></div>
      </div>
    </div>
  </div>
</template>
<style scoped lang="scss">
.topBar {
  height: 25px;
  line-height: 25px;
  width:10%;
  position: absolute;
  top: 30px;
  right: 30px;
  z-index: 9999;
  -webkit-app-region: drag;
}
.winTool {
  height: 100%;
  width: 100%;
  display: flex;
  -webkit-app-region: no-drag;
  justify-content: space-around;
  align-items: center;
  z-index: 9999;

}
.winTool >div {
  text-align: center;
  color: #999;
  cursor: pointer;
  line-height: 25px;
  .window-tools {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    cursor: pointer;
  }
  .tool1 {
    background: rgb(169, 248, 182);

  }
  .tool2, .tool3 {
    background: rgb(245, 229, 190);

  }
  .tool4 {
    background: rgb(250, 206, 203);
  }
}
</style>
