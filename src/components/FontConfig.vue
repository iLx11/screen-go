<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue'
import { NButton, NInput, NInputNumber, NSelect, NSpace, NTag } from 'naive-ui'
import { XBox } from 'ilx1-x-box'
import { useScreenStore } from '@/stores/store'
import { getUniqueFontText } from '@/utils/tools/fontGenerate'

const screenStore = useScreenStore()
const txtInputRef = ref<HTMLInputElement | null>(null)
const fontInputRef = ref<HTMLInputElement | null>(null)
const importedFontMap = new Map<string, FontFace>()

const fontOptions = ref([
  { label: 'Microsoft YaHei', value: 'Microsoft YaHei' },
  { label: 'SimSun', value: 'SimSun' },
  { label: 'SimHei', value: 'SimHei' },
  { label: 'KaiTi', value: 'KaiTi' },
  { label: 'FangSong', value: 'FangSong' },
  { label: 'Arial', value: 'Arial' },
])

const weightOptions = [
  { label: 'Regular', value: '400' },
  { label: 'Medium', value: '500' },
  { label: 'Bold', value: '700' },
]

const fontFamily = computed({
  get: () => screenStore.fontFamily,
  set: value => screenStore.setFontFamily(value),
})

const fontText = computed({
  get: () => screenStore.fontText,
  set: value => screenStore.setFontText(value || ''),
})

const fontWidth = computed({
  get: () => screenStore.fontWidth,
  set: value => screenStore.setFontWidth(Number(value) || 1),
})

const fontHeight = computed({
  get: () => screenStore.fontHeight,
  set: value => screenStore.setFontHeight(Number(value) || 1),
})

const fontSize = computed({
  get: () => screenStore.fontSize,
  set: value => screenStore.setFontSize(Number(value) || 1),
})

const fontWeight = computed({
  get: () => screenStore.fontWeight,
  set: value => screenStore.setFontWeight(value),
})

const fontOffsetX = computed({
  get: () => screenStore.fontOffsetX,
  set: value => screenStore.setFontOffsetX(Number(value) || 0),
})

const fontOffsetY = computed({
  get: () => screenStore.fontOffsetY,
  set: value => screenStore.setFontOffsetY(Number(value) || 0),
})

const uniqueText = computed(() => getUniqueFontText(fontText.value))
const previewText = computed(() => {
  return uniqueText.value ? Array.from(uniqueText.value).slice(0, 12).join('') : '字体预览'
})
const textCount = computed(() => Array.from(fontText.value).length)

const openTxtFile = () => {
  txtInputRef.value?.click()
}

const openFontFile = () => {
  fontInputRef.value?.click()
}

const readTxtFile = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''

  if (!file) return

  try {
    const text = await file.text()
    const textValue = getUniqueFontText(text)
    if (!textValue) {
      XBox.popMes('TXT 中没有可取模字符')
      return
    }
    screenStore.setFontText(textValue)
    XBox.popMes(`已导入 ${Array.from(textValue).length} 个字符`)
  } catch (error) {
    console.error(error)
    XBox.popMes('读取 TXT 失败')
  }
}

const keepUniqueTextOnly = () => {
  const textValue = getUniqueFontText(fontText.value)
  if (!textValue) return
  screenStore.setFontText(textValue)
}

const getFontNameByFile = (file: File) => {
  return file.name.replace(/\.(ttf|otf|woff2?|ttc)$/i, '').trim() || 'CustomFont'
}

const removeImportedFont = (fontName: string) => {
  const fontFace = importedFontMap.get(fontName)
  if (!fontFace) return
  document.fonts.delete(fontFace)
  importedFontMap.delete(fontName)
}

const readFontFile = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''

  if (!file) return

  try {
    const fontName = getFontNameByFile(file)
    const fontBuffer = await file.arrayBuffer()
    const fontFace = new FontFace(fontName, fontBuffer)
    await fontFace.load()
    removeImportedFont(fontName)
    document.fonts.add(fontFace)
    importedFontMap.set(fontName, fontFace)

    if (!fontOptions.value.some(item => item.value == fontName)) {
      fontOptions.value.unshift({
        label: fontName,
        value: fontName,
      })
    }

    screenStore.setFontFamily(fontName)
    XBox.popMes(`已导入字体：${fontName}`)
  } catch (error) {
    console.error(error)
    XBox.popMes('导入字体失败')
  }
}

onUnmounted(() => {
  importedFontMap.forEach(fontFace => {
    document.fonts.delete(fontFace)
  })
  importedFontMap.clear()
})
</script>

