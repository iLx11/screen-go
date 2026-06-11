<script setup lang="ts">
import { computed, reactive, ref, watch, onMounted } from 'vue'
import { NSelect } from 'naive-ui'
import { useScreenStore } from '../stores/store'
import {
  DEFAULT_SCREEN_CONFIG_ARRAY,
  DEFAULT_THRESHOLD_DATA,
  useConfigStore,
} from '@/stores/configStore'
import { getItem, setItem } from '../utils/storage'
import { XBox } from 'ilx1-x-box'
import { resizeImage } from 'ilx1-x-tool'
import {
  readSizePresetArray,
  saveSizePresetArray,
} from '@/utils/tools/sizePreset'
import type { SizePreset } from '@/utils/tools/sizePreset'

type SizeConfig = Pick<SizePreset, 'width' | 'height'>

const screenStore = useScreenStore()
const configStore = useConfigStore()

// -------------------------------- 图片设置 ---------------------------------
const resizeText = ref<string>('图片缩放预览')
const picSizeData = reactive<SizeConfig>({
  width: '',
  height: '',
})

const preSize = reactive<SizePreset[]>(readSizePresetArray())
const isConfigReady = ref(false)
const presetSizeValue = ref<number | null>(null)
const colorModeBoxLeft = ref<string>(2 + '%')

const colorModeList = reactive([
  { label: '单色', value: 1 },
  { label: '彩色', value: 0 },
])

const presetSizeOptions = computed(() =>
  preSize.map((item, index) => {
    const width = toSizeValue(item.width)
    const height = toSizeValue(item.height)

    return {
      label: width && height ? `${width} x ${height}` : `预设 ${index + 1}`,
      value: index,
      disabled: !width || !height,
    }
  })
)

// -------------------------------- 配置同步 ---------------------------------
const configMaxValue = [1, 3, 1, 1, 1]

const parseStorageJson = <T,>(key: string, defaultValue: T): T => {
  try {
    const value = getItem(key)
    if (value == null) return defaultValue
    return JSON.parse(value) ?? defaultValue
  } catch (error) {
    return defaultValue
  }
}

const toInt = (value: unknown, defaultValue = 0) => {
  const num = Number(value)
  if (!Number.isFinite(num)) return defaultValue
  return Math.floor(num)
}

const toSizeValue = (value: unknown) => {
  const num = toInt(value, 0)
  return num > 0 ? num : 0
}

const toThresholdValue = (value: unknown, defaultValue = DEFAULT_THRESHOLD_DATA) => {
  const num = toInt(value, defaultValue)
  return Math.min(Math.max(num, 0), 255)
}

const toPureBase64 = (data: string) => {
  return data.includes(',') ? data.split(',')[1] : data
}

const normalizeConfigValue = (index: number, value: unknown) => {
  const max = configMaxValue[index] ?? 0
  const num = toInt(value, DEFAULT_SCREEN_CONFIG_ARRAY[index] ?? 0)
  return Math.min(Math.max(num, 0), max)
}

const normalizeConfigArray = (value: unknown) => {
  const source = Array.isArray(value) ? value : []
  return DEFAULT_SCREEN_CONFIG_ARRAY.map((defaultValue, index) =>
    normalizeConfigValue(index, source[index] ?? defaultValue)
  )
}

const normalizePresetArray = (value: unknown) => {
  return saveSizePresetArray(value)
}

const saveConfigArray = () => {
  if (!isConfigReady.value) return
  setItem('configArray', JSON.stringify(configStore.screenConfig.configArray))
}

const setConfigValue = (index: number, value: number, save = true) => {
  const safeValue = normalizeConfigValue(index, value)
  screenStore.setConfigArray(index, safeValue)
  configStore.screenConfig.configArray[index] = safeValue
  if (save) saveConfigArray()
}

const setColorModeBoxLeft = (value: number) => {
  colorModeBoxLeft.value = value ? 2 + '%' : 52 + '%'
}

const syncSizeToStore = () => {
  const width = toSizeValue(picSizeData.width)
  const height = toSizeValue(picSizeData.height)

  screenStore.setResizeWidth(width)
  screenStore.setResizeHeight(height)
  configStore.screenConfig.resizeWidth = width
  configStore.screenConfig.resizeHeight = height
}

