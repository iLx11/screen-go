<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { NButton, NInputNumber, NSelect, NSpace, NTag } from 'naive-ui'
import { useScreenStore } from '../stores/store'
import { XBox } from 'ilx1-x-box'

type ScaleMode = 'stretch' | 'contain' | 'cover'

type VideoSelectResult = {
  filePaths?: string[]
}

type VideoInfo = {
  width: number
  height: number
  duration: number
}

const screenStore = useScreenStore()
const win = window as any

const videoFilePath = ref<string>('')
const loadingVideoInfo = ref(false)
const videoInfo = reactive<VideoInfo>({
  width: 0,
  height: 0,
  duration: 0,
})
const videoConfigValue = reactive<{
  width: number | null
  height: number | null
  videoStart: number
  videoDur: number | null
  videoFrame: number | null
  scaleMode: ScaleMode
}>({
  width: null,
  height: null,
  videoStart: 0,
  videoDur: null,
  videoFrame: null,
  scaleMode: 'stretch',
})

const scaleOptions = [
  {
    label: '拉伸',
    value: 'stretch',
  },
  {
    label: '等比留边',
    value: 'contain',
  },
  {
    label: '等比裁切',
    value: 'cover',
  },
]

const toPositiveInt = (value: unknown) => {
  const num = Number(value)
  if (!Number.isFinite(num)) return 0
  return Math.max(0, Math.floor(num))
}

const toNonNegativeNumber = (value: unknown) => {
  const num = Number(value)
  if (!Number.isFinite(num)) return 0
  return Math.max(0, num)
}

const toConfigNumber = (value: unknown) => {
  const num = toPositiveInt(value)
  return num > 0 ? num : null
}

const normalizeScaleMode = (mode: unknown): ScaleMode => {
  return mode === 'contain' || mode === 'cover' || mode === 'stretch'
    ? mode
    : 'stretch'
}

