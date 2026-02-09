<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, computed, nextTick } from 'vue'
import { useConfigStore } from '@/stores/configStore'
import Konva from 'konva'
import { base64ToImage } from 'ilx1-x-tool'
import { Stage } from 'konva/lib/Stage'
import { Layer } from 'konva/lib/Layer'
import { Shape } from 'konva/lib/Shape'
import { Context } from 'konva/lib/Context'
import {
  NInputNumber,
  NSelect,
  NButton,
  NGrid,
  NGridItem,
  NSpace,
  NDivider,
  NModal,
  NForm,
  NFormItem,
  NInput,
} from 'naive-ui'

import { debounce } from 'es-toolkit'

const configStore = useConfigStore()

onMounted(() => {
  // 初始化Konva裁剪组件
  initKonvaCrop()
  window.addEventListener('resize', debounceResize)
})

onUnmounted(() => {
  // 组件卸载时，销毁Konva裁剪组件
  if (konvaObj.value.stage) {
    konvaObj.value.stage.destroy()
  }
  window.removeEventListener('resize', debounceResize)
})

const debounceResize = debounce(() => {
  if (konvaObj.value.stage) {
    const containerRect = document
      .getElementById('konva-crop-editor')
      ?.getBoundingClientRect()
    konvaObj.value.stage.width(containerRect.width)
    konvaObj.value.stage.height(containerRect.height)
  }
}, 300)

const konvaObj = ref({
  stage: null,
  layer: null,
  image: null,
  cropRect: null,
  transformer: null,
  cropLayer: null,
})

// 裁剪尺寸控制
const cropWidth = ref(0)
const cropHeight = ref(0)

// 宽高比选择
const aspectRatioOptions = [
  { label: '自由', value: 0 },
  { label: '1:1', value: 1 },
  { label: '4:3', value: 4 / 3 },
  { label: '16:9', value: 16 / 9 },
  { label: '3:4', value: 3 / 4 },
  { label: '9:16', value: 9 / 16 },
  { label: '自定义', value: -1 },
]
const selectedRatio = ref(0)

// 自定义比例输入窗口
const showCustomRatioModal = ref(false)
const customRatio = ref({
  width: 1,
  height: 1,
})

/********************************************************************************
 * @brief: 更新裁剪尺寸显示
 * @return {*}
 ********************************************************************************/
const updateCropSize = () => {
  if (!konvaObj.value.cropRect) return

  const rectInfo = getCropInfo()
  if (rectInfo) {
    cropWidth.value = Math.floor(rectInfo.width)
    cropHeight.value = Math.floor(rectInfo.height)
  }
}

/********************************************************************************
 * @brief: 设置裁剪尺寸
 * @return {*}
 ********************************************************************************/
const setCropSize = () => {
  if (!konvaObj.value.cropRect || !konvaObj.value.image) return

  const rect = konvaObj.value.cropRect
  const image = konvaObj.value.image

  // 计算图片的实际边界
  const imgX = image.x()
  const imgY = image.y()
  const imgW = image.width() * image.scaleX()
  const imgH = image.height() * image.scaleY()

  // 限制尺寸不超过图片范围
  const newWidth = Math.min(cropWidth.value, imgW)
  const newHeight = Math.min(cropHeight.value, imgH)

  // 保持裁剪框居中
  const rectX = rect.x() + (rect.width() * rect.scaleX() - newWidth) / 2
  const rectY = rect.y() + (rect.height() * rect.scaleY() - newHeight) / 2

  // 确保裁剪框在图片范围内
  const finalX = Math.max(imgX, Math.min(rectX, imgX + imgW - newWidth))
  const finalY = Math.max(imgY, Math.min(rectY, imgY + imgH - newHeight))

  // 更新裁剪框属性
  rect.x(finalX)
  rect.y(finalY)
  rect.width(newWidth)
  rect.height(newHeight)
  rect.scaleX(1)
  rect.scaleY(1)

  konvaObj.value.layer.batchDraw()
  konvaObj.value.cropLayer.batchDraw()
}

// 应用宽高比
/********************************************************************************
 * @brief:
 * @return {*}
 ********************************************************************************/
