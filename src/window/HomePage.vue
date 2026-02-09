<script setup lang="ts">
import WindowTitle from '../components/tools/WindowTitle.vue'
import { onMounted, nextTick, ref, watch } from 'vue'
import ImageEditor from '../components/ImageEditor.vue'
import ImageConfig from '../components/ImageConfig.vue'
import VideoConfig from '../components/VideoConfig.vue'
import ResultDataConfig from '../components/ResultDataConfig.vue'
import CommitBox from '../components/CommitBox.vue'
import ResultData from '../components/ResultData.vue'
import { useScreenStore } from '../stores/store'
import ThresholdConfig from '../components/ThresholdConfig.vue'
// import CropConfig from '../components/CropConfig.vue'
import { XBox } from 'ilx1-x-box'
import { openScreenPage } from '@/utils/tools/windowHandle'
import { storeSetter, storeGetter } from '@/utils/tools/storeTools'
import { useConfigStore } from '@/stores/configStore'
import KonvaImageCrop from '../components/screen/KonvaImageCrop.vue'

const win = window as any

const screenStore = useScreenStore()
const configStore = useConfigStore()

const coverShow = ref<boolean>(false)
const editorShow = ref<boolean>(false)
const thresholdShow = ref<boolean>(false)
const cropShow = ref<boolean>(false)

const screenImg = ref<HTMLElement | null>(null)

onMounted(() => {
  // openScreenPage(0)
  mainWindowListener()
})

/********************************************************************************
 * @brief: 主窗口监听
 * @return {*}
 ********************************************************************************/
const mainWindowListener = () => {
  try {
    // 主页面监听
    win.api.storeChangeListener(async objData => {
      // set 属性处理
      storeSetter(objData, (path: string, value: any) => {
        // 设置对应 store 的值
        if (path == 'configStore.screenData') {
          // console.info(configStore.screenData)
        }
      })

      // get 属性处理逻辑
      storeGetter(objData, path => {
        console.info(path)
      })
    })
  } catch (error) {
    console.error(error)
    configStore.showPop('数据配置错误')
  }
}

watch(
  () => configStore.screenData.baseData,
  (newVal, oldVal) => {
    if (newVal != oldVal) {
      screenImg.value['src'] = newVal
    }
  },
  {
    deep: true,
    immediate: false,
  }
)

const closeEditor = () => {
  if (!screenStore.waitExecute) {
    coverShow.value = false
    editorShow.value = false
    thresholdShow.value = false
    cropShow.value = false
    if (screenStore.isThresholdShow == true) {
      screenStore.setThresholdShow(false)
    }
    if (screenStore.isCropShow == true) {
      screenStore.setCropShow(false)
    }
  }
}

const showEditor = () => {
  // document.documentElement.setAttribute("main-theme", "color")
  coverShow.value = true
  editorShow.value = true
}
const editorCancle = () => {
  closeEditor()
}
const editorCommit = (picData: string) => {
  screenImg.value['src'] = picData
  closeEditor()
}

watch(
  () => screenStore.isCropShow,
  () => {
    if (screenStore.isCropShow == true) {
      cropShow.value = true
      coverShow.value = true
    } else if (screenStore.isThresholdShow == false) {
      cropShow.value = false
      coverShow.value = false
    }
  },
  {
    deep: true,
    immediate: false,
  }
)

watch(
  () => screenStore.isThresholdShow,
  () => {
    if (screenStore.isThresholdShow == true) {
      thresholdShow.value = true
      coverShow.value = true
    } else if (screenStore.isThresholdShow == false) {
      thresholdShow.value = false
      coverShow.value = false
    }
  },
  {
    deep: true,
    immediate: false,
  }
)

watch(
  () => screenStore.isResized,
  () => {
    if (screenStore.isResized == true && screenStore.resizePicData != '') {
      screenImg.value[
        'src'
      ] = `data:image/png;base64,${screenStore.resizePicData}`
    } else if (
      screenStore.isResized == false &&
      screenStore.editorPicData != ''
    ) {
      screenImg.value['src'] = screenStore.editorPicData
    }
  },
  {
    deep: true,
    immediate: false,
  }
)

// 缩放数据
watch(
  () => configStore.screenData.resizeData,
  (newVal, oldVal) => {
    if (newVal != oldVal) {
      screenImg.value['src'] = newVal
      cropShow.value = false
      coverShow.value = false
    }
  },
  {
    deep: true,
    immediate: false,
  }
)

watch(
  () => screenStore.isCroped,
  () => {
    if (screenStore.isCroped) {
      screenStore.setCroped(false)
      screenImg.value['src'] = screenStore.editorPicData
    }
  },
  {
    deep: true,
    immediate: true,
  }
)

watch(
  () => screenStore.waitExecute,
  () => {
    if (screenStore.waitExecute) {
      XBox.popMes('请等待执行...')
      coverShow.value = true
    } else {
      coverShow.value = false
    }
  }
)

