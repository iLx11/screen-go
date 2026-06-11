<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import Codemirror from 'codemirror-editor-vue3'
import {
  NButton,
  NCheckbox,
  NForm,
  NFormItem,
  NGrid,
  NGridItem,
  NInput,
  NModal,
  NScrollbar,
  NSelect,
  NSpace,
  NTag,
} from 'naive-ui'
import { useScreenStore } from '../stores/store'
import { useConfigStore } from '../stores/configStore'
import { XBox } from 'ilx1-x-box'

import 'codemirror/mode/clike/clike.js'
import 'codemirror/addon/display/placeholder.js'

type ResultConfig = {
  arrayName: string
  preComment: string
  backComment: string
  replaceSource1: string
  replaceTarget1: string
  videoArrayMode: 'two-dimensional' | 'multiple-one-dimensional'
  outputBinFile: boolean
}

type ReverseImageConfig = {
  width: number
  height: number
  configArray: number[]
}

const defaultConfig: ResultConfig = {
  arrayName: 'unsigned char bmp',
  preComment: '// 图片数组开始',
  backComment: '// 图片数组结束',
  replaceSource1: '',
  replaceTarget1: '',
  videoArrayMode: 'two-dimensional',
  outputBinFile: false,
}

const MAX_SHOW_LENGTH = 10000
const CONFIG_MAX_VALUE = [1, 3, 1, 1, 1]

const screenStore = useScreenStore()
const configStore = useConfigStore()
const win = window as any
const resultString = ref<string>('')
const resultStrShow = ref<string>('')
const isResultTruncated = ref<boolean>(false)
const reverseImageShow = ref<boolean>(false)
const reverseImageData = ref<string>('')
const reverseImageInfo = ref<string>('')
const reverseImageConfig = ref<ReverseImageConfig | null>(null)
const resultConfigShow = ref<boolean>(false)
const resultConfigData = reactive<ResultConfig>({ ...defaultConfig })
const videoArrayModeOptions = [
  {
    label: '二维数组',
    value: 'two-dimensional',
  },
  {
    label: '多个一维数组',
    value: 'multiple-one-dimensional',
  },
]
let hasShownTruncateTip = false
let lastReplaceError = ''

const cmOptions = {
  mode: 'text/x-csrc',
  theme: 'default',
  readOnly: false,
  lineNumbers: true,
  lineWrapping: true,
  smartIndent: false,
  tabSize: 2,
  indentUnit: 2,
  styleActiveLine: false,
  gutters: ['CodeMirror-linenumbers'],
}

const getResultConfig = (): ResultConfig => {
  return {
    ...defaultConfig,
    ...(screenStore.configData as Partial<ResultConfig>),
  }
}

const outputBinFile = computed(() => getResultConfig().outputBinFile)

const resetResultConfigData = () => {
  Object.assign(resultConfigData, getResultConfig())
}

const syncResultConfigData = () => {
  screenStore.setConfigData({ ...resultConfigData })
}

resetResultConfigData()
syncResultConfigData()

const openResultConfig = () => {
  resetResultConfigData()
  resultConfigShow.value = true
}

const closeResultConfig = () => {
  resetResultConfigData()
  resultConfigShow.value = false
}

const modifyResultConfig = () => {
  syncResultConfigData()
  screenStore.setModify(true)
  resultConfigShow.value = false
  XBox.popMes('数据修改成功！')
}

const editorModified = ref<boolean>(false)
let autoDisplayText = ''

const getFrameCount = () => {
  const videoDur = Number(screenStore.videoDur)
  const videoFrame = Number(screenStore.videoFrame)
  if (!Number.isFinite(videoDur) || !Number.isFinite(videoFrame)) return 0
  return Math.max(0, Math.floor(videoDur * videoFrame))
}

const extractTopLevelBraceDataList = (text: string) => {
  const textList: string[] = []
  let level = 0
  let currentText = ''

  for (const char of text) {
    if (char == '{') {
      if (level > 0) currentText += char
      level += 1
      continue
    }

    if (char == '}') {
      if (level > 1) currentText += char
      if (level > 0) level -= 1
      if (level == 0 && currentText) {
        textList.push(currentText)
        currentText = ''
      }
      continue
    }

    if (level > 0) {
      currentText += char
    }
  }

  return textList
}

