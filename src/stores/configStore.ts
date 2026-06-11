import { ref } from 'vue'
import { defineStore } from 'pinia'
import { XBox } from 'ilx1-x-box'

export const DEFAULT_SCREEN_CONFIG_ARRAY = [1, 2, 0, 0, 1]
export const DEFAULT_THRESHOLD_DATA = 120

export const useConfigStore = defineStore('config', () => {
  // 显示 pop 窗口
  const showPop = (mes = '', config = {}) => {
    let popConfig = Object.assign(
      {
        width: '340px',
        type: 'mes',
        dur: 2000,
        callback: null,
        style: [0, 1],
      },
      config
    )
    XBox.popMes(mes, popConfig)
  }

  const screenData = ref({
    baseData: '',
    resizeData: '',
    buffData: [],
  })

  const screenConfig = ref({
    resizeWidth: 0,
    resizeHeight: 0,
    thresholdData: DEFAULT_THRESHOLD_DATA,
    configArray: [...DEFAULT_SCREEN_CONFIG_ARRAY],
  })

  return { showPop, screenData, screenConfig }
})