const syncSizeFromStore = () => {
  const width =
    toSizeValue(configStore.screenConfig.resizeWidth) ||
    toSizeValue(screenStore.resizeWidth)
  const height =
    toSizeValue(configStore.screenConfig.resizeHeight) ||
    toSizeValue(screenStore.resizeHeight)

  picSizeData.width = width ? String(width) : ''
  picSizeData.height = height ? String(height) : ''
}

const getImageSource = () => {
  return configStore.screenData.baseData || screenStore.editorPicData
}

const setDefaultModeByColor = (colorMode: number) => {
  if (colorMode) {
    setLatticeFormat(1)
    setModeMethod(2)
    setModeDirection(0)
    setOutputDecimal(0)
  } else {
    setLatticeFormat(1)
    setModeMethod(0)
    setModeDirection(0)
    setOutputDecimal(0)
  }
}

watch(
  () => screenStore.isCroped,
  () => {
    picSizeData.width = screenStore.resizeWidth.toString()
    picSizeData.height = screenStore.resizeHeight.toString()
  },
  {
    deep: true,
    immediate: true,
  }
)

watch(
  picSizeData,
  () => syncSizeToStore(),
  {
    deep: true,
    immediate: false,
  }
)

watch(
  () => screenStore.isCountModify,
  () => {
    if (screenStore.isCountModify == true) {
      screenStore.setCountModify(false)
      const presetArray = readSizePresetArray()
      presetArray.forEach((element, index) => {
        preSize[index] = element
      })
    }
  },
  {
    immediate: true,
  }
)

// 图片大小预设值
const setPreSize = (v: SizeConfig) => {
  const width = toSizeValue(v.width)
  const height = toSizeValue(v.height)
  if (!width || !height) return

  picSizeData.width = String(width)
  picSizeData.height = String(height)
}

const setPreSizeByIndex = (index: string | number | null) => {
  const presetIndex = toInt(index, -1)
  if (presetIndex < 0) return

  const preset = preSize[presetIndex]
  if (preset) setPreSize(preset)
  presetSizeValue.value = null
}

// 图片缩放预览
const resizePic = async () => {
  const imageSource = getImageSource()
  const width = toSizeValue(picSizeData.width)
  const height = toSizeValue(picSizeData.height)

  if (imageSource != '' && screenStore.isResized == false) {
    // 图片缩放
    if (width && height) {
      screenStore.setWaitExecute(true)
      try {
        const data = await resizeImage(
          width,
          height,
          imageSource,
          Boolean(configStore.screenConfig.configArray[4])
        )

        configStore.screenData.resizeData = data
        screenStore.setResizePicData(toPureBase64(data))
        screenStore.setResized(true)
        resizeText.value = '返回原始图片'
        XBox.popMes('执行完成')
      } catch (error) {
        console.error(error)
        XBox.popMes('图片缩放失败！')
      } finally {
        screenStore.setWaitExecute(false)
      }
      return
    } else XBox.popMes('请正确设置图片大小!')
  } else {
    if (imageSource == '') XBox.popMes('请先设置一个图片！')
  }

  if (screenStore.isResized == true) {
    configStore.screenData.resizeData = imageSource
    screenStore.setResized(false)
    resizeText.value = '图片缩放预览'
  }
}

const syncBaseData = () => {
  if (configStore.screenData.baseData == '' && screenStore.editorPicData != '') {
    configStore.screenData.baseData = screenStore.editorPicData
  }
}

const thresholdShow = () => {
  if (configStore.screenConfig.configArray[4] == 0) {
    XBox.popMes('彩色取模不支持调整阈值！')
    return
  }
  syncBaseData()
  if (configStore.screenData.baseData == '' && screenStore.editorPicData == '') {
    XBox.popMes('请先编辑一张图片')
    return
  }
  screenStore.setThresholdShow(true)
}

const cropShow = () => {
  syncBaseData()
  if (configStore.screenData.baseData == '' && screenStore.editorPicData == '') {
    XBox.popMes('请先编辑一张图片')
    return
  }
  screenStore.setCropShow(true)
}