const getVideoFrameTextList = () => {
  const frameList = extractTopLevelBraceDataList(screenStore.resultString)
  return frameList.length > 0 ? frameList : [screenStore.resultString]
}

const getPureDataText = () => {
  if (!screenStore.curMode) return screenStore.resultString
  return getVideoFrameTextList().join(',\n')
}

const getArrayNameWithIndex = (arrayName: string, index: number) => {
  const name = arrayName.trim()
  const result = name.replace(/([A-Za-z_$][\w$]*)(\s*)$/, `$1_${index}$2`)
  return result == name ? `${name}_${index}` : result
}

const buildResultString = () => {
  if (!screenStore.resultString) return ''

  const config = getResultConfig()
  if (config.outputBinFile) return getPureDataText()

  if (
    screenStore.curMode &&
    config.videoArrayMode == 'multiple-one-dimensional'
  ) {
    const frameList = getVideoFrameTextList()
    const arrayList = frameList.map((frameText, index) => {
      const arrayName = getArrayNameWithIndex(config.arrayName, index)
      return `${arrayName}[${screenStore.resultDataLength}] = {\n  ${frameText}\n};`
    })

    return `${config.preComment}\n${arrayList.join('\n')}\n${config.backComment}\n`
  }

  const arraySize = screenStore.curMode
    ? `[${getFrameCount()}][${screenStore.resultDataLength}]`
    : `[${screenStore.resultDataLength}]`

  return `${config.preComment}\n${config.arrayName}${arraySize} = {\n  ${screenStore.resultString}\n};\n${config.backComment}\n`
}

const createReplaceRegExp = (source: string) => {
  try {
    return new RegExp(source, 'gi')
  } catch (error) {
    if (lastReplaceError != source) {
      lastReplaceError = source
      console.error(error)
      XBox.popMes('自定义替换规则错误')
    }
    return null
  }
}

const applyReplaceConfig = (text: string) => {
  const config = getResultConfig()
  const replaceList = [
    [config.replaceSource1, config.replaceTarget1],
  ]

  return replaceList.reduce((result, [source, target]) => {
    if (!source) return result
    const reg = createReplaceRegExp(source)
    if (!reg) return result
    return result.replace(reg, target || '')
  }, text)
}

const updateResultShow = (text: string) => {
  resultString.value = text
  isResultTruncated.value = text.length > MAX_SHOW_LENGTH
  editorModified.value = false

  if (isResultTruncated.value) {
    autoDisplayText =
      text.substring(0, MAX_SHOW_LENGTH) +
      '\n......（数据过长，显示已截取，点击复制时为全部文本）'
    resultStrShow.value = autoDisplayText
    if (!hasShownTruncateTip) {
      hasShownTruncateTip = true
      XBox.popMes('数据过长，显示截取，复制时为全部文本')
    }
  } else {
    hasShownTruncateTip = false
    autoDisplayText = text
    resultStrShow.value = autoDisplayText
  }
}

const refreshResult = () => {
  lastReplaceError = ''
  updateResultShow(applyReplaceConfig(buildResultString()))
}

watch(
  [
    () => screenStore.resultString,
    () => screenStore.curMode,
    () => screenStore.resultDataLength,
    () => screenStore.videoDur,
    () => screenStore.videoFrame,
    () => screenStore.configData,
  ],
  refreshResult,
  {
    deep: true,
    immediate: true,
  }
)

watch(
  () => resultStrShow.value,
  value => {
    editorModified.value = value !== autoDisplayText
  }
)

watch(
  () => screenStore.isConfigModify,
  state => {
    if (state) {
      screenStore.setModify(false)
      refreshResult()
    }
  }
)

const copyResult = async () => {
  const copyText = editorModified.value ? resultStrShow.value : resultString.value

  if (!copyText) {
    XBox.popMes('暂无数据')
    return
  }

  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(copyText)
      XBox.popMes('复制成功!')
      return
    } catch (error) {
      console.error('复制失败:', error)
    }
  }

  const textarea = document.createElement('textarea')
  textarea.readOnly = true
  textarea.style.position = 'absolute'
  textarea.style.left = '-6666px'
  textarea.value = copyText
  document.body.appendChild(textarea)
  textarea.select()
  if (document.execCommand('Copy')) {
    XBox.popMes('复制成功!')
  } else {
    XBox.popMes('复制失败!')
  }
  document.body.removeChild(textarea)
}