<template>
  <div id="font-config-content">
    <input
      ref="txtInputRef"
      type="file"
      accept=".txt,text/plain"
      class="font-file-input"
      @change="readTxtFile"
    />
    <input
      ref="fontInputRef"
      type="file"
      accept=".ttf,.otf,.woff,.woff2,.ttc,font/ttf,font/otf,font/woff,font/woff2"
      class="font-file-input"
      @change="readFontFile"
    />

    <div id="font-preview-box">
      <div
        class="font-preview-text"
        :style="{
          fontFamily: fontFamily,
          fontWeight: fontWeight,
          fontSize: `${Math.min(fontSize, 42)}px`,
        }"
      >
        {{ previewText }}
      </div>
      <NSpace
        align="center"
        :size="6"
      >
        <NTag
          size="small"
          :bordered="false"
        >
          {{ fontWidth }}x{{ fontHeight }}
        </NTag>
        <NTag
          size="small"
          type="info"
          :bordered="false"
        >
          {{ textCount }} 输入
        </NTag>
      </NSpace>
    </div>

    <div id="font-form-box">
      <div class="font-field">
        <div class="font-field-label">字体</div>
        <NSelect
          v-model:value="fontFamily"
          :options="fontOptions"
          filterable
          tag
          placeholder="选择或输入字体"
        />
      </div>

      <div class="font-number-grid">
        <div class="font-field">
          <div class="font-field-label">字宽</div>
          <NInputNumber
            v-model:value="fontWidth"
            :min="1"
            :step="1"
            :precision="0"
          />
        </div>
        <div class="font-field">
          <div class="font-field-label">字高</div>
          <NInputNumber
            v-model:value="fontHeight"
            :min="1"
            :step="1"
            :precision="0"
          />
        </div>
        <div class="font-field">
          <div class="font-field-label">字号</div>
          <NInputNumber
            v-model:value="fontSize"
            :min="1"
            :step="1"
            :precision="0"
          />
        </div>
        <div class="font-field">
          <div class="font-field-label">字重</div>
          <NSelect
            v-model:value="fontWeight"
            :options="weightOptions"
          />
        </div>
        <div class="font-field">
          <div class="font-field-label">X 偏移</div>
          <NInputNumber
            v-model:value="fontOffsetX"
            :step="1"
            :precision="0"
          />
        </div>
        <div class="font-field">
          <div class="font-field-label">Y 偏移</div>
          <NInputNumber
            v-model:value="fontOffsetY"
            :step="1"
            :precision="0"
          />
        </div>
      </div>

      <div class="font-field">
        <div class="font-field-label">取模字符</div>
        <NInput
          v-model:value="fontText"
          type="textarea"
          placeholder="输入需要取模的字符"
          :autosize="{ minRows: 3, maxRows: 5 }"
          spellcheck="false"
        />
      </div>
    </div>

    <div id="font-action-box">
      <NButton
        secondary
        @click="openFontFile"
      >
        导入字体
      </NButton>
      <NButton
        secondary
        @click="openTxtFile"
      >
        选择 TXT
      </NButton>
      <NButton
        secondary
        @click="keepUniqueTextOnly"
      >
        去重字符
      </NButton>
    </div>
  </div>
</template>

<style scoped lang="scss">
#font-config-content {
  width: 100%;
  height: 100%;
  padding: 0.7em;
  display: flex;
  flex-direction: column;
  gap: 10px;
  color: var(--config-text-color);
  font-weight: var(--config-font-weight);
  background: rgba(255, 255, 255, 0.808);

  > div {
    background: rgba(236, 240, 242, 0.808);
  }
}

.font-file-input {
  display: none;
}

#font-preview-box,
#font-form-box,
#font-action-box {
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.78);
  border: none;
}

#font-preview-box {
  min-height: 108px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 8px;
}

.font-preview-text {
  flex: 1;
  min-height: 48px;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;
  white-space: nowrap;
  color: var(--config-text-color);
}

#font-form-box {
  flex: 1;
  min-height: 0;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.font-number-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px 10px;
}

.font-field {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.font-field-label {
  min-height: 16px;
  line-height: 16px;
  padding-left: 2px;
  color: var(--config-muted-text-color);
  font-size: 12px;
  font-weight: var(--config-font-weight);
}

#font-action-box {
  min-height: 42px;
  padding: 6px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  flex-shrink: 0;
}

:deep(.n-button),
:deep(.n-input),
:deep(.n-input-number),
:deep(.n-base-selection) {
  width: 100%;
  border-radius: 8px;
}

:deep(.n-button__content),
:deep(.n-input__input-el),
:deep(.n-input__textarea-el),
:deep(.n-base-selection-input__content),
:deep(.n-base-selection-placeholder) {
  font-weight: var(--config-font-weight);
}

:deep(.n-input-number .n-input) {
  min-width: 0;
}

:deep(.n-input-number .n-input__input) {
  padding-right: 48px;
}

:deep(.n-input-number .n-input__suffix) {
  width: 44px;
  flex: 0 0 44px;
  justify-content: flex-end;
  gap: 0 !important;
  overflow: hidden;
}

:deep(.n-input-number .n-button) {
  width: 22px;
  min-width: 22px;
  padding: 0 !important;
  flex: 0 0 22px;
}
</style>
