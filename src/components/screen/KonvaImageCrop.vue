<template>
  <!-- 裁剪容器：NativeUI风格，外层溢出隐藏 -->
  <div class="konva-crop-container" :style="{ width: canvasWidth }">
    <!-- Konva画布挂载容器 -->
    <div ref="cropCanvasRef" class="konva-crop-canvas"></div>
    <!-- 新增：尺寸/比例设置+操作按钮组（NativeUI扁平化布局） -->
    <div class="konva-crop-control">
      <!-- 宽高输入区 -->
      <div class="crop-size-input">
        <NSpace>
          <span>裁剪尺寸：</span>
          <NInput
            v-model:value="cropWidth"
            type="number"
            placeholder="宽度(px)"
            size="small"
            :disabled="isLoading || !isImageLoaded"
            @change="handleSizeInputChange('width')"
          />
          <span>px ×</span>
          <NInput
            v-model:value="cropHeight"
            type="number"
            placeholder="高度(px)"
            size="small"
            :disabled="isLoading || !isImageLoaded"
            @change="handleSizeInputChange('height')"
          />
          <span>px</span>
        </NSpace>
      </div>

      <!-- 比例控制区 -->
      <div class="crop-ratio-control">
        <NSpace>
          <span>比例：</span>
          <!-- 预设比例选择 -->
          <NSelect
            v-model:value="selectedRatio"
            size="small"
            :disabled="isLoading || !isImageLoaded || !lockRatio"
            @update:value="handlePresetRatioChange"
          >
            <option value="1:1">1:1</option>
            <option value="4:3">4:3</option>
            <option value="16:9">16:9</option>
            <option value="custom">自定义</option>
          </NSelect>
          <!-- 自定义比例输入（仅选中custom时显示） -->
          <NSpace v-if="selectedRatio === 'custom'" class="custom-ratio-input">
            <NInput
              v-model:value="customRatioW"
              type="number"
              placeholder="宽"
              size="small"
              :disabled="isLoading || !isImageLoaded || !lockRatio"
              style="width: 60px"
            />
            <span>:</span>
            <NInput
              v-model:value="customRatioH"
              type="number"
              placeholder="高"
              size="small"
              :disabled="isLoading || !isImageLoaded || !lockRatio"
              style="width: 60px"
            />
            <NButton
              size="small"
              @click="handleCustomRatioConfirm"
              :disabled="isLoading || !isImageLoaded || !lockRatio"
            >
              确认
            </NButton>
          </NSpace>
          <!-- 比例锁定开关 -->
          <NSwitch
            v-model:value="lockRatio"
            :disabled="isLoading || !isImageLoaded"
            size="small"
          >
            <template #checked-text>锁定</template>
            <template #unchecked-text>解锁</template>
          </NSwitch>
        </NSpace>
      </div>

      <!-- 操作按钮组 -->
      <div class="konva-crop-btns">
        <NSpace>
          <NButton
            size="small"
            @click="handleReset"
            :disabled="isLoading || !isImageLoaded"
            secondary
          >
            重置
          </NButton>
          <NButton
            size="small"
            type="primary"
            @click="handleCrop"
            :disabled="isLoading || !isImageLoaded"
          >
            <span v-if="isLoading">裁剪中...</span>
            <span v-else>确认裁剪</span>
          </NButton>
        </NSpace>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, defineProps, defineEmits, computed, nextTick } from 'vue'
import Konva from 'konva'
import type { Stage, Layer, Image, Rect, Transformer } from 'konva'
import { NInput, NSelect, NSwitch, NButton, NSpace } from 'naive-ui'

// ---------------------- 1. TS类型+Props/Emit定义（兼容原有，新增比例锁定默认值） ----------------------
interface CropProps {
  modelValue: string; // 入参：裁剪图片Base64（必传）
  canvasWidth?: string; // 画布宽度，支持px/%/em
  aspectRatio?: [number, number] | null; // 默认比例，传null则自由比例
  minCropSize?: number; // 裁剪最小尺寸（px）
  defaultCropWH?: [number, number]; // 新增：默认裁剪宽高（画布像素），不传则取画布80%
}

const emit = defineEmits<{
  (e: 'crop-success', base64: string): void;
  (e: 'crop-fail', error: string): void;
  (e: 'update:modelValue', base64: string): void;
}>()