const getCurrentSourceText = () => {
  return editorModified.value || !screenStore.resultString || !isResultTruncated.value
    ? resultStrShow.value
    : screenStore.resultString
}

const getBinSourceText = () => {
  return editorModified.value || !screenStore.resultString
    ? resultStrShow.value
    : screenStore.resultString
}

const downloadBinByBrowser = (bytes: number[], fileName: string) => {
  const blob = new Blob([new Uint8Array(bytes)], {
    type: 'application/octet-stream',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

const exportBinFile = async () => {
  const bytes = parseResultBytes(getBinSourceText())

  if (bytes.length == 0) {
    XBox.popMes('暂无可导出的数据')
    return
  }

  const fileName = screenStore.curMode ? 'video-data.bin' : 'image-data.bin'
  const handler = win.api.saveBinFile || win.api.file?.saveBinFile

  try {
    if (typeof handler == 'function') {
      const saved = await handler(bytes, fileName)
      XBox.popMes(saved ? 'BIN 导出成功' : '已取消导出')
      return
    }

    downloadBinByBrowser(bytes, fileName)
    XBox.popMes('BIN 导出成功')
  } catch (error) {
    console.error(error)
    XBox.popMes('BIN 导出失败')
  }
}

const normalizeConfigArray = (configArray: number[] = []) => {
  return CONFIG_MAX_VALUE.map((maxValue, index) => {
    const value = Number(configArray[index])
    if (!Number.isFinite(value)) return index == 4 ? 1 : 0
    return Math.max(0, Math.min(Math.round(value), maxValue))
  })
}

const getCurrentImageConfig = () => {
  const width = Number(
    screenStore.curMode
      ? screenStore.resizeWidth
      : configStore.screenConfig.resizeWidth || screenStore.resizeWidth
  )
  const height = Number(
    screenStore.curMode
      ? screenStore.resizeHeight
      : configStore.screenConfig.resizeHeight || screenStore.resizeHeight
  )
  const configArray = normalizeConfigArray(
    screenStore.curMode
      ? screenStore.configArray
      : configStore.screenConfig.configArray
  )

  return {
    width: Math.max(0, Math.floor(width || 0)),
    height: Math.max(0, Math.floor(height || 0)),
    configArray,
  }
}

const getExpectedDataLength = (
  width: number,
  height: number,
  configArray: number[]
) => {
  if (width <= 0 || height <= 0) return 0
  if (configArray[4] !== 1) return width * height * 2
  return configArray[1] === 0 || configArray[1] === 3
    ? Math.ceil(width / 8) * height
    : Math.ceil(height / 8) * width
}

const extractBraceDataText = (text: string) => {
  const textList = extractTopLevelBraceDataList(text)
  return textList.length > 0 ? textList.join(',') : text
}

const parseResultBytes = (text: string) => {
  const dataText = extractBraceDataText(text)
  const matches = dataText.match(/0x[0-9a-fA-F]+|\d+/g) || []
  return matches
    .map(item =>
      item.toLowerCase().startsWith('0x')
        ? Number.parseInt(item, 16)
        : Number.parseInt(item, 10)
    )
    .filter(value => Number.isFinite(value))
    .map(value => value & 0xff)
}

const getBitMask = (offset: number, configArray: number[]) => {
  return configArray[2] != 0 ? 1 << (7 - offset) : 1 << offset
}

const getReversePoint = (
  bytes: number[],
  byteIndex: number,
  offset: number,
  configArray: number[]
) => {
  const pointValue =
    (bytes[byteIndex] & getBitMask(offset, configArray)) !== 0 ? 0 : 1
  return configArray[0] !== 0 ? (pointValue === 0 ? 1 : 0) : pointValue
}

const setImagePoint = (
  imageData: Uint8ClampedArray,
  width: number,
  x: number,
  y: number,
  value: number
) => {
  const offset = (y * width + x) * 4
  const color = value ? 255 : 0
  imageData[offset] = color
  imageData[offset + 1] = color
  imageData[offset + 2] = color
  imageData[offset + 3] = 255
}

const drawMonoImage = (
  imageData: Uint8ClampedArray,
  bytes: number[],
  width: number,
  height: number,
  configArray: number[]
) => {
  const bytesPerRow = Math.ceil(width / 8)
  const bytesPerCol = Math.ceil(height / 8)

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let byteIndex = 0
      let bitOffset = 0

      switch (configArray[1]) {
        case 0:
          byteIndex = y * bytesPerRow + Math.floor(x / 8)
          bitOffset = x % 8
          break
        case 1:
          byteIndex = x * bytesPerCol + Math.floor(y / 8)
          bitOffset = y % 8
          break
        case 3:
          byteIndex = Math.floor(x / 8) * height + y
          bitOffset = x % 8
          break
        case 2:
        default:
          byteIndex = x + Math.floor(y / 8) * width
          bitOffset = y % 8
          break
      }

      setImagePoint(
        imageData,
        width,
        x,
        y,
        getReversePoint(bytes, byteIndex, bitOffset, configArray)
      )
    }
  }
}

const drawColorImage = (
  imageData: Uint8ClampedArray,
  bytes: number[],
  width: number,
  height: number,
  configArray: number[]
) => {
  for (let index = 0; index < width * height; index++) {
    let highByte = bytes[index * 2]
    let lowByte = bytes[index * 2 + 1]

    if (configArray[0] == 0 || configArray[2] == 1) {
      highByte = ~highByte & 0xff
      lowByte = ~lowByte & 0xff
    }

    const colorValue = (highByte << 8) | lowByte
    let red = ((colorValue >> 11) & 0x1f) << 3
    let green = ((colorValue >> 5) & 0x3f) << 2
    let blue = (colorValue & 0x1f) << 3
    red |= red >> 5
    green |= green >> 6
    blue |= blue >> 5

    const offset = index * 4
    imageData[offset] = red
    imageData[offset + 1] = green
    imageData[offset + 2] = blue
    imageData[offset + 3] = 255
  }
}

const createReverseImage = (
  bytes: number[],
  width: number,
  height: number,
  configArray: number[]
) => {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    XBox.popMes('创建画布失败')
    return ''
  }

  const image = ctx.createImageData(width, height)

  if (configArray[4] === 1) {
    drawMonoImage(image.data, bytes, width, height, configArray)
  } else {
    drawColorImage(image.data, bytes, width, height, configArray)
  }

  ctx.putImageData(image, 0, 0)
  return canvas.toDataURL('image/png')
}