const formatBytes = (bytes: number) => {
  if (bytes <= 0) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

const videoFileName = computed(() => {
  return videoFilePath.value.split(/[\\/]/).pop() || ''
})
const hasVideoInfo = computed(() => videoInfo.width > 0 && videoInfo.height > 0)
const videoStartMax = computed(() => {
  return videoInfo.duration > 0
    ? Number(Math.max(0, videoInfo.duration - 0.1).toFixed(1))
    : undefined
})
const maxAvailableDuration = computed(() => {
  if (videoInfo.duration <= 0) return undefined
  const remain = Math.floor(
    videoInfo.duration - toNonNegativeNumber(videoConfigValue.videoStart)
  )
  return remain > 0 ? remain : undefined
})
const frameCount = computed(() => {
  return (
    toPositiveInt(videoConfigValue.videoDur) *
    toPositiveInt(videoConfigValue.videoFrame)
  )
})
const bytesPerFrame = computed(() => {
  const width = toPositiveInt(videoConfigValue.width)
  const height = toPositiveInt(videoConfigValue.height)
  if (!width || !height) return 0
  if (screenStore.configArray[4] !== 1) return width * height * 2
  return screenStore.configArray[1] === 0 || screenStore.configArray[1] === 3
    ? Math.ceil(width / 8) * height
    : Math.ceil(height / 8) * width
})
const bytesPerFrameText = computed(() => formatBytes(bytesPerFrame.value))
const totalBytesText = computed(() => formatBytes(bytesPerFrame.value * frameCount.value))
const outputModeText = computed(() => {
  return screenStore.configArray[4] === 1 ? '单色' : '彩色'
})

const setVideoInfo = (info: Partial<VideoInfo>) => {
  const width = toPositiveInt(info.width)
  const height = toPositiveInt(info.height)
  const duration = Number(toNonNegativeNumber(info.duration).toFixed(2))
  videoInfo.width = width
  videoInfo.height = height
  videoInfo.duration = duration
  screenStore.setVideoInfo(width, height, duration)
}

const applySourceSize = () => {
  if (!hasVideoInfo.value) return
  videoConfigValue.width = videoInfo.width
  videoConfigValue.height = videoInfo.height
}

const fillDefaultConfigByInfo = () => {
  if (!videoConfigValue.width && videoInfo.width > 0) {
    videoConfigValue.width = videoInfo.width
  }
  if (!videoConfigValue.height && videoInfo.height > 0) {
    videoConfigValue.height = videoInfo.height
  }
  if (!videoConfigValue.videoFrame) {
    videoConfigValue.videoFrame = 1
  }
  const maxStart = videoStartMax.value
  if (
    typeof maxStart === 'number' &&
    toNonNegativeNumber(videoConfigValue.videoStart) > maxStart
  ) {
    videoConfigValue.videoStart = maxStart
  }
  const maxDur = maxAvailableDuration.value
  const dur = toPositiveInt(videoConfigValue.videoDur)
  if (maxDur && (!dur || dur > maxDur)) {
    videoConfigValue.videoDur = maxDur
  }
}

const readVideoInfo = async (filePath: string) => {
  const handler = win.api.getVideoInfo || win.api.data?.getVideoInfo
  if (typeof handler !== 'function') return

  loadingVideoInfo.value = true
  try {
    const info = (await handler(filePath)) as VideoInfo | null
    if (!info) {
      XBox.popMes('读取视频信息失败')
      return
    }
    setVideoInfo(info)
    fillDefaultConfigByInfo()
  } catch (error) {
    console.error(error)
    XBox.popMes('读取视频信息失败')
  } finally {
    loadingVideoInfo.value = false
  }
}

const selectVideoFile = async () => {
  try {
    const videoPath: VideoSelectResult = await win.api.selectVideoFile()
    const filePath = videoPath?.filePaths?.[0]
    if (filePath) {
      videoFilePath.value = filePath
      // 存储路径
      screenStore.setVideoPath(videoFilePath.value)
      await readVideoInfo(filePath)
    } else {
      XBox.popMes('没有选择文件')
    }
  } catch (error) {
    console.error(error)
    XBox.popMes('选择视频失败')
  }
}

onMounted(() => {
  videoFilePath.value = screenStore.videoPath
  videoConfigValue.width = toConfigNumber(screenStore.resizeWidth)
  videoConfigValue.height = toConfigNumber(screenStore.resizeHeight)
  videoConfigValue.videoStart = Number(toNonNegativeNumber(screenStore.videoStart).toFixed(1))
  videoConfigValue.videoDur = toConfigNumber(screenStore.videoDur)
  videoConfigValue.videoFrame = toConfigNumber(screenStore.videoFrame)
  videoConfigValue.scaleMode = normalizeScaleMode(screenStore.videoScaleMode)
  setVideoInfo({
    width: screenStore.videoSourceWidth,
    height: screenStore.videoSourceHeight,
    duration: screenStore.videoTotalDur,
  })
  if (videoFilePath.value && !hasVideoInfo.value) {
    readVideoInfo(videoFilePath.value)
  }
})

watch(
  videoConfigValue,
  () => {
    screenStore.setResizeWidth(toPositiveInt(videoConfigValue.width))
    screenStore.setResizeHeight(toPositiveInt(videoConfigValue.height))
    screenStore.setVideoStart(Number(toNonNegativeNumber(videoConfigValue.videoStart).toFixed(1)))
    screenStore.setVideoDur(toPositiveInt(videoConfigValue.videoDur))
    screenStore.setVideoFrame(toPositiveInt(videoConfigValue.videoFrame))
    screenStore.setVideoScaleMode(normalizeScaleMode(videoConfigValue.scaleMode))
  },
  {
    deep: true,
  }
)

watch(
  [() => videoConfigValue.videoStart, () => videoInfo.duration],
  () => {
    const maxStart = videoStartMax.value
    if (
      typeof maxStart === 'number' &&
      toNonNegativeNumber(videoConfigValue.videoStart) > maxStart
    ) {
      videoConfigValue.videoStart = maxStart
      return
    }
    const maxDur = maxAvailableDuration.value
    const dur = toPositiveInt(videoConfigValue.videoDur)
    if (maxDur && dur > maxDur) {
      videoConfigValue.videoDur = maxDur
    }
  }
)
</script>

<template>
  <div id="config-content">
    <div
      id="video-box"
      @click="selectVideoFile"
    >
      <video
        v-if="videoFilePath"
        :src="videoFilePath"
        controls
        muted
        @click.stop
      ></video>
      <NButton
        v-else
        type="primary"
        secondary
        :loading="loadingVideoInfo"
        @click.stop="selectVideoFile"
      >
        选择视频
      </NButton>
    </div>
    <div id="video-config-box">
      <NSpace
        vertical
        :size="10"
        class="video-config-space"
      >
        <NButton
          size="small"
          secondary
          block
          :loading="loadingVideoInfo"
          @click="selectVideoFile"
        >
          {{ videoFilePath ? '更换视频' : '选择视频' }}
        </NButton>

        <div
          v-if="videoFileName || hasVideoInfo"
          class="video-meta"
        >
          <NTag
            v-if="videoFileName"
            size="small"
            :bordered="false"
            class="file-name"
          >
            {{ videoFileName }}
          </NTag>
          <NTag
            v-if="hasVideoInfo"
            size="small"
            type="info"
            :bordered="false"
          >
            {{ videoInfo.width }}×{{ videoInfo.height }}
          </NTag>
          <NTag
            v-if="videoInfo.duration"
            size="small"
            type="success"
            :bordered="false"
          >
            {{ videoInfo.duration }}s
          </NTag>
          <NButton
            v-if="hasVideoInfo"
            size="tiny"
            quaternary
            @click="applySourceSize"
          >
            源尺寸
          </NButton>
        </div>

        <div class="config-grid">
          <div class="config-item">
            <div class="config-label">宽度</div>
            <NInputNumber
              v-model:value="videoConfigValue.width"
              :min="1"
              :step="1"
              :precision="0"
              placeholder=""
            />
          </div>
          <div class="config-item">
            <div class="config-label">高度</div>
            <NInputNumber
              v-model:value="videoConfigValue.height"
              :min="1"
              :step="1"
              :precision="0"
              placeholder=""
            />
          </div>
          <div class="config-item">
            <div class="config-label">开始(s)</div>
            <NInputNumber
              v-model:value="videoConfigValue.videoStart"
              :min="0"
              :max="videoStartMax"
              :step="0.1"
              :precision="1"
              placeholder=""
            />
          </div>
          <div class="config-item">
            <div class="config-label">时长(s)</div>
            <NInputNumber
              v-model:value="videoConfigValue.videoDur"
              :min="1"
              :max="maxAvailableDuration"
              :step="1"
              :precision="0"
              placeholder=""
            />
          </div>
          <div class="config-item">
            <div class="config-label">帧/秒</div>
            <NInputNumber
              v-model:value="videoConfigValue.videoFrame"
              :min="1"
              :step="1"
              :precision="0"
              placeholder=""
            />
          </div>
          <div class="config-item">
            <div class="config-label">缩放</div>
            <NSelect
              v-model:value="videoConfigValue.scaleMode"
              :options="scaleOptions"
            />
          </div>
        </div>

        <div class="estimate-line">
          <span>{{ frameCount }} 帧</span>
          <span>{{ outputModeText }}</span>
          <span>{{ bytesPerFrameText }}/帧</span>
          <span>{{ totalBytesText }}</span>
        </div>
      </NSpace>
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
  color: var(--config-text-color);
  font-weight: var(--config-font-weight);

  > div {
    border-radius: 10px;
    overflow: hidden;
  }

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
      width: 100%;
      height: 100%;
      object-fit: contain;
      background: #1f2328;
      cursor: pointer;
    }
  }

  #video-config-box {
    width: 100%;
    flex-grow: 1 !important;
    background: rgba(236, 240, 242, 0.808);
    border: none;
    padding: 12px;

    .video-config-space {
      width: 100%;
    }

    .video-meta {
      width: 100%;
      min-height: 24px;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 6px;
    }

    .file-name {
      max-width: 100%;
    }

    .config-grid {
      width: 100%;
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 9px;
    }

    .config-item {
      min-width: 0;
    }

    .config-label {
      height: 18px;
      line-height: 18px;
      margin-bottom: 4px;
      font-size: 12px;
      font-weight: var(--config-font-weight);
      color: var(--config-muted-text-color);
    }

    .estimate-line {
      width: 100%;
      min-height: 26px;
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      align-items: center;
      gap: 6px;
      padding: 6px 8px;
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.85);
      color: var(--config-muted-text-color);
      font-size: 12px;
      font-weight: var(--config-font-weight);
      text-align: center;

      span {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    }

    :deep(.n-input-number),
    :deep(.n-select) {
      width: 100%;
    }

    :deep(.n-input),
    :deep(.n-base-selection) {
      border-radius: 8px;
      color: var(--config-text-color);
      font-weight: var(--config-font-weight);
    }

    :deep(.n-input__input-el),
    :deep(.n-base-selection-input__content),
    :deep(.n-button__content),
    :deep(.n-tag__content) {
      color: var(--config-text-color);
      font-weight: var(--config-font-weight);
    }

    :deep(.n-base-selection-placeholder) {
      color: var(--config-muted-text-color);
      font-weight: var(--config-font-weight);
    }

    :deep(.file-name .n-tag__content) {
      max-width: 128px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }
}
</style>