// -------------------------------- 取模设置 ---------------------------------
// 点阵格式
const formatBoxLeft = ref<string>(2 + '%')
const latticeFormat = reactive<string[]>(['阳码', '阴码'])
const setLatticeFormat = (k: number) => {
  const index = normalizeConfigValue(0, k)
  formatBoxLeft.value = index * 50 + 2 + '%'
  setConfigValue(0, index)
}

// 取模方式
const moveBoxLeft = ref<string>(2 + '%')
const modeMethod = reactive<string[]>(['逐行式', '逐列式', '列行式', '行列式'])
const setModeMethod = (k: number, showTip = true) => {
  let index = normalizeConfigValue(1, k)
  if (!configStore.screenConfig.configArray[4] && index != 0) {
    if (showTip) XBox.popMes('目前彩色取模只支持逐行哦！')
    index = 0
  }
  moveBoxLeft.value = index * 25 + 2 + '%'
  setConfigValue(1, index)
}

// 取模走向
const moveDirectionBoxLeft = ref<string>(5.5 + '%')
const modeDirection = reactive<string[]>(['逆向', '顺向'])
const setModeDirection = (k: number) => {
  const index = normalizeConfigValue(2, k)
  moveDirectionBoxLeft.value = index * 45 + 5.5 + '%'
  setConfigValue(2, index)
}

// 输出进制
const outputBoxLeft = ref<string>(5.5 + '%')
const outputDecimal = reactive<string[]>(['十六进制', '十进制'])
const setOutputDecimal = (k: number) => {
  const index = normalizeConfigValue(3, k)
  outputBoxLeft.value = index * 45 + 5.5 + '%'
  setConfigValue(3, index)
}

const setColorMode = (mode: number) => {
  const colorMode = normalizeConfigValue(4, mode)
  setColorModeBoxLeft(colorMode)
  setConfigValue(4, colorMode)
  setDefaultModeByColor(colorMode)
}

watch(
  () => screenStore.configArray[4],
  () => {
    if (!isConfigReady.value) return
    const colorMode = normalizeConfigValue(4, screenStore.configArray[4])
    setColorModeBoxLeft(colorMode)
    setConfigValue(4, colorMode)
    setDefaultModeByColor(colorMode)
  }
)

watch(
  screenStore.configArray,
  () => {
    configStore.screenConfig.configArray = normalizeConfigArray(
      screenStore.configArray
    )
    saveConfigArray()
  },
  {
    deep: true,
    immediate: true,
  }
)

onMounted(() => {
  configStore.screenConfig.configArray = normalizeConfigArray(
    configStore.screenConfig.configArray
  )
  configStore.screenConfig.thresholdData =
    toThresholdValue(configStore.screenConfig.thresholdData)
  screenStore.setThreshold(configStore.screenConfig.thresholdData)

  const tempArray = parseStorageJson<number[]>(
    'configArray',
    configStore.screenConfig.configArray
  )
  const configArray = normalizeConfigArray(tempArray)
  setColorModeBoxLeft(configArray[4])
  setConfigValue(4, configArray[4])
  setLatticeFormat(configArray[0])
  setModeMethod(configArray[1], false)
  setModeDirection(configArray[2])
  setOutputDecimal(configArray[3])

  const presetArray = normalizePresetArray(
    parseStorageJson('presetArray', preSize)
  )
  presetArray.forEach((element, index) => {
    preSize[index] = element
  })

  syncSizeFromStore()
  syncSizeToStore()
  isConfigReady.value = true
  saveConfigArray()
})
</script>

