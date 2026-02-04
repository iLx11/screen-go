import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { XBox } from 'ilx1-x-box'

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
    thresholdData: 0,
    configArray: [],
  })

  return { showPop, screenData, screenConfig }
})