const props = withDefaults(defineProps<CropProps>(), {
  canvasWidth: '100%',
  aspectRatio: () => [1, 1], // 默认1:1
  minCropSize: 50,
  defaultCropWH: () => [0, 0], // 0则自动计算
})

// ---------------------- 2. 响应式数据（新增输入框/比例相关，保留原有核心） ----------------------
const cropCanvasRef = ref<HTMLDivElement | null>(null)
const isLoading = ref<boolean>(false)
const originalImage = ref<HTMLImageElement | null>(null)
const isImageLoaded = ref<boolean>(false) // 新增：图片是否加载完成（控制输入框禁用）
// Konva实例
const konvaInstance = ref<{
  stage: Stage | null; layer: Layer | null; imgNode: Image | null;
  cropRect: Rect | null; mask: Rect | null; transformer: Transformer | null;
}>({ stage: null, layer: null, imgNode: null, cropRect: null, mask: null, transformer: null })

// 新增：输入框/比例相关响应式数据
const cropWidth = ref<number>(0) // 裁剪宽度输入值（画布像素）
const cropHeight = ref<number>(0) // 裁剪高度输入值（画布像素）
const lockRatio = ref<boolean>(!!props.aspectRatio) // 比例锁定开关，默认跟随props
const selectedRatio = ref<string>('1:1') // 预设比例选择（1:1/4:3/16:9/custom）
const customRatioW = ref<number>(1) // 自定义比例-宽
const customRatioH = ref<number>(1) // 自定义比例-高

// 计算属性：核心联动/校验（新增）
const calcAspectRatio = computed((): number => {
  // 锁定比例时，返回当前比例（预设/自定义）；未锁定则返回0（自由比例）
  if (!lockRatio.value) return 0
  if (selectedRatio.value !== 'custom') {
    const [w, h] = selectedRatio.value.split(':').map(Number)
    return w / h || 1
  }
  // 自定义比例：避免除零
  return customRatioW.value && customRatioH.value ? customRatioW.value / customRatioH.value : 1
})
const canvasImgSize = computed((): { w: number; h: number; x: number; y: number } => {
  // 计算原图在画布中的实际绘制尺寸/坐标（用于限制裁剪框边界）
  const { imgNode } = konvaInstance.value
  if (!imgNode) return { w: 0, h: 0, x: 0, y: 0 }
  return {
    w: imgNode.width(),
    h: imgNode.height(),
    x: imgNode.x(),
    y: imgNode.y(),
  }
})
const maxCropSize = computed((): { w: number; h: number } => {
  // 裁剪框最大可设置尺寸（画布像素，不超出原图）
  return {
    w: canvasImgSize.value.w,
    h: canvasImgSize.value.h,
  }
})

// ---------------------- 3. 工具函数（保留Base64转Image，新增数值校验/同步函数） ----------------------
// Base64转Image（原有）
const base64ToImage = async (base64: string): Promise<HTMLImageElement> => {
  if (!base64.startsWith('data:image/')) throw new Error('非有效图片Base64')
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Base64图片加载失败'))
    img.src = base64
  })
}
// 新增：数值校验（过滤非数字、限制最小/最大值）
const validateNumber = (value: number, type: 'width' | 'height'): number => {
  const min = props.minCropSize
  const max = type === 'width' ? maxCropSize.value.w : maxCropSize.value.h
  // 过滤非数字、小于最小值→取最小值；大于最大值→取最大值
  let val = isNaN(value) || value < min ? min : value
  val = val > max ? max : val
  return Math.floor(val) // 取整，避免小数像素
}
// 新增：输入框数值同步到裁剪框（核心联动）
const syncInputToCropRect = () => {
  const { cropRect, mask, transformer } = konvaInstance.value
  if (!cropRect || !mask || !transformer) return
  // 校验宽高
  const w = validateNumber(cropWidth.value, 'width')
  const h = validateNumber(cropHeight.value, 'height')
  // 锁定比例时，按比例修正（避免手动输入破坏比例）
  const finalW = lockRatio.value ? w : w
  const finalH = lockRatio.value ? Math.floor(w / calcAspectRatio.value) : h
  // 再次校验修正后的高度
  const fixedH = validateNumber(finalH, 'height')
  // 更新裁剪框尺寸
  cropRect.size({ width: finalW, height: fixedH })
  // 限制裁剪框位置（不超出原图）
  const maxX = canvasImgSize.value.x + canvasImgSize.value.w - finalW
  const maxY = canvasImgSize.value.y + canvasImgSize.value.h - fixedH
  const newX = Math.max(canvasImgSize.value.x, Math.min(cropRect.x(), maxX))
  const newY = Math.max(canvasImgSize.value.y, Math.min(cropRect.y(), maxY))
  cropRect.position({ x: newX, y: newY })
  // 更新遮罩和缩放控制器
  // 修复：clipPath是属性不是方法
  if (mask.clipPath) {
    mask.clipPath.size({ width: finalW, height: fixedH })
    mask.clipPath.position({ x: newX, y: newY })
  }
  transformer.updateSize()
  // 刷新图层
  konvaInstance.value.layer?.batchDraw()
  // 同步回输入框（避免修正后数值不一致）
  cropWidth.value = finalW
  cropHeight.value = fixedH
}
// 新增：裁剪框尺寸/位置同步到输入框（拖动/缩放后联动）
const syncCropRectToInput = () => {
  const { cropRect } = konvaInstance.value
  if (!cropRect) return
  // 裁剪框数值同步到输入框（取整）
  cropWidth.value = Math.floor(cropRect.width())
  cropHeight.value = Math.floor(cropRect.height())
}

