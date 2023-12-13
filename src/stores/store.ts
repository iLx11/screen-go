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
      isTextShow: false,
      popText: '',
      preSizeCount: 0,
      isCountModify: false,
      resultDataLength: 0
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
    showText(text: string) {
      this.setTextShow(true)
      this.popText = text
    },
    setTextShow(state: boolean) {
      this.isTextShow = state
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
    
  }
})