const applySelectedRatio = () => {
  if (selectedRatio.value === -1) {
    // 打开自定义比例输入窗口
    showCustomRatioModal.value = true
    return
  }

  if (selectedRatio.value > 0) {
    applyAspectRatio(selectedRatio.value)
  } else {
    // 自由比例，取消约束
    konvaObj.value.transformer.keepRatio(false)
  }

  // 更新显示的尺寸
  updateCropSize()
}

// 应用自定义比例
const applyCustomRatio = () => {
  if (customRatio.value.width <= 0 || customRatio.value.height <= 0) {
    return
  }

  const ratio = customRatio.value.width / customRatio.value.height
  applyAspectRatio(ratio)
  showCustomRatioModal.value = false
  selectedRatio.value = 0 // 保持自由选择
}

/********************************************************************************
 * @brief: 初始化Konva裁剪组件
 * @return {*}
 ********************************************************************************/
const initKonvaCrop = async () => {
  // 检测图片数据
  if (configStore.screenData.baseData == '') {
    configStore.showPop('请先编辑一张图片')
    return
  }
  const containerRect = document
    .getElementById('konva-crop-editor')
    ?.getBoundingClientRect()
  konvaObj.value.stage = new Konva.Stage({
    container: 'konva-crop-editor',
    width: containerRect?.width || 0,
    height: containerRect?.height || 0,
  })
  const layer = new Konva.Layer()
  console.info(konvaObj.value.stage)

  konvaObj.value.layer = layer

  konvaObj.value.stage.add(konvaObj.value.layer)
  // 图片
  const img = await base64ToImage(configStore.screenData.baseData)
  const scale = Math.min(
    containerRect.width / img.width,
    containerRect.height / img.height,
    1
  )
  const w = img.width * scale
  const h = img.height * scale

  // 居中坐标
  const ix = (containerRect.width - w) / 2
  const iy = (containerRect.height - h) / 2
  konvaObj.value.image = new Konva.Image({
    image: img,
    x: ix,
    y: iy,
    width: w,
    height: h,
    name: 'image',
    draggable: true,
    listening: true,
  })
  konvaObj.value.layer.add(konvaObj.value.image)

  drawCrop({ w, h, ix, iy })

  konvaObj.value.layer.draw()

  applyAspectRatio(1)
  createCropContent()

  // 添加滚轮缩放功能
  addWheelZoom()

  // 更新初始裁剪尺寸
  updateCropSize()

  // 监听裁剪框变化
  konvaObj.value.cropRect.on('transform', updateCropSize)
  konvaObj.value.cropRect.on('dragend', updateCropSize)
}

/********************************************************************************
 * @brief: 添加滚轮缩放功能
 * @return {*}
 ********************************************************************************/
const addWheelZoom = () => {
  if (!konvaObj.value.stage || !konvaObj.value.image) return

  // 限制缩放范围
  const MIN_SCALE = 0.1
  const MAX_SCALE = 5

  konvaObj.value.stage.on('wheel', e => {
    e.evt.preventDefault()

    const scaleBy = 1.1 // 缩放系数
    const stage = konvaObj.value.stage
    const image = konvaObj.value.image

    // 获取鼠标在stage上的位置
    const pointer = stage.getPointerPosition()
    const mouseX = pointer.x
    const mouseY = pointer.y

    // 获取当前缩放比例
    const oldScale = image.scaleX()

    // 计算新的缩放比例
    const direction = e.evt.deltaY > 0 ? 1 : -1
    let newScale = direction > 0 ? oldScale / scaleBy : oldScale * scaleBy

    // 限制缩放范围
    newScale = Math.max(MIN_SCALE, Math.min(newScale, MAX_SCALE))

    // 计算缩放点相对于图片中心的偏移
    const offsetX = mouseX - image.x()
    const offsetY = mouseY - image.y()

    // 计算新的位置，使图片围绕鼠标位置缩放
    const newX = mouseX - offsetX * (newScale / oldScale)
    const newY = mouseY - offsetY * (newScale / oldScale)

    // 更新图片的位置和缩放
    image.scaleX(newScale)
    image.scaleY(newScale)
    image.x(newX)
    image.y(newY)

    // 重新绘制
    konvaObj.value.layer.batchDraw()
    konvaObj.value.cropLayer.batchDraw()
  })
}