// ---------------------- 4. 核心：初始化Konva画布+裁剪框（改造，新增输入框初始值） ----------------------
const initKonva = (img: HTMLImageElement) => {
  if (!cropCanvasRef.value) return
  destroyKonva()
  const canvasDom = cropCanvasRef.value
  const canvasW = canvasDom.clientWidth
  const canvasH = Math.min(canvasW * (img.height / img.width), window.innerHeight * 0.6)

  // 创建舞台/图层/原图节点（原有逻辑）
  const stage = new Konva.Stage({ container: canvasDom, width: canvasW, height: canvasH, draggable: false })
  const layer = new Konva.Layer()
  stage.add(layer)
  const imgScale = Math.min(canvasW / img.width, canvasH / img.height)
  const imgDrawW = img.width * imgScale
  const imgDrawH = img.height * imgScale
  const imgX = (canvasW - imgDrawW) / 2
  const imgY = (canvasH - imgDrawH) / 2
  const imgNode = new Konva.Image({ image: img, x: imgX, y: imgY, width: imgDrawW, height: imgDrawH })
  layer.add(imgNode)

  // 计算裁剪框初始尺寸（优先props.defaultCropWH，否则取画布80%）
  let initCropW = props.defaultCropWH[0] || Math.min(canvasW * 0.8, imgDrawW)
  let initCropH = props.defaultCropWH[1] || Math.min(canvasH * 0.8, imgDrawH)
  // 按比例修正初始尺寸
  if (lockRatio.value) initCropH = initCropW / calcAspectRatio.value
  // 校验初始尺寸
  initCropW = validateNumber(initCropW, 'width')
  initCropH = validateNumber(initCropH, 'height')
  // 裁剪框初始位置（居中）
  const initCropX = imgX + (imgDrawW - initCropW) / 2
  const initCropY = imgY + (imgDrawH - initCropH) / 2

  // 创建裁剪框/遮罩/缩放控制器（原有+改造）
  const cropRect = new Konva.Rect({
    x: initCropX, y: initCropY, width: initCropW, height: initCropH,
    stroke: '#ffffff', strokeWidth: 2, fill: 'transparent', draggable: true
  })
  const mask = new Konva.Rect({
    x: 0, y: 0, width: canvasW, height: canvasH, fill: 'rgba(0,0,0,0.5)',
    clipPath: new Konva.Rect({ x: initCropX, y: initCropY, width: initCropW, height: initCropH })
  })
  const transformer = new Konva.Transformer({
    node: cropRect, anchorSize: 8, stroke: '#ffffff', fill: '#1677ff', strokeWidth: 1,
    resizeAnchorThreshold: 10, aspectRatio: calcAspectRatio.value || undefined
  })
  // 调整添加顺序：确保遮罩在最底层，裁剪框和变压器在上面
  layer.add(mask, cropRect, transformer)

  // 裁剪框拖拽/缩放事件（改造：新增输入框同步）
  const handleCropTransform = () => {
    const { cropRect, transformer, mask } = konvaInstance.value
    if (!cropRect || !transformer || !mask) return
    // 原有边界/最小尺寸限制
    const minW = props.minCropSize
    const minH = lockRatio.value ? minW / calcAspectRatio.value : minW
    if (cropRect.width() < minW) cropRect.width(minW)
    if (cropRect.height() < minH) cropRect.height(minH)
    const maxX = imgX + imgDrawW - cropRect.width()
    const maxY = imgY + imgDrawH - cropRect.height()
    const newX = Math.max(imgX, Math.min(cropRect.x(), maxX))
    const newY = Math.max(imgY, Math.min(cropRect.y(), maxY))
    cropRect.position({ x: newX, y: newY })
    // 更新遮罩
    if (mask.clipPath) {
      mask.clipPath.position({ x: newX, y: newY })
      mask.clipPath.size({ width: cropRect.width(), height: cropRect.height() })
    }
    // 新增：裁剪框变化后，同步数值到输入框
    syncCropRectToInput()
    // 刷新
    layer.batchDraw()
  }
  
  // 添加实时拖动事件
  const handleCropDragMove = () => {
    const { cropRect, mask } = konvaInstance.value
    if (!cropRect || !mask) return
    
    // 限制拖动边界
    const maxX = imgX + imgDrawW - cropRect.width()
    const maxY = imgY + imgDrawH - cropRect.height()
    const newX = Math.max(imgX, Math.min(cropRect.x(), maxX))
    const newY = Math.max(imgY, Math.min(cropRect.y(), maxY))
    
    // 更新位置
    cropRect.position({ x: newX, y: newY })
    // 修复：clipPath是属性不是方法
    if (mask.clipPath) {
      mask.clipPath.position({ x: newX, y: newY })
    }
    
    // 刷新
    layer.batchDraw()
  }
  
  cropRect.on('dragmove', handleCropDragMove)
  cropRect.on('dragend', handleCropTransform)
  transformer.on('transformend', handleCropTransform)

  // 保存实例
  konvaInstance.value = { stage, layer, imgNode, cropRect, mask, transformer }
  stage.batchDraw()
  // 新增：初始化输入框数值
  cropWidth.value = initCropW
  cropHeight.value = initCropH
  isImageLoaded.value = true
  // 初始化比例选择（匹配props.aspectRatio）
  if (props.aspectRatio) {
    const [w, h] = props.aspectRatio
    const ratioStr = `${w}:${h}`
    const presetRatios = ['1:1', '4:3', '16:9']
    selectedRatio.value = presetRatios.includes(ratioStr) ? ratioStr : 'custom'
    if (selectedRatio.value === 'custom') {
      customRatioW.value = w
      customRatioH.value = h
    }
  }
}