const reverseDrawImage = () => {
  const sourceText = getCurrentSourceText()

  if (!sourceText) {
    XBox.popMes('暂无数据')
    return
  }

  const { width, height, configArray } = getCurrentImageConfig()
  if (width <= 0 || height <= 0) {
    XBox.popMes('请先设置图片尺寸')
    return
  }

  const expectedLength = getExpectedDataLength(width, height, configArray)
  const bytes = parseResultBytes(sourceText)

  if (!expectedLength || bytes.length < expectedLength) {
    XBox.popMes('数据长度不足，无法反绘图片')
    return
  }

  const imageData = createReverseImage(
    bytes.slice(0, expectedLength),
    width,
    height,
    configArray
  )
  if (!imageData) return

  const modeText = configArray[4] === 1 ? '单色' : '彩色'
  const frameText =
    screenStore.curMode && bytes.length > expectedLength
      ? '，已反绘第 1 帧'
      : ''
  reverseImageData.value = imageData
  reverseImageInfo.value = `${width} x ${height}，${modeText}${frameText}`
  reverseImageConfig.value = {
    width,
    height,
    configArray: [...configArray],
  }
  reverseImageShow.value = true
}

const writeReverseImage = () => {
  if (!reverseImageData.value) return
  const imageConfig = reverseImageConfig.value

  if (imageConfig) {
    configStore.screenConfig.resizeWidth = imageConfig.width
    configStore.screenConfig.resizeHeight = imageConfig.height
    configStore.screenConfig.configArray = [...imageConfig.configArray]
  }

  configStore.screenData.baseData = reverseImageData.value
  configStore.screenData.resizeData = reverseImageData.value
  screenStore.setEiditorPicData(reverseImageData.value)
  screenStore.setResizePicData(
    reverseImageData.value.replace(/^data:image\/png;base64,/, '')
  )
  screenStore.setResized(false)
  reverseImageShow.value = false
  XBox.popMes('已写入图片区')
}
</script>