/********************************************************************************
 * @brief: 绘制裁剪区域
 * @param {*} w
 * @param {*} h
 * @param {*} ix
 * @param {*} iy
 * @return {*}
 ********************************************************************************/
const drawCrop = ({ w, h, ix, iy }) => {
  konvaObj.value.cropLayer = new Konva.Layer({ id: 'cropLayer' })
  konvaObj.value.stage.add(konvaObj.value.cropLayer)
  // 裁剪区域
  const initialRectW = w * 0.6
  const initialRectH = h * 0.6

  konvaObj.value.cropRect = new Konva.Rect({
    x: ix + (w - initialRectW) / 2,
    y: iy + (h - initialRectH) / 2,
    width: initialRectW,
    height: initialRectH,
    fill: 'rgba(255, 255, 255, 0.3)',
    stroke: '#00D2FF',
    strokeWidth: 2,
    draggable: true,

    dragBoundFunc: function (pos) {
      // pos 是裁剪框尝试移动到的新绝对坐标
      const stageX = konvaObj.value.stage.x()
      const stageY = konvaObj.value.stage.y()
      const stageRight = stageX + konvaObj.value.stage.width()
      const stageBottom = stageY + konvaObj.value.stage.height()

      // 计算裁剪框当前的实际大小 (考虑scale)
      const rectW =
        konvaObj.value.cropRect.width() * konvaObj.value.cropRect.scaleX()
      const rectH =
        konvaObj.value.cropRect.height() * konvaObj.value.cropRect.scaleY()

      // 限制 X
      let newX = pos.x
      if (newX < stageX) newX = stageX
      if (newX + rectW > stageRight) newX = stageRight - rectW

      // 限制 Y
      let newY = pos.y
      if (newY < stageY) newY = stageY
      if (newY + rectH > stageBottom) newY = stageBottom - rectH

      return { x: newX, y: newY }
    },
  })

  konvaObj.value.cropLayer.add(konvaObj.value.cropRect)

  // 调整工具
  konvaObj.value.transformer = new Konva.Transformer({
    nodes: [konvaObj.value.cropRect],
    keepRatio: false, // 默认自由
    rotateEnabled: false, // 禁用旋转简化计算

    // 缩放边界限制 ---
    boundBoxFunc: (oldBox, newBox) => {
      //   // newBox 是尝试变形后的新尺寸和位置
      const stageX = konvaObj.value.stage.x()
      const stageY = konvaObj.value.stage.y()
      const stageRight = stageX + konvaObj.value.stage.width()
      const stageBottom = stageY + konvaObj.value.stage.height()

      // 检查是否超出任意边界
      if (
        newBox.x < stageX ||
        newBox.y < stageY ||
        newBox.x + newBox.width > stageRight ||
        newBox.y + newBox.height > stageBottom
      ) {
        return oldBox // 如果超出，拒绝变化，保持上一次的状态
      }

      // 也可以增加最小尺寸限制
      if (newBox.width < 20 || newBox.height < 20) {
        return oldBox
      }

      return newBox
    },
  })

  konvaObj.value.layer.add(konvaObj.value.transformer)
  konvaObj.value.cropLayer.draw()
}

/********************************************************************************
 * @brief: 应用宽高比
 * @param {*} ratio
 * @return {*}
 ********************************************************************************/
function applyAspectRatio(ratio) {
  if (!konvaObj.value.cropRect) return

  // 获取当前裁剪框的视觉宽度
  const currW =
    konvaObj.value.cropRect.width() * konvaObj.value.cropRect.scaleX()

  // 计算目标高度
  let newH = currW / ratio

  // 检查：如果新的高度导致超出图片底部边界？
  const imgY = konvaObj.value.image.y()
  const imgH = konvaObj.value.image.height() * konvaObj.value.image.scaleY()
  const rectY = konvaObj.value.cropRect.y()

  // 如果 (当前Y + 新H) > (图片Y + 图片H)，说明高度太高了，需要反向计算宽度
  if (rectY + newH > imgY + imgH) {
    // 限制高度为最大可用高度
    newH = imgY + imgH - rectY
    // 反算宽度
    const newW = newH * ratio

    // 设置属性 (重置scale)
    konvaObj.value.cropRect.width(newW)
    konvaObj.value.cropRect.height(newH)
  } else {
    // 高度安全，直接设置
    konvaObj.value.cropRect.width(currW)
    konvaObj.value.cropRect.height(newH)
  }

  // 启用比例锁定
  konvaObj.value.transformer.keepRatio(true)

  konvaObj.value.cropRect.scaleX(1)
  konvaObj.value.cropRect.scaleY(1)

  konvaObj.value.layer.batchDraw()

  // 更新尺寸显示
  updateCropSize()
}

