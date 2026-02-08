<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, computed, nextTick } from 'vue'
import { useConfigStore } from '@/stores/configStore'
import Konva from 'konva'
import { base64ToImage } from 'ilx1-x-tool'
import { Stage } from 'konva/lib/Stage'
import { Layer } from 'konva/lib/Layer'
import { Shape } from 'konva/lib/Shape'
import { Context } from 'konva/lib/Context'

const configStore = useConfigStore()

onMounted(() => {
  // 初始化Konva裁剪组件
  initKonvaCrop()
})

const konvaObj = ref({
  stage: null,
  layer: null,
  image: null,
  cropRect: null,
  transformer: null,
  CropLayer: null,
})

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
    // listening: false,
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
}

// 添加滚轮缩放功能
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
    konvaObj.value.CropLayer.batchDraw()
  })
}

const drawCrop = ({ w, h, ix, iy }) => {
  konvaObj.value.CropLayer = new Konva.Layer({ id: 'CropLayer' })
  konvaObj.value.stage.add(konvaObj.value.CropLayer)
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

    // 拖拽边界限制 ---
    // dragBoundFunc: function (pos) {
    //   // pos 是裁剪框尝试移动到的新绝对坐标
    //   const imgX = konvaObj.value.image.x()
    //   const imgY = konvaObj.value.image.y()
    //   const imgW = konvaObj.value.image.width()
    //   const imgH = konvaObj.value.image.height()

    //   // 计算裁剪框当前的实际大小 (考虑scale)
    //   const rectW =
    //     konvaObj.value.cropRect.width() * konvaObj.value.cropRect.scaleX()
    //   const rectH =
    //     konvaObj.value.cropRect.height() * konvaObj.value.cropRect.scaleY()

    //   // 限制 X
    //   let newX = pos.x
    //   if (newX < imgX) newX = imgX // 不能超出左边
    //   if (newX + rectW > imgX + imgW) newX = imgX + imgW - rectW // 不能超出右边

    //   // 限制 Y
    //   let newY = pos.y
    //   if (newY < imgY) newY = imgY // 不能超出上边
    //   if (newY + rectH > imgY + imgH) newY = imgY + imgH - rectH // 不能超出下边

    //   return { x: newX, y: newY }
    // },
  })
  
  konvaObj.value.CropLayer.add(konvaObj.value.cropRect)

  // 调整工具
  konvaObj.value.transformer = new Konva.Transformer({
    nodes: [konvaObj.value.cropRect],
    keepRatio: false, // 默认自由
    rotateEnabled: false, // 禁用旋转简化计算

    // 缩放边界限制 ---
    boundBoxFunc: (oldBox, newBox) => {
      // newBox 是尝试变形后的新尺寸和位置
      const imgX = konvaObj.value.image.x()
      const imgY = konvaObj.value.image.y()
      const imgRight = imgX + konvaObj.value.image.width()
      const imgBottom = imgY + konvaObj.value.image.height()

      // 检查是否超出任意边界
      // 注意：为了防止轻微的浮点数误差导致卡住，可以使用少许容差，或者严格判断
      if (
        newBox.x < imgX ||
        newBox.y < imgY ||
        newBox.x + newBox.width > imgRight ||
        newBox.y + newBox.height > imgBottom
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
  konvaObj.value.CropLayer.draw()
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
  const imgH = konvaObj.value.image.height()
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

  konvaObj.value.cropRect.scaleX(1)
  konvaObj.value.cropRect.scaleY(1)

  konvaObj.value.layer.batchDraw()
}

/** 初始化裁剪框图层 */
function createCropContent() {
  // 裁剪框蒙版
  const rect = new Konva.Rect({
    listening: false,
    sceneFunc: (ctx, shape) => drawCropmaskSceneFunc(ctx, shape),
  })

  konvaObj.value.CropLayer.add(rect)

  // 创建裁剪框
  // this.renderCrop(layer)
}

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

/**
 * @description 获取裁剪框位置信息
 * @param {Stage} stage
 */
function getCropInfo() {
  return konvaObj.value.cropRect.getClientRect()
}

/**
 * @description 计算文本宽度
 */
function getTextWidth(ctx: CanvasRenderingContext2D, text: string) {
  return ctx.measureText(text).width
}

/**
 * @description 计算文本高度
 */
function getTextHeight(ctx: CanvasRenderingContext2D, text: string) {
  const metrics = ctx.measureText(text)
  return metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent
}

/**
 * @description 获取裁剪结果
 * @param { "string" | "blob" | "canvas" } type 裁剪结果类型
 * @param { number } [pixelRatio] pixelRatio
 * @param { "png" | "jpeg" } [mimeType] mimeType
 */
function getResult(
  type: 'string' | 'blob' | 'canvas',
  pixelRatio = 1,
  mimeType: 'png' | 'jpeg' = 'png'
) {
  if (!this.stage) return 'Stage is not exist.'

  // 通过复制图层实现
  const stageClone = this.stage.clone()
  // 删除 transformer
  const mainLayer = <Layer>stageClone.findOne('#mainLayer')
  mainLayer.findOne('Transformer')?.remove()

  const cropAttrs = this.getCropAttr()

  if (type === 'canvas') {
    return stageClone.toCanvas({ ...cropAttrs, pixelRatio })
  }

  const base64String = stageClone.toDataURL({
    ...cropAttrs,
    pixelRatio,
    mimeType: `image/${mimeType}`,
  })

  if (type === 'string') {
    return base64String
  } else if (type === 'blob') {
    return base64ToBlob(base64String)
  }
}
</script>

<template>
  <div class="konva-crop-container">
    <div id="konva-crop-editor"></div>
    <div class="konva-crop-control"></div>
  </div>
</template>
<style lang="scss" scoped>
.konva-crop-container {
  @include global.wh(80%, 90%);
  @include global.ab-center;
  z-index: var(--z-index-3);
  background-color: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(12px);
  padding: 24px;
  @include global.grid-config(auto, 1fr 120px, 20px);
  // Konva画布容器
  .konva-crop-canvas {
    @include global.full-wh;
  }
}
</style>