<template>
  <div id="config-content">
    <div id="img-size-config">
      <div id="color-mode-box">
        <div class="mode-select-box">
          <div
            v-for="item in colorModeList"
            :key="item.value"
            @click="setColorMode(item.value)"
          >
            {{ item.label }}
          </div>
          <div
            id="color-mode-move-box"
            :style="{ left: colorModeBoxLeft }"
          ></div>
        </div>
      </div>
      <div id="size-editor-box">
        <div id="resize-config-box">
          <div class="input-group">
            <input
              type="number"
              class="input"
              v-model="picSizeData.width"
              min="1"
              step="1"
            />
            <label class="user-label">宽度:</label>
          </div>
          <div class="input-group">
            <input
              type="number"
              class="input"
              v-model="picSizeData.height"
              min="1"
              step="1"
            />
            <label class="user-label">高度:</label>
          </div>
        </div>
        <div id="size-choose-box">
          <NSelect
            v-model:value="presetSizeValue"
            :options="presetSizeOptions"
            placeholder="常用宽高"
            @update:value="setPreSizeByIndex"
          />
        </div>
      </div>
      <div id="image-tool-box">
        <div class="tool-title">工具栏</div>
        <div class="tool-button-box">
          <div @click="thresholdShow">单色阈值</div>
          <div @click="cropShow">图片裁剪</div>
          <div @click="resizePic">{{ resizeText }}</div>
        </div>
      </div>
    </div>
    <div id="img-data-config">
      <div class="div1">点阵<br />格式</div>
      <div class="div2">
        <div
          v-for="(v, k) in latticeFormat"
          :key="k"
          @click="setLatticeFormat(k)"
        >
          {{ v }}
        </div>
        <div
          id="format-move-box"
          :style="{ left: formatBoxLeft }"
        ></div>
      </div>
      <div class="div3">取模方式</div>
      <div class="div4">
        <div
          v-for="(v, k) in modeMethod"
          :key="k"
          @click="setModeMethod(k)"
        >
          {{ v }}
        </div>
        <div
          id="mode-move-box"
          :style="{ left: moveBoxLeft }"
        ></div>
      </div>
      <div class="div5">取模走向</div>
      <div class="div6">
        <div
          v-for="(v, k) in modeDirection"
          :key="k"
          @click="setModeDirection(k)"
        >
          {{ v }}
        </div>
        <div
          id="mode-direction-move-box"
          :style="{ left: moveDirectionBoxLeft }"
        ></div>
      </div>
      <div class="div7">输出进制</div>
      <div class="div8">
        <div
          v-for="(v, k) in outputDecimal"
          :key="k"
          @click="setOutputDecimal(k)"
        >
          {{ v }}
        </div>
        <div
          id="output-move-box"
          :style="{ left: outputBoxLeft }"
        ></div>
      </div>
      <div class="div9"></div>
      <div class="div10"></div>
      <div class="div11"></div>
      <div class="div12"></div>
    </div>
  </div>
</template>

