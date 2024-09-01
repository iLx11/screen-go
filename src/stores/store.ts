import { defineStore } from "pinia";

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
      waitExecute: false
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
    }
  }
})