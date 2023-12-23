<script setup lang="ts">
import WindowTools from '../components/WindowTools.vue'
import { onMounted, nextTick, ref, watch } from 'vue'
import ImageEditor from '../components/ImageEditor.vue'
import ImageConfig from '../components/ImageConfig.vue'
import ResultDataConfig from '../components/ResultDataConfig.vue'
import CommitBox from '../components/CommitBox.vue'
import ResultData from '../components/ResultData.vue'
import HeadMessage from '../components/HeadMessage.vue'
import { useScreenStore } from '../stores/store'
import HeadMessageVue from '../components/HeadMessage.vue'
import PopBox from '../components/PopBox.vue'
import ThresholdConfig from '../components/ThresholdConfig.vue'
import CropConfig from '../components/CropConfig.vue'

const screenStore = useScreenStore()

const coverShow = ref<boolean>(false)
const editorShow = ref<boolean>(false)
const thresholdShow = ref<boolean>(false)
const cropShow = ref<boolean>(false)

const screenImg = ref<HTMLElement | null>(null)
const popBoxRef = ref<HTMLElement | null>(null)

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
    immediate: false
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
    immediate: false
  }
)
watch(
  () => screenStore.isTextShow,
  () => {
    if (screenStore.isTextShow == true) {
      screenStore.setTextShow(false)
      popBoxRef.value['showPop'](screenStore.popText)
    }
  },
  {
    deep: true,
    immediate: false
  }
)
watch(
  () => screenStore.isResized,
  () => {
    if (screenStore.isResized == true && screenStore.resizePicData != '') {
      screenImg.value['src'] = `data:image/png;base64,${screenStore.resizePicData}`
    } else if (screenStore.isResized == false && screenStore.editorPicData != '') {
      screenImg.value['src'] = screenStore.editorPicData
    }
  },
  {
    deep: true,
    immediate: false
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
    immediate: true
  }
)

watch(
  () => screenStore.waitExecute,
  () => {
    if (screenStore.waitExecute) {
      screenStore.showText('请等待执行...')
      coverShow.value = true
    } else {
      coverShow.value = false
    }
  }
)
</script>

<template>
  <CropConfig v-if="cropShow" />
  <thresholdConfig v-if="thresholdShow" />
  <PopBox ref="popBoxRef" />
  <div id="cover" v-if="coverShow" @click="closeEditor"></div>
  <div id="image-editor-box" v-if="editorShow">
    <ImageEditor @editorCancle="editorCancle" @editorCommit="editorCommit" />
  </div>
  <div class="container">
    <div id="head-tool-box"></div>
    <div id="screen-box" @click="showEditor">
      <div>
        <img id="screen-box-img" ref="screenImg" src="" alt="" />
      </div>
    </div>
    <div id="result-data-box">
      <ResultData />
    </div>
    <div id="config-tool-box">
      <ImageConfig />
    </div>
    <div id="commit-box">
      <CommitBox />
    </div>
    <div id="data-setting-box">
      <ResultDataConfig />
    </div>
  </div>
  <WindowTools />
  <HeadMessage />
</template>

<style lang="scss">
#cover {
  width: 99%;
  height: 99%;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(51, 51, 51, 0.2);
  border-radius: 15px;
  z-index: 99998;
}

#image-editor-box {
  width: 87%;
  height: 87%;
  background: rgb(255, 255, 255);
  box-shadow: 1.1px 0px 10.8px -34px rgba(0, 0, 0, 0.059), 7px 0px 81px -34px rgba(0, 0, 0, 0.12);
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 99999;
  border-radius: 12px;
  border: 0.2px solid rgba(51, 51, 51, 0.1);
  // box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.4);
  padding: 0.7em;
  overflow: scroll;
}

.container {
  width: 99%;
  height: 99%;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  border: 0.1px solid rgba(173, 171, 171, 0.4);
  border-radius: 16px;
  overflow: hidden;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  grid-template-rows: repeat(9, 1fr);
  column-gap: 10px;
  row-gap: 10px;
  box-sizing: border-box;
  padding: 15px;
  z-index: 99;
  // box-shadow: 1.1px 0px 10.8px -34px rgba(0, 0, 0, 0.059), 7px 0px 81px -34px rgba(0, 0, 0, 0.12);
  background: var(--content-box-color);
  color: var(--text-color-1);
  padding-bottom: 12px;

  div {
    border-radius: 12px;
    border: 0.2px solid rgba(51, 51, 51, 0.1);
    z-index: 999;
    box-sizing: border-box;
  }
}

#head-tool-box {
  grid-area: 1 / 1 / 2 / 3;
  background: rgba(51, 51, 51, 0.05);
  // position: relative;
  -webkit-app-region: drag;
  padding: 0.6em;
  font-family: 'ceyy';
  display: flex;
  flex-flow: column nowrap;
  justify-content: space-around;
  align-items: flex-start;
}

#window-tool {
  width: 90px;
  height: 12px;
  border-radius: 6px;
  background: rgba(226, 230, 236, 1);
  position: absolute;
  top: 3px;
  right: 0px;
  padding: 0.3em;
}

#screen-box {
  grid-area: 2 / 1 / 5 / 2;
  box-shadow: 1.1px 0px 10.8px -34px rgba(0, 0, 0, 0.059), 7px 0px 81px -34px rgba(0, 0, 0, 0.12);
  background: var(--editor-box-color);
  border: none;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;

  > div {
    width: 80%;
    height: 80%;
    background: white;
    overflow: hidden;
    border-radius: 11px;
    box-shadow: 1.1px 0px 10.8px -34px rgba(0, 0, 0, 0.059), 7px 0px 81px -34px rgba(0, 0, 0, 0.12);
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
  grid-area: 2 / 2 / 7 / 3;
  box-shadow: 1.1px 0px 10.8px -34px rgba(0, 0, 0, 0.059), 7px 0px 81px -34px rgba(0, 0, 0, 0.12);
  background: var(--result-data-box-color);
  border: none;
  padding: 1.5em;
}

#config-tool-box {
  grid-area: 5 / 1 / 9 / 2;
}

#commit-box {
  grid-area: 9 / 1 / 10 / 2;
  border: none;
}

#data-setting-box {
  grid-area: 7 / 2 / 10 / 2;
}
</style>