<template>
  <div id="result-data-content">
    <div id="result-data-toolbar">
      <NSpace
        v-if="editorModified || outputBinFile"
        class="result-data-actions"
        align="center"
        :size="6"
      >
        <NTag
          v-if="editorModified"
          size="small"
          type="info"
          :bordered="false"
        >
          已编辑
        </NTag>
        <NTag
          v-if="outputBinFile"
          size="small"
          type="success"
          :bordered="false"
        >
          BIN 输出
        </NTag>
      </NSpace>
      <NSpace
        class="result-toolbar-actions"
        align="center"
        :size="6"
      >
        <NButton
          class="result-toolbar-button"
          size="tiny"
          secondary
          @click="openResultConfig"
        >
          结果配置
        </NButton>
        <NButton
          v-if="outputBinFile"
          class="result-toolbar-button"
          size="tiny"
          secondary
          @click="exportBinFile"
        >
          导出BIN
        </NButton>
        <NButton
          class="result-toolbar-button"
          size="tiny"
          secondary
          @click="reverseDrawImage"
        >
          反绘图片
        </NButton>
        <NButton
          class="result-toolbar-button"
          size="tiny"
          secondary
          @click="copyResult"
        >
          复制全部
        </NButton>
      </NSpace>
    </div>

    <div id="result-editor-body">
      <NScrollbar id="result-data-scrollbar">
        <Codemirror
          v-model:value="resultStrShow"
          :options="cmOptions"
          width="100%"
          height="auto"
          placeholder="生成结果会显示在这里"
          class="result-codemirror"
        />
      </NScrollbar>
    </div>

    <NModal
      v-model:show="resultConfigShow"
      preset="card"
      title="结果配置"
      :bordered="false"
      :style="{ width: '560px', maxWidth: '92vw' }"
    >
      <NForm
        class="result-config-form"
        label-placement="top"
        :show-feedback="false"
      >
        <NGrid
          :cols="2"
          :x-gap="12"
          :y-gap="12"
        >
          <NGridItem
            v-if="screenStore.curMode"
            :span="2"
          >
            <NFormItem label="视频数组输出">
              <NSelect
                v-model:value="resultConfigData.videoArrayMode"
                :disabled="resultConfigData.outputBinFile"
                :options="videoArrayModeOptions"
              />
            </NFormItem>
          </NGridItem>
          <NGridItem :span="2">
            <NFormItem label="最终输出">
              <NCheckbox v-model:checked="resultConfigData.outputBinFile">
                BIN 文件输出（只保留图片数据）
              </NCheckbox>
            </NFormItem>
          </NGridItem>
          <NGridItem :span="2">
            <NFormItem label="数组名">
              <NInput
                v-model:value="resultConfigData.arrayName"
                :disabled="resultConfigData.outputBinFile"
                placeholder="请输入数组名"
              />
            </NFormItem>
          </NGridItem>
          <NGridItem>
            <NFormItem label="数组前缀注释">
              <NInput
                v-model:value="resultConfigData.preComment"
                :disabled="resultConfigData.outputBinFile"
                placeholder="请输入前缀注释"
              />
            </NFormItem>
          </NGridItem>
          <NGridItem>
            <NFormItem label="数组后缀注释">
              <NInput
                v-model:value="resultConfigData.backComment"
                :disabled="resultConfigData.outputBinFile"
                placeholder="请输入后缀注释"
              />
            </NFormItem>
          </NGridItem>
          <NGridItem>
            <NFormItem label="自定义替换">
              <NInput
                v-model:value="resultConfigData.replaceSource1"
                placeholder="正则或文本"
              />
            </NFormItem>
          </NGridItem>
          <NGridItem>
            <NFormItem label="替换数据">
              <NInput
                v-model:value="resultConfigData.replaceTarget1"
                placeholder="替换为"
              />
            </NFormItem>
          </NGridItem>
        </NGrid>
      </NForm>

      <template #action>
        <NSpace justify="end">
          <NButton @click="closeResultConfig">取消</NButton>
          <NButton
            type="primary"
            @click="modifyResultConfig"
          >
            应用配置
          </NButton>
        </NSpace>
      </template>
    </NModal>

    <NModal
      v-model:show="reverseImageShow"
      preset="card"
      title="数据反绘图片"
      :bordered="false"
      :style="{ width: '560px', maxWidth: '92vw' }"
    >
      <div id="reverse-image-preview">
        <img
          v-if="reverseImageData"
          :src="reverseImageData"
          alt=""
        />
      </div>
      <div id="reverse-image-info">{{ reverseImageInfo }}</div>

      <template #action>
        <NSpace justify="end">
          <NButton @click="reverseImageShow = false">关闭</NButton>
          <NButton
            type="primary"
            @click="writeReverseImage"
          >
            写入图片区
          </NButton>
        </NSpace>
      </template>
    </NModal>
  </div>
