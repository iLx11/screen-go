import { defineStore } from 'pinia'

export const useScreenStore = defineStore('screen', {
  state: () => {
    return {
      editorPicData: '',
      resizePicData: '',
      isResized: false,
      resizeWidth: 0,
      resizeHeight: 0,
      configArray: [1, 2, 0, 0, 1],
      resultString: '',
      configData: {},
      isConfigModify: false,
      preSizeCount: 0,
      isCountModify: false,
      resultDataLength: 0,
      isThresholdShow: false,
      thresholdData: 120,
      isCropShow: false,
      cropWidthData: 0,
      cropHeightData: 0,
      isCroped: false,
      waitExecute: false,
      waitCancelable: false,
      waitCanceled: false,
      waitProgressVisible: false,
      waitProgress: 0,
      waitProgressText: '等待中...',
      videoStart: 0,
      videoDur: 0,
      videoFrame: 0,
      videoScaleMode: 'stretch',
      videoSourceWidth: 0,
      videoSourceHeight: 0,
      videoTotalDur: 0,
      curMode: false,
      videoPath: ''
    }
  },
  actions: {
    setEiditorPicData(picData: string) {
      this.editorPicData = picData
    },
    setResizePicData(picData: string) {
      this.resizePicData = picData
    },
    setResized(state: boolean) {
      this.isResized = state
    },
    setResizeWidth(data: number) {
      this.resizeWidth = data
    },
    setResizeHeight(data: number) {
      this.resizeHeight = data
    },
    setConfigArray(k: number, v: number) {
      this.configArray[k] = v
    },
    setResultString(str: string) {
      this.resultString = str
    },
    setConfigData(config: object) {
      this.configData = config
    },
    setModify(state: boolean) {
      this.isConfigModify = state
    },
    setCountModify(state: boolean) {
      this.isCountModify = state
    },
    setDataLength(data: number) {
      this.resultDataLength = data
    },
    setPreCount(data: number) {
      this.preSizeCount = data
    },
    setThresholdShow(state: boolean) {
      this.isThresholdShow = state
    },
    setThreshold(data: number) {
      this.thresholdData = data
    },
    setCropShow(state: boolean) {
      this.isCropShow = state
    },
    setCropWidth(data: number) {
      this.cropWidthData = data
    },
    setCropHeight(data: number) {
      this.cropHeightData = data
    },
    setCroped(state: boolean) {
      this.isCroped = state
    },
    setWaitExecute(state: boolean) {
      this.waitExecute = state
    },
    setWaitCancelable(state: boolean) {
      this.waitCancelable = state
    },
    setWaitCanceled(state: boolean) {
      this.waitCanceled = state
    },
    setWaitProgressVisible(state: boolean) {
      this.waitProgressVisible = state
    },
    setWaitProgress(data: number) {
      const progress = Math.round(Number(data))
      this.waitProgress = Number.isFinite(progress)
        ? Math.max(0, Math.min(progress, 100))
        : 0
    },
    setWaitProgressText(text: string) {
      this.waitProgressText = text
    },
    resetWaitProgress() {
      this.waitProgress = 0
      this.waitProgressText = '等待中...'
      this.waitProgressVisible = false
    },
    setVideoStart(data: number) {
      this.videoStart = data
    },
    setVideoDur(data: number) {
      this.videoDur = data
    },
    setVideoFrame(data: number) {
      this.videoFrame = data
    },
    setVideoScaleMode(mode: string) {
      this.videoScaleMode = mode
    },
    setVideoInfo(width: number, height: number, duration: number) {
      this.videoSourceWidth = width
      this.videoSourceHeight = height
      this.videoTotalDur = duration
    },
    setVideoPath(path: string) {
      this.videoPath = path
    }
  },
})