<style scoped lang="scss">
#config-content {
  width: 100%;
  height: 100%;
  display: flex;
  flex-flow: row nowrap;
  justify-content: space-between;
  align-items: center;
  padding: 0.7em;
  border: none;
  color: var(--config-text-color);
  font-weight: var(--config-font-weight);

  > div {
    width: 49%;
    height: 100%;
    border-radius: 10px;
    border: none;
  }

  #img-size-config {
    display: flex;
    flex-flow: column nowrap;
    gap: 8px;
    color: var(--config-text-color);
    box-shadow: 0 0 0 4px rgba(255, 255, 255, 0.8);

    > div {
      border: none;
      background: var(--data-config-title-box-color);
      border-radius: 10px;
      overflow: hidden;
    }

    #color-mode-box {
      width: 100%;
      height: 15%;
      min-height: 40px;
      background: var(--data-config-func-box-color);
    }

    .mode-select-box {
      width: 100%;
      height: 100%;
      display: flex;
      justify-content: space-around;
      align-items: center;
      position: relative;
      isolation: isolate;
      overflow: hidden;
      background: var(--data-config-func-box-color) !important;

      > div {
        width: 46%;
        height: 100%;
        display: flex;
        justify-content: center;
        align-items: center;
        position: relative;
        z-index: 1;
        cursor: pointer;
        font-size: 14px;
        font-weight: var(--config-font-weight);
        line-height: 1.05;
      }

      #color-mode-move-box {
        width: 45%;
        height: 80%;
        position: absolute;
        background: var(--data-config-move-box-color);
        z-index: 0;
        pointer-events: none;
        transition: all 0.6s ease-in-out;
        border-radius: 8px;
        border: 0.1px solid rgba(51, 51, 51, 0.2);
        box-shadow: 2.6px 0.5px 10px rgba(0, 0, 0, 0.023),
          21px 4px 80px rgba(0, 0, 0, 0.07);
      }
    }

    #size-editor-box {
      width: 100%;
      height: 42%;
      min-height: 120px;
      display: flex;
      flex-flow: column nowrap;
      gap: 8px;
      padding: 8px;
      background: var(--data-config-input-color);
    }

    #resize-config-box {
      width: 100%;
      flex: 1;
      min-height: 0;
      display: flex;
      flex-flow: column nowrap;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
      background: transparent;

      > div {
        border: none;
        overflow: visible;
      }

      .input-group {
        width: 100%;
        height: calc(50% - 4px);
        position: relative;
        box-sizing: border-box;
        display: flex;
        justify-content: center;
        align-items: center;
        color: var(--config-muted-text-color);
        font-weight: var(--config-font-weight);
        padding: 0.1em;

        .input {
          width: 100%;
          height: 100%;
          border-radius: 8px;
          display: block;
          border: none;
          font-size: 18px;
          color: var(--config-text-color);
          font-family: 'ceyy';
          font-weight: var(--config-font-weight);
          text-align: center;
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
      }
    }

    #size-choose-box {
      width: 100%;
      height: 34px;
      display: flex;
      justify-content: center;
      align-items: center;
      flex-shrink: 0;
      min-width: 0;

      :deep(.n-select) {
        width: 100%;
      }

      :deep(.n-base-selection) {
        min-height: 100%;
        border-radius: 8px;
      }
    }

    #image-tool-box {
      width: 100%;
      flex: 1;
      min-height: 94px;
      display: flex;
      flex-flow: column nowrap;
      // padding: 9px;
      background: rgba(255, 255, 255, 0.8);
      box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.9);
    }

    .tool-title {
      width: 100%;
      height: 22px;
      display: flex;
      justify-content: center;
      align-items: center;
      flex-shrink: 0;
      margin-bottom: 7px;
      border-radius: 8px;
      background: var(--data-config-title-box-color);
      font-size: 12px;
      font-weight: var(--config-font-weight);
      line-height: 1.1;
      color: var(--config-muted-text-color);
    }

    .tool-button-box {
      flex: 1;
      min-height: 0;
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 7px;

      > div {
        min-width: 0;
        display: flex;
        justify-content: center;
        align-items: center;
        padding: 0 6px;
        border-radius: 8px;
        background: var(--config-botton-color);
        color: var(--config-muted-text-color);
        font-size: 13px;
        font-weight: var(--config-font-weight);
        text-align: center;
        line-height: 1.08;
        white-space: normal;
        word-break: break-all;
        overflow-wrap: anywhere;
        cursor: pointer;
        transition: all 0.25s ease-in-out;
      }

      > div:hover {
        color: var(--config-text-color);
        box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.8);
      }
    }

    :deep(.n-base-selection-label) {
      min-height: 100%;
      align-items: center;
    }

    :deep(.n-base-selection-placeholder),
    :deep(.n-base-selection-input__content) {
      color: var(--config-muted-text-color);
      font-size: 12px;
      font-weight: var(--config-font-weight);
      line-height: 1.1;
    }

    :deep(.n-base-selection .n-base-suffix) {
      margin-right: 4px;
    }

    input[type='number'] {
      appearance: textfield;
    }

    input[type='number']::-webkit-outer-spin-button,
    input[type='number']::-webkit-inner-spin-button {
      margin: 0;
      appearance: none;
    }
  }

  // ------------------ 取模设置 -------------------
  #img-data-config {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    grid-template-rows: repeat(7, 1fr);
    column-gap: 4px;
    row-gap: 4px;
    color: var(--config-text-color);
    box-shadow: 0 0 0 4px rgba(255, 255, 255, 0.8);

    > div {
      border: none;
      background: var(--data-config-title-box-color);
      border-radius: 10px;
    }

    div {
      border: none;
      display: flex;
      justify-content: center;
      align-items: center;
    }

    .div1 {
      grid-area: 1 / 1 / 2 / 2;
      font-size: 12px;
    }

    .div2 {
      grid-area: 1 / 2 / 2 / 5;
      justify-content: space-around;
      background: var(--data-config-func-box-color);
      position: relative;
      font-size: 14.5px;
      > div {
        width: 46%;
        height: 100%;
        cursor: pointer;
      }

      #format-move-box {
        width: 45%;
        height: 80%;
        position: absolute;
        background: var(--data-config-move-box-color);
        z-index: 0;
        transition: all 0.6s ease-in-out;
        border-radius: 8px;
        border: 0.1px solid rgba(51, 51, 51, 0.2);
        box-shadow: 2.6px 0.5px 10px rgba(0, 0, 0, 0.023),
          21px 4px 80px rgba(0, 0, 0, 0.07);
      }
    }

    .div3 {
      grid-area: 2 / 1 / 3 / 5;
      font-size: 13px;
    }

    .div4 {
      grid-area: 3 / 1 / 5 / 5;
      justify-content: space-between;
      align-items: center;
      position: relative;
      padding: 0.3em;
      background: var(--data-config-func-box-color);
      overflow: hidden;

      > div {
        width: 22%;
        height: 100%;
        writing-mode: tb-rl;
        cursor: pointer;
        font-size: 14px;
      }

      #mode-move-box {
        width: 22%;
        height: 90%;
        position: absolute;
        background: var(--data-config-move-box-color);
        z-index: 0;
        transition: all 0.6s ease-in-out;
        border: 0.1px solid rgba(51, 51, 51, 0.2);
        border-radius: 8px;
        box-shadow: 2.6px 0.5px 10px rgba(0, 0, 0, 0.023),
          21px 4px 80px rgba(0, 0, 0, 0.07);
      }
    }

    .div5 {
      grid-area: 5 / 1 / 6 / 3;
      font-size: 13px;
    }

    .div6 {
      grid-area: 6 / 1 / 8 / 3;
      justify-content: space-around;
      align-items: center;
      padding: 0.3em;
      position: relative;
      background: var(--data-config-func-box-color);

      > div {
        width: 45%;
        height: 100%;
        writing-mode: tb-rl;
        cursor: pointer;
        font-size: 13px;
      }

      #mode-direction-move-box {
        width: 45%;
        height: 90%;
        position: absolute;
        background: var(--data-config-move-box-color);
        z-index: 0;
        border-radius: 8px;
        border: 0.1px solid rgba(51, 51, 51, 0.2);
        transition: all 0.5s ease-in-out;
        box-shadow: 2.6px 0.5px 10px rgba(0, 0, 0, 0.023),
          21px 4px 80px rgba(0, 0, 0, 0.07);
      }
    }

    .div7 {
      grid-area: 5 / 3 / 6 / 5;
      font-size: 13px;
    }

    .div8 {
      grid-area: 6 / 3 / 8 / 5;
      justify-content: space-around;
      align-items: center;
      padding: 0.3em;
      background: var(--data-config-func-box-color);
      position: relative;

      > div {
        width: 45%;
        height: 100%;
        writing-mode: tb-rl;
        cursor: pointer;
        font-size: 12px;
      }

      #output-move-box {
        width: 45%;
        height: 90%;
        position: absolute;
        background: var(--data-config-move-box-color);
        z-index: 0;
        border-radius: 8px;
        border: 0.1px solid rgba(51, 51, 51, 0.15);
        transition: all 0.5s ease-in-out;
        box-shadow: 2.6px 0.5px 10px rgba(0, 0, 0, 0.023),
          21px 4px 80px rgba(0, 0, 0, 0.07);
      }
    }

    .div2,
    .div4,
    .div6,
    .div8 {
      isolation: isolate;
      overflow: hidden;

      > div {
        position: relative;
        z-index: 1;
      }

      #format-move-box,
      #mode-move-box,
      #mode-direction-move-box,
      #output-move-box {
        z-index: 0;
        pointer-events: none;
      }
    }

    .div9 {
      grid-area: 1/ 1/ 2/ 5;
      z-index: -1;
      padding: 1em;
    }

    .div10 {
      grid-area: 2/ 1/ 5/ 5;
      z-index: -1;
    }

    .div11 {
      grid-area: 5 / 1 / 8 / 3;
      z-index: -1;
    }

    .div12 {
      grid-area: 5 / 3 / 8 / 5;
      z-index: -1;
    }
  }
}
</style>