/********************************************************************************
 * @brief: 初始化裁剪框图层
 * @return {*}
 ********************************************************************************/
function createCropContent() {
  // 裁剪框蒙版
  const rect = new Konva.Rect({
    listening: false,
    sceneFunc: (ctx, shape) => drawCropmaskSceneFunc(ctx, shape),
  })

  konvaObj.value.cropLayer.add(rect)
}

/********************************************************************************
 * @brief: 绘制裁剪框蒙版
 * @param {*} ctx
 * @param {*} shape
 * @return {*}
 ********************************************************************************/
function drawCropmaskSceneFunc(ctx: Context, shape: Shape) {
  const { width, height } = konvaObj.value.stage.getSize()
  // 获取实际宽高
  const cropRectInfo = getCropInfo()
  if (!cropRectInfo) return
  const { x, y } = cropRectInfo

  /*绘画顺时针外部正方形*/
  ctx.save()
  ctx.moveTo(0, 0) // 起点
  ctx.lineTo(width, 0) // 第一条线
  ctx.lineTo(width, height) // 第二条p线
  ctx.lineTo(0, height) // 第三条线
  ctx.closePath() // 结束路径，自动闭合

  /*填充颜色*/
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)'
  ctx.fill()

  ctx.restore()

  // 清空 crop 区域
  ctx.clearRect(x, y, cropRectInfo.width, cropRectInfo.height)

  // 在左上角位置 绘制宽高信息
  const text = `${Math.floor(cropRectInfo.width)} x ${Math.floor(
    cropRectInfo.height
  )}`

  ctx.save()
  ctx.font = '12px Arial'
  const textWidth = getTextWidth(ctx._context, text)
  const textHeight = getTextHeight(ctx._context, text)
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
  ctx.fillRect(x, y - textHeight - 20, textWidth + 10, textHeight + 10)
  ctx.fillStyle = 'white'
  ctx.fillText(text, x + 5, y - 20 + textHeight / 2)
  ctx.restore()

  ctx.fillStrokeShape(shape)
}

/********************************************************************************
 * @brief: 获取裁剪框位置信息
 * @return {*}
 ********************************************************************************/
function getCropInfo() {
  return konvaObj.value.cropRect.getClientRect()
}

/********************************************************************************
 * @brief: 计算文本宽度
 * @param {*} ctx
 * @param {*} text
 * @return {*}
 ********************************************************************************/
function getTextWidth(ctx: CanvasRenderingContext2D, text: string) {
  return ctx.measureText(text).width
}

/********************************************************************************
 * @brief: 计算文本高度
 * @param {*} ctx
 * @param {*} text
 * @return {*}
 ********************************************************************************/
function getTextHeight(ctx: CanvasRenderingContext2D, text: string) {
  const metrics = ctx.measureText(text)
  return metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent
}

/********************************************************************************
 * @brief: 获取裁剪结果
 * @param {*} type
 * @param {*} pixelRatio
 * @param {*} mimeType
 * @return {*}
 ********************************************************************************/
const getCropResult = (
  type: 'string' | 'blob' | 'canvas' = 'string',
  pixelRatio = 1,
  mimeType: 'png' | 'jpeg' = 'png'
) => {
  // 通过复制图层实现
  const stageClone = konvaObj.value.stage.clone()
  // return
  // 删除 transformer
  const mainLayer = stageClone.findOne('#cropLayer')

  mainLayer.findOne('Transformer')?.remove()

  const cropAttrs = getCropInfo()

  if (type === 'canvas') {
    return stageClone.toCanvas({ ...cropAttrs, pixelRatio })
  }

  const base64String = stageClone.toDataURL({
    ...cropAttrs,
    pixelRatio,
    mimeType: `image/${mimeType}`,
  })

  configStore.screenData.resizeData = base64String

  if (type === 'string') {
    return base64String
  }
}
</script>