// ---------------------- 5. 新增：输入框/比例相关事件处理（核心联动） ----------------------
// 宽高输入框变化事件
const handleSizeInputChange = (type: 'width' | 'height') => {
  if (!lockRatio.value) {
    // 未锁定比例：直接同步裁剪框
    syncInputToCropRect()
    return
  }
  // 锁定比例：改一个值，另一个按比例自动计算
  if (type === 'width') {
    const validW = validateNumber(cropWidth.value, 'width')
    cropHeight.value = Math.floor(validW / calcAspectRatio.value)
  } else {
    const validH = validateNumber(cropHeight.value, 'height')
    cropWidth.value = Math.floor(validH * calcAspectRatio.value)
  }
  // 同步到裁剪框
  syncInputToCropRect()
}
// 预设比例选择变化
const handlePresetRatioChange = () => {
  if (selectedRatio.value === 'custom') return
  // 预设比例赋值到自定义比例（方便联动）
  const [w, h] = selectedRatio.value.split(':').map(Number)
  customRatioW.value = w
  customRatioH.value = h
  // 按新比例修正裁剪框
  handleSizeInputChange('width')
}
// 自定义比例确认
const handleCustomRatioConfirm = () => {
  if (!customRatioW.value || !customRatioH.value) {
    emit('crop-fail', '自定义比例宽高不能为0')
    return
  }
  // 按自定义比例修正裁剪框
  handleSizeInputChange('width')
}
// 监听比例锁定开关变化（同步缩放控制器比例）
watch(lockRatio, (newVal) => {
  const { transformer } = konvaInstance.value
  if (!transformer) return
  // 锁定→设置比例；解锁→移除比例
  transformer.aspectRatio(newVal ? calcAspectRatio.value : undefined)
  transformer.updateSize()
  // 锁定时，重新按比例修正裁剪框
  if (newVal) handleSizeInputChange('width')
})