</template>

<style lang="scss" scoped>
#result-data-content {
  width: 100%;
  height: 100%;
  border: none;
  box-sizing: border-box;
  color: var(--text-color-1);
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow: hidden;

  > div {
    border: none;
  }
}

#result-data-toolbar {
  min-height: 30px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  flex-shrink: 0;
  gap: 8px;
}

.result-data-actions {
  flex-shrink: 0;
}

.result-toolbar-actions {
  flex: 1;
  min-width: 0;
  justify-content: flex-end;
  flex-wrap: nowrap !important;
  overflow: hidden;
}

.result-toolbar-button {
  min-width: 58px;
  height: 24px;
  padding: 0 8px;
  border-radius: var(--comp-radius-2);
  font-size: 12px;
  font-weight: 700;
  line-height: 1;
  box-sizing: border-box;
  flex-shrink: 0;
}

:deep(.result-toolbar-button .n-button__content) {
  line-height: 1;
}

:deep(.result-config-form) {
  .n-form-item {
    margin-top: 0;
  }

  .n-input {
    width: 100%;
  }
}

#result-editor-body {
  flex: 1;
  min-height: 0;
  padding: 3px;
  border-radius: calc(var(--comp-radius-2) + 3px);
  overflow: hidden;
  // background: rgba(73, 74, 77, 0.06);
}

#result-data-scrollbar {
  width: 100%;
  height: 100%;
}

:deep(#result-data-scrollbar > .n-scrollbar-container) {
  // border: 1px solid var(--border-color-1);
  border-radius: calc(var(--comp-radius-2) + 1px);
  background: rgba(255, 255, 255, 0.72);
}

:deep(#result-data-scrollbar .n-scrollbar-content) {
  min-height: 100%;
}

:deep(.codemirror-container) {
  min-height: 100% !important;
  border: none !important;
  border-radius: calc(var(--comp-radius-2) + 1px) !important;
  overflow: visible;
}

:deep(.CodeMirror) {
  height: auto !important;
  min-height: 100% !important;
  border-radius: calc(var(--comp-radius-2) + 1px);
  background: transparent;
  color: var(--text-color-1);
  font-family: Consolas, 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.55;
}

:deep(.CodeMirror-gutters) {
  background: rgba(73, 74, 77, 0.06);
  border-right: 1px solid var(--border-color-1);
  border-radius: calc(var(--comp-radius-2) + 1px) 0 0
    calc(var(--comp-radius-2) + 1px);
}

:deep(.CodeMirror-scroll) {
  height: auto !important;
  min-height: 100% !important;
  overflow: visible !important;
  border-radius: calc(var(--comp-radius-2) + 1px);
}

:deep(.CodeMirror-linenumber) {
  color: var(--text-color-3);
}

:deep(.CodeMirror-lines) {
  padding: 10px 0;
}

:deep(.CodeMirror pre.CodeMirror-line),
:deep(.CodeMirror pre.CodeMirror-line-like) {
  padding: 0 12px;
}

#reverse-image-preview {
  width: 100%;
  height: min(52vh, 420px);
  border-radius: var(--comp-radius-2);
  border: 1px solid var(--border-color-1);
  background: rgba(255, 255, 255, 0.72);
  overflow: auto;
  display: flex;
  justify-content: center;
  align-items: center;

  img {
    max-width: 100%;
    max-height: 100%;
    image-rendering: pixelated;
  }
}

#reverse-image-info {
  margin-top: 10px;
  line-height: 20px;
  font-size: 13px;
  color: var(--text-color-3);
}
</style>