<template>
  <div class="konva-crop-container">
    <div id="konva-crop-editor"></div>
    <div class="konva-crop-control">
      <div class="crop-size-container">
        <div class="control-title">裁剪尺寸</div>
        <div class="crop-size-content">
          <div class="crop-size">
            <NInputNumber
              v-model:value="cropWidth"
              :min="10"
              :max="10000"
              :step="1"
              placeholder="宽度"
              style="width: 100%"
            />
            <!-- <span class="size-separator">x</span> -->
            <NInputNumber
              v-model:value="cropHeight"
              :min="10"
              :max="10000"
              :step="1"
              placeholder="高度"
            />
          </div>
          <div
            class="crop-button"
            @click="setCropSize"
          >
            应用
          </div>
        </div>
      </div>

      <div class="crop-ratio-container">
        <div class="control-title">宽高比</div>
        <div class="crop-ratio-content">
          <NSelect
            v-model:value="selectedRatio"
            :options="aspectRatioOptions"
            placeholder="选择比例"
            @update:value="applySelectedRatio"
          />
          <div
            class="crop-button"
            @click="getCropResult"
          >
            完成裁剪
          </div>
        </div>
      </div>
    </div>

    <!-- 自定义比例输入窗口 -->
    <NModal
      v-model:show="showCustomRatioModal"
      preset="card"
      title="自定义宽高比"
      style="width: 50%"
    >
      <NForm>
        <NFormItem label="宽度">
          <NInputNumber
            v-model:value="customRatio.width"
            :min="1"
            :step="1"
            placeholder="请输入宽度"
            style="width: 100%"
          />
        </NFormItem>
        <NFormItem label="高度">
          <NInputNumber
            v-model:value="customRatio.height"
            :min="1"
            :step="1"
            placeholder="请输入高度"
            style="width: 100%"
          />
        </NFormItem>
      </NForm>
      <template #action>
        <NSpace>
          <NButton
            type="default"
            @click="showCustomRatioModal = false"
            >取消</NButton
          >
          <NButton
            type="primary"
            @click="applyCustomRatio"
            >应用</NButton
          >
        </NSpace>
      </template>
    </NModal>
  </div>
</template>
<style lang="scss" scoped>
.konva-crop-container {
  @include global.wh(80%, 90%);
  @include global.ab-center;
  z-index: var(--z-index-3);
  background-color: rgba(27, 27, 27, 0.226);
  backdrop-filter: blur(12px);
  padding: 24px;
  @include global.grid-config(auto, 1fr 140px, 20px);
  @include global.comm-box;
  // Konva画布容器
  #konva-crop-editor {
    @include global.full-wh;
    border-radius: 8px;
    overflow: hidden;
  }

  // 控制面板
  .konva-crop-control {
    padding: 16px;
    background-color: rgba(255, 255, 255, 0.4);
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    @include global.grid-config(1fr 1fr, 1fr, 20px);
    overflow-y: scroll;

    .control-title {
      font-size: 14px;
      font-weight: 600;
      color: #333;
      text-align: left;
    }
    .crop-button {
      @include global.full-wh;
      @include global.style-common(2px, rgba(51, 51, 51, 0.3));
      @include global.flex-center;
      cursor: pointer;
    }

    .crop-size-container {
      @include global.grid-config(auto, 20px 1fr, 10px);
      .crop-size-content {
        @include global.flex-config(1, space-between, 10px);
        .crop-size {
          @include global.grid-config(1fr 1fr, 1fr, 8px);
          .n-input-number {
            @include global.full-wh;
          }
        }
      }
    }

    .crop-ratio-container {
      @include global.grid-config(auto, 20px 1fr, 10px);
      .crop-ratio-content {
        .n-select {
          @include global.full-wh;
        }
        @include global.flex-config(1, space-between, 10px);
      }
    }

    .size-separator {
      font-size: 16px;
      font-weight: 600;
      color: #666;
    }
  }
}
</style>