// ---------------------- 6. 核心：裁剪逻辑（修复，确保正确处理坐标和缩放） ----------------------
const handleCrop = async () => {
  try {
    isLoading.value = true
    const { stage, imgNode, cropRect } = konvaInstance.value
    if (!stage || !imgNode || !cropRect || !originalImage.value) {
      throw new Error('画布初始化失败，请重新传入Base64')
    }
    // 画布坐标→原图实际像素坐标（反推缩放，保证清晰度）
    const cropX = cropRect.x()
    const cropY = cropRect.y()
    const cropW = cropRect.width()
    const cropH = cropRect.height()
    const imgScale = imgNode.scaleX()
    const originalImg = originalImage.value
    
    // 计算实际裁剪区域（修复坐标计算）
    const realCropX = (cropX - imgNode.x()) / imgScale
    const realCropY = (cropY - imgNode.y()) / imgScale
    const realCropW = cropW / imgScale
    const realCropH = cropH / imgScale
    
    // 确保裁剪区域在原图范围内
    const safeCropX = Math.max(0, realCropX)
    const safeCropY = Math.max(0, realCropY)
    const safeCropW = Math.min(originalImg.width - safeCropX, realCropW)
    const safeCropH = Math.min(originalImg.height - safeCropY, realCropH)
    
    // 校验
    if (safeCropW < props.minCropSize || safeCropH < props.minCropSize) {
      throw new Error(`裁剪区域过小，最小尺寸为${props.minCropSize}px`)
    }
    
    // 绘制临时Canvas
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas上下文创建失败')
    
    canvas.width = Math.floor(safeCropW)
    canvas.height = Math.floor(safeCropH)
    
    // 执行裁剪
    ctx.drawImage(
      originalImg, 
      safeCropX, safeCropY, safeCropW, safeCropH, 
      0, 0, canvas.width, canvas.height
    )
    
    // 生成Base64
    const cropBase64 = canvas.toDataURL('image/png', 1.0)
    emit('crop-success', cropBase64)
    emit('update:modelValue', cropBase64)
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : '图片裁剪失败'
    emit('crop-fail', errMsg)
    console.error('裁剪失败：', error)
  } finally {
    isLoading.value = false
  }
}

// ---------------------- 7. 重置逻辑（修复，确保完全重置） ----------------------
const handleReset = () => {
  if (originalImage.value) {
    isImageLoaded.value = false
    // 重置所有状态
    lockRatio.value = !!props.aspectRatio
    selectedRatio.value = props.aspectRatio ? `${props.aspectRatio[0]}:${props.aspectRatio[1]}` : '1:1'
    if (props.aspectRatio) {
      customRatioW.value = props.aspectRatio[0]
      customRatioH.value = props.aspectRatio[1]
    } else {
      customRatioW.value = 1
      customRatioH.value = 1
    }
    // 重新初始化
    initKonva(originalImage.value)
  }
}

// ---------------------- 8. 销毁逻辑（原有，完善） ----------------------
const destroyKonva = () => {
  const { stage, cropRect, transformer } = konvaInstance.value
  cropRect?.off('dragend')
  transformer?.off('transformend')
  stage?.destroy()
  konvaInstance.value = { stage: null, layer: null, imgNode: null, cropRect: null, mask: null, transformer: null }
  isImageLoaded.value = false
  cropWidth.value = 0
  cropHeight.value = 0
}

// ---------------------- 9. 生命周期+监听（原有，完善） ----------------------
onMounted(async () => {
  if (props.modelValue) {
    try {
      originalImage.value = await base64ToImage(props.modelValue)
      initKonva(originalImage.value)
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'Base64加载失败'
      emit('crop-fail', errMsg)
    }
  }
})
onUnmounted(() => {
  destroyKonva()
  originalImage.value = null
  isImageLoaded.value = false
})
watch(() => props.modelValue, async (newBase64) => {
  if (!newBase64) return
  try {
    isImageLoaded.value = false
    originalImage.value = await base64ToImage(newBase64)
    initKonva(originalImage.value)
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'Base64更新失败'
    emit('crop-fail', errMsg)
  }
}, { immediate: false })


</script>

<style lang="scss" scoped>
// NativeUI风格变量：统一配色、间距、圆角
$primary-color: #1677ff;
$secondary-color: #f3f4f6;
$text-color: #374151;
$text-light: #6b7280;
$border-color: #e5e7eb;
$radius: 4px;
$spacing: 8px;
$input-height: 32px;

