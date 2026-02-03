<script setup lang="ts">
import { onMounted, ref, onUnmounted } from 'vue'
import { useConfigStore } from '@/stores/configStore'
// import SvgIcon from './SvgIcon.vue'

const configStore = useConfigStore()
const win = window as any
const curOnTop = ref<boolean>(false)
const curMaxState = ref<boolean>(false)
let restoreSize = {}
// 置顶图标角度
const rotate = ref<string>('rotate(0)')

/********************************************************************************
 * @brief: 关闭窗口
 * @return {*}
 ********************************************************************************/
const closeWindow = () => {
  win.api.closeWindow()
  // ipcRenderer.send('window-close')
}
/********************************************************************************
 * @brief: 最大化或者恢复窗口
 * @return {*}
 ********************************************************************************/
const maximizeWindow = () => {
  if (!curMaxState.value) {
    restoreSize = {
      width: win.innerWidth,
      height: win.innerHeight,
    }
    win.api.maximizeWindow(curMaxState.value)
  } else {
    // 恢复窗口
    win.api.maximizeWindow(curMaxState.value, restoreSize)
  }
  curMaxState.value = !curMaxState.value
  // ipcRenderer.send('window-max')
}
/********************************************************************************
 * @brief: 最小化窗口
 * @return {*}
 ********************************************************************************/
const minimizeWindow = () => {
  win.api.minimizeWindow()
  // ipcRenderer.send('window-min')
}
/********************************************************************************
 * @brief: 设置窗口置顶
 * @return {*}
 ********************************************************************************/
const setWindowOnTop = () => {
  curOnTop.value = !curOnTop.value
  if (curOnTop.value) {
    configStore.showPop('窗口已置顶')
    rotate.value = 'rotate(-45deg)'
  } else {
    configStore.showPop('窗口已取消置顶')
    rotate.value = 'rotate(0)'
  }
  win.api.setWindowOnTop(curOnTop.value)
}

// 窗口工具图标配置
const iconConfig = ref({
  size: 14,
  color: 'rgba(40, 44, 52, 0.3)',
  iconClassArr: ['tool-min', 'tool-max', 'tool-close', 'tool-top'],
})

</script>
<template>
  <div class="top-bar">
    <div class="top-bar-tools">
      <!-- 置顶工具 -->
      <div
        @click="setWindowOnTop"
        class="window-tools on-top-box"
        :style="{
          transform: rotate,
        }"
      >
        <SvgIcon
          :icon-class="iconConfig.iconClassArr[3]"
          :size="iconConfig.size"
          :color="iconConfig.color"
        />
      </div>
      <!-- 最小化工具 -->
      <div @click="minimizeWindow">
        <div class="window-tools tool1">
          <SvgIcon
            :icon-class="iconConfig.iconClassArr[0]"
            :size="iconConfig.size"
            :color="iconConfig.color"
          />
        </div>
      </div>
      <!-- 最大化/恢复工具 -->
      <div @click="maximizeWindow">
        <div class="window-tools tool2">
          <SvgIcon
            :icon-class="iconConfig.iconClassArr[1]"
            :size="iconConfig.size"
            :color="iconConfig.color"
          />
        </div>
      </div>
      <!-- 关闭工具 -->
      <div @click="closeWindow">
        <div class="window-tools tool4">
          <SvgIcon
            :icon-class="iconConfig.iconClassArr[2]"
            :size="iconConfig.size"
            :color="iconConfig.color"
          />
        </div>
      </div>
    </div>
  </div>
</template>
<style scoped lang="scss">
.on-top-box {
  overflow: hidden;
  background: rgba(117, 115, 115, 0.2);
}
.top-bar {
  height: 27px;
  line-height: 25px;
  width: 125px;
  // position: absolute;
  // top: 20px;
  // right: 20px;
  z-index: var(--z-index-5);
  -webkit-app-region: no-drag;
}
.top-bar-tools {
  @include global.full_wh;
  @include global.flex_config(0, space-around);
  z-index: var(--z-index-5);
  -webkit-app-region: no-drag;
  overflow: hidden;
  .window-tools {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    cursor: pointer;
    @include global.flex_center;
    &:hover {
      filter: saturate(2);
    }
  }
  > div {
    text-align: center;
    color: #999;
    cursor: pointer;
    line-height: 25px;

    .tool1 {
      background: rgb(169, 248, 182);
    }
    .tool2,
    .tool3 {
      background: rgb(245, 229, 190);
    }
    .tool4 {
      background: rgb(250, 206, 203);
    }
  }
}
</style>