const configShow = ref<boolean>(false)
const setConfigShow = state => {
  configShow.value = state
  screenStore.curMode = state
}
</script>

<template>
  <div class="home-page-container">
    <WindowTitle>
      <template #title>
        <div class="win-title">ScreenGo</div>
      </template>
    </WindowTitle>
    <div class="screen-config-content">
      <!-- <CodeTemplateComp /> -->
      <!-- <CropConfig v-if="cropShow" /> -->
      <KonvaImageCrop v-if="cropShow" />
      <thresholdConfig v-if="thresholdShow" />
      <div
        id="cover"
        v-if="coverShow"
        @click="closeEditor"
      ></div>
      <!-- <div id="head-tool-box"></div> -->
      <div
        id="screen-box"
        @click="openScreenPage"
        v-if="!configShow"
      >
        <div>
          <img
            id="screen-box-img"
            ref="screenImg"
            src=""
            alt=""
          />
        </div>
      </div>
      <div id="result-data-box">
        <ResultData />
      </div>
      <div
        id="config-tool-box"
        v-if="!configShow"
      >
        <ImageConfig />
      </div>
      <div
        id="video-config-box"
        v-if="configShow"
      >
        <VideoConfig />
      </div>
      <div id="func-switch">
        <div @click="setConfigShow(false)">图片取模</div>
        <div @click="setConfigShow(true)">视频取模</div>
      </div>
      <div id="commit-box">
        <CommitBox />
      </div>
      <div id="data-setting-box">
        <ResultDataConfig />
      </div>
    </div>
    <!-- <HeadMessage /> -->
  </div>
</template>

<style lang="scss">
#cover {
  width: 99%;
  height: 99%;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(133, 133, 133, 0.2);
  border-radius: 25px;
  z-index: var(--z-index-1);
}

.home-page-container {
  @include global.wh(100%, 100%);
  // @include global.ab_center;
  background: var(--content-box-color);
  border: 0.1px solid rgba(173, 171, 171, 0.4);
  border-radius: 25px;
  overflow: hidden;
  color: var(--text-color-1);
  display: flex;
  flex-direction: column;
  .win-title {
    color: var(--text-color-1);
  }
  .screen-config-content {
    @include global.full-wh;
    overflow: hidden;
    @include global.grid-config(repeat(2, 1fr), repeat(11, 1fr), 10px);
    padding: 12px 15px;
    position: relative;
    > div {
      border-radius: 16px;
      border: 0.2px solid rgba(51, 51, 51, 0.1);
      box-sizing: border-box;
      flex-grow: 0 !important;
      overflow: hidden;
    }
  }
}

#image-editor-box {
  width: 87%;
  height: 87%;
  background: rgb(255, 255, 255);
  box-shadow: 1.1px 0px 10.8px -34px rgba(0, 0, 0, 0.059),
    7px 0px 81px -34px rgba(0, 0, 0, 0.12);
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: var(--z-index-2);

  border-radius: 25px;
  border: 0.2px solid rgba(51, 51, 51, 0.1);
  // box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.4);
  padding: 1.2em;
  overflow: scroll;
}

#screen-box {
  grid-area: 1 / 1 / 5 / 2;
  box-shadow: 1.1px 0px 10.8px -34px rgba(0, 0, 0, 0.059),
    7px 0px 81px -34px rgba(0, 0, 0, 0.12);
  background: var(--editor-box-color);
  border: none;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  padding: 1.2em;
  > div {
    // width: 88%;
    // height: 88%;
    width: 100%;
    height: 100%;
    background: white;
    overflow: hidden;
    border-radius: 16px;
    box-shadow: 1.1px 0px 10.8px -34px rgba(0, 0, 0, 0.059),
      7px 0px 81px -34px rgba(0, 0, 0, 0.12);
    display: flex;
    justify-content: center;
    align-items: center;
  }

  img {
    max-width: 100%;
    max-height: 100%;
  }

  img[src=''] {
    opacity: 0;
  }
}

#result-data-box {
  grid-area: 1 / 2 / 8 / 3;
  box-shadow: 1.1px 0px 10.8px -34px rgba(0, 0, 0, 0.059),
    7px 0px 81px -34px rgba(0, 0, 0, 0.12);
  background: var(--result-data-box-color);
  border: none;
  padding: 1.5em;
}

#config-tool-box {
  grid-area: 5 / 1 / 10 / 2;
}
#video-config-box {
  grid-area: 1 / 1 / 10 / 2;
}

#func-switch {
  grid-area: 10 / 1 / 11 / 2;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 5px;
  div {
    width: 48.5%;
    height: 100%;
    background: rgb(232, 237, 237);
    border-radius: 12px;
    display: flex;
    justify-content: center;
    align-items: center;
    border: none;
    cursor: pointer;
  }
}

#commit-box {
  grid-area: 11 / 1 / 12 / 2;
  border: none;
  color: rgb(255, 255, 255) !important;
}

#data-setting-box {
  grid-area: 8 / 2 / 12 / 2;
}
</style>