.konva-crop-container {
  @include global.wh(90%, 90%);
  @include global.ab-center;
  box-sizing: border-box;
  z-index: var(--z-index-3);
  background-color: rgba(255, 255, 255, 0.3);
  backdrop-filter: blur(8px);
  padding: 24px;

  // Konva画布容器
  .konva-crop-canvas {
    width: 100%;
    min-height: 200px;
    border: 1px solid $border-color;
    background-color: #f9fafb;
    border-radius: $radius;
    box-sizing: border-box;
  }

  // 新增：控制区（宽高输入+比例+按钮）- Flex布局，NativeUI扁平化
  .konva-crop-control {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 16px;
    padding: 16px;
    box-sizing: border-box;
    background-color: #fff;
    border-top: 1px solid $border-color;
    border-radius: 0 0 $radius $radius;

    .input-label {
      font-size: 14px;
      color: $text-color;
      white-space: nowrap;
    }

    // 宽高输入区
    .crop-size-input {
      display: flex;
      align-items: center;
      gap: 4px;

      .size-input {
        width: 80px;
        height: $input-height;
        padding: 0 8px;
        border: 1px solid $border-color;
        border-radius: $radius;
        font-size: 14px;
        color: $text-color;
        outline: none;
        box-sizing: border-box;
        &:disabled {
          background-color: #f9fafb;
          cursor: not-allowed;
        }
        &:focus {
          border-color: $primary-color;
        }
      }

      .input-unit {
        font-size: 14px;
        color: $text-light;
      }
    }

    // 比例控制区
    .crop-ratio-control {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;

      .ratio-select, .ratio-input {
        height: $input-height;
        padding: 0 8px;
        border: 1px solid $border-color;
        border-radius: $radius;
        font-size: 14px;
        color: $text-color;
        outline: none;
        box-sizing: border-box;
        background-color: #fff;
        &:disabled {
          background-color: #f9fafb;
          cursor: not-allowed;
        }
        &:focus {
          border-color: $primary-color;
        }
      }

      .ratio-select {
        min-width: 80px;
        cursor: pointer;
      }

      .custom-ratio-input {
        display: flex;
        align-items: center;
        gap: 4px;

        .ratio-input {
          width: 50px;
          text-align: center;
        }

        .confirm-ratio-btn {
          height: $input-height;
          padding: 0 12px;
          border: none;
          border-radius: $radius;
          background-color: $primary-color;
          color: #fff;
          font-size: 12px;
          cursor: pointer;
          &:disabled {
            opacity: 0.6;
            cursor: not-allowed;
          }
        }
      }

      // 比例锁定开关（NativeUI风格）
      .ratio-lock-switch {
        display: flex;
        align-items: center;
        gap: 6px;
        cursor: pointer;
        font-size: 14px;
        color: $text-color;

        input {
          display: none;
        }

        .switch-slider {
          position: relative;
          width: 36px;
          height: 20px;
          background-color: $border-color;
          border-radius: 10px;
          transition: background-color 0.2s;
          &::after {
            content: '';
            position: absolute;
            top: 2px;
            left: 2px;
            width: 16px;
            height: 16px;
            background-color: #fff;
            border-radius: 50%;
            transition: transform 0.2s;
          }
        }

        input:checked + .switch-slider {
          background-color: $primary-color;
        }

        input:checked + .switch-slider::after {
          transform: translateX(16px);
        }

        .switch-label {
          white-space: nowrap;
        }
      }
    }

    // 操作按钮组
    .konva-crop-btns {
      margin-left: auto; // 右对齐
      display: flex;
      gap: 16px;

      .crop-btn {
        padding: 0 20px;
        height: $input-height;
        border: none;
        border-radius: $radius;
        font-size: 14px;
        cursor: pointer;
        transition: background-color 0.2s;
        &:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      }

      .reset-btn {
        background-color: $secondary-color;
        color: $text-color;
        &:hover:not(:disabled) {
          background-color: #e5e7eb;
        }
      }

      .confirm-btn {
        background-color: $primary-color;
        color: #fff;
        &:hover:not(:disabled) {
          background-color: #0d66e6;
        }
      }
    }
  }
}

// 响应式：小屏幕下控制区自动换行
@media (max-width: 768px) {
  .konva-crop-control {
    .konva-crop-btns {
      margin-left: 0;
      width: 100%;
      justify-content: flex-end;
    }
  }
}
</style>