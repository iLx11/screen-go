<script setup lang="ts">
import { reactive, ref, watch, onMounted } from 'vue'
import { useScreenStore } from '../stores/store'
import { getItem, setItem } from '../utils/storage'
import FuncBox from '../components/FuncBox.vue'
import { XBox } from 'ilx1-x-box'

const screenStore = useScreenStore()
const win = window as any

onMounted(() => {
  XBox.popMes('视频取模模式、宽高与图片取模相同')
  videoConfigValue.width = String(screenStore.resizeWidth)
  videoConfigValue.height = String(screenStore.resizeHeight)
  videoConfigValue.videoDur = String(screenStore.videoDur)
  videoConfigValue.videoFrame = String(screenStore.videoFrame)
})

const videoFilePath = ref<string>('')
const videoRef = ref<HTMLElement>(null)
const selectVideoFile = async () => {
  const videoPath = await win.api.selectVideoFile()
  if (videoPath && videoPath.filePaths.length != 0) {
    videoFilePath.value = videoPath.filePaths[0]
    videoRef.value.src = videoPath.filePaths[0]
    // 存储路径
    screenStore.setVideoPath(videoFilePath.value)
  } else {
    XBox.popMes('没有选择文件')
  }
}

const videoConfigValue = reactive({
  width: '',
  height: '',
  videoDur: '',
  videoFrame: '',
})

watch(
  [() => videoConfigValue.width, () => videoConfigValue.height],
  () => {
    screenStore.setResizeWidth(parseInt(videoConfigValue.width))
    screenStore.setResizeHeight(parseInt(videoConfigValue.height))
    // console.info(screenStore.resizeWidth)
  },
  {
    immediate: false,
  }
)
watch(
  [() => videoConfigValue.videoDur, () => videoConfigValue.videoFrame],
  () => {
    screenStore.setVideoDur(parseInt(videoConfigValue.videoDur))
    screenStore.setVideoFrame(parseInt(videoConfigValue.videoFrame))
  },
  {
    immediate: false,
  }
)
</script>

<template>
  <div id="config-content">
    <div id="video-box">
      <video
        ref="videoRef"
        src=""
        controls="true"
        muted
        @click="selectVideoFile"
      ></video>
    </div>
    <div id="video-config-box">
      <div class="input-group">
        <input
          type="number"
          class="input"
          v-model.number="videoConfigValue.width"
        />
        <label class="user-label">宽度:</label>
      </div>
      <div class="input-group">
        <input
          type="number"
          class="input"
          v-model.number="videoConfigValue.height"
        />
        <label class="user-label">高度:</label>
      </div>
      <div class="input-group">
        <input
          type="number"
          class="input"
          v-model.number="videoConfigValue.videoDur"
        />
        <label class="user-label">设置时长(s):</label>
      </div>
      <div class="input-group">
        <input
          type="number"
          class="input"
          v-model.number="videoConfigValue.videoFrame"
        />
        <label class="user-label">每秒帧数:</label>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
#config-content {
  width: 100%;
  height: 100%;
  display: flex;
  flex-flow: column nowrap;
  justify-content: space-between;
  align-items: center;
  padding: 0.7em;
  border: none;
  overflow: hidden;

  #video-box {
    width: 100%;
    height: 220px;
    background: rgb(183, 186, 189);
    display: flex;
    justify-content: center;
    align-items: center;
    margin-bottom: 16px;
    cursor: pointer;

    video {
      height: 100%;
      cursor: pointer;
    }
    video[src=''] {
      opacity: 0%;
    }
  }

  #video-config-box {
    width: 100%;
    flex-grow: 1 !important;
    background: rgba(213, 216, 216, 0.808);
    border: none;
    display: flex;
    flex-flow: column nowrap;
    justify-content: space-around;
    align-items: center;
    padding: 1em;
    > div {
      border: none;
      overflow: visible;
    }
    .input-group {
      width: 100%;
      height: 20%;
      position: relative;
      box-sizing: border-box;
      // overflow: hidden;
      // border-radius: 9px;
      display: flex;
      justify-content: center;
      align-items: center;
      color: var(--text-color-2);
      font-weight: 900;
      padding: 0.1em;
      box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.8);

      .input {
        width: 100%;
        height: 100%;
        border-radius: 15px;
        display: block;
        border: none;
        font-size: 18px;
        color: var(--text-color-1);
        font-family: 'ceyy';
        text-align: center;
        outline: none;
        border: none;
      }

      .user-label {
        width: auto;
        height: auto;
        position: absolute;
        font-size: 12px;
        left: 6%;
        top: 50%;
        transform: translateY(-50%);
        transition: all 0.3s ease-in-out;
      }

      .input:focus + label {
        left: 50%;
        top: 7%;
        font-size: 12px;
        transform: translate(-50%, -50%);
      }
      // 数字输入框去除上下箭头
      input::-webkit-outer-spin-button,
      input::-webkit-inner-spin-button {
        -webkit-appearance: none;
      }
      input[type='number'] {
        -moz-appearance: textfield;
      }
    }
  }
}
</style>
