<script setup lang="ts">
import { useScreenStore } from '../stores/store'
import { onMounted, reactive, ref, watch } from 'vue'
import { NModal, NInput, NButton, NGrid, NGi, NSpace } from 'naive-ui'
import { useConfigStore } from '@/stores/configStore'

const screenStore = useScreenStore()
const configStore = useConfigStore()

const shadowImg = ref<HTMLImageElement | null>(null)
const cropImg = ref<HTMLImageElement | null>(null)
const cropBox = ref<HTMLDivElement | null>(null)
const fullCanvas = ref<HTMLCanvasElement | null>(null)
const imgEditorBox = ref<HTMLDivElement | null>(null)

const cropMoveChangeFlag = ref(false)
const resizeMoveChangeFlag = ref(false)
const resizeMoveNum = ref(0)

const cropSizeData = reactive({
  width: '',
  height: '',
})

const originImgSize = {
  width: 0,
  height: 0,
}

let imgRate = 0
const clipPathConfig = ref('')

// 组件显示控制
const showModal = ref(true)

onMounted(() => {
  // 检查图片数据是否存在
  if (!configStore.screenData || !configStore.screenData.baseData) {
    console.error('图片数据为空:', configStore.screenData)
    configStore.showPop('没有图片数据，请先选择图片')
    return
  }

  console.log('图片数据类型:', typeof configStore.screenData.baseData)
  console.log('图片数据长度:', configStore.screenData.baseData.length)

  const tempImage = new Image()

  // 图片加载错误处理
  tempImage.onerror = () => {
    console.error('图片加载失败:', configStore.screenData.baseData)
    configStore.showPop('图片加载失败，请检查图片数据格式')
  }

  tempImage.onload = () => {
    console.log('图片加载成功，尺寸:', tempImage.width, 'x', tempImage.height)
    originImgSize.width = tempImage.width
    originImgSize.height = tempImage.height

    if (shadowImg.value && cropImg.value && cropBox.value) {
      // 设置阴影图片
      shadowImg.value.onerror = () => {
        console.error('阴影图片加载失败')
      }
      shadowImg.value.src = configStore.screenData.baseData

      // 设置裁剪图片
      cropImg.value.onerror = () => {
        console.error('裁剪图片加载失败')
      }
      cropImg.value.src = configStore.screenData.baseData

      // 初始化裁剪框
      cropBox.value.style.width = tempImage.width + 'px'
      cropBox.value.style.height = tempImage.height + 'px'
      cropSizeData.width = tempImage.width.toString()
      cropSizeData.height = tempImage.height.toString()

      imgRate = originImgSize.width / tempImage.width

      // 计算裁剪框位置（居中）
      const containerRect = imgEditorBox.value?.getBoundingClientRect()
      if (containerRect) {
        const left =
          containerRect.left + containerRect.width / 2 - tempImage.width / 2
        const top =
          containerRect.top + containerRect.height / 2 - tempImage.height / 2
        cropBox.value.style.left = left + 'px'
        cropBox.value.style.top = top + 'px'
      } else {
        // 备选方案：相对定位
        cropBox.value.style.left = '50%'
        cropBox.value.style.top = '50%'
        cropBox.value.style.transform = 'translate(-50%, -50%)'
      }

      clipPathConfig.value = getclipPathString(
        0,
        0,
        tempImage.width,
        tempImage.height
      )
      console.log('裁剪框初始化完成')
    } else {
      console.error('DOM元素引用缺失')
    }
  }

  // 设置图片源
  tempImage.src = configStore.screenData.baseData

  configStore.showPop('按所需等比例设置数值即可（可缩放）')
})

watch(
  cropSizeData,
  () => {
    if (!cropBox.value || !cropImg.value) return

    const width = Number(cropSizeData.width)
    const height = Number(cropSizeData.height)

    if (!width || !height) {
      configStore.showPop('请输入有效纯数字')
      return
    }

    if (width > cropImg.value.width || height > cropImg.value.height) {
      configStore.showPop('数值越界')
      cropSizeData.width = cropImg.value.width.toString()
      cropSizeData.height = cropImg.value.height.toString()
      cropBox.value.style.width = cropSizeData.width + 'px'
      cropBox.value.style.height = cropSizeData.height + 'px'
      return
    }

    cropBox.value.style.width = width + 'px'
    cropBox.value.style.height = height + 'px'

    const cropImgLeft =
      parseInt(cropBox.value.style.left) -
      (cropImg.value.offsetLeft - cropImg.value.width / 2)
    const cropImgTop =
      parseInt(cropBox.value.style.top) -
      (cropImg.value.offsetTop - cropImg.value.height / 2)

    clipPathConfig.value = getclipPathString(
      cropImgLeft,
      cropImgTop,
      width,
      height
    )
  },
  { deep: true }
)

const confirmCrop = () => {
  if (
    !fullCanvas.value ||
    !shadowImg.value ||
    !cropBox.value ||
    !cropImg.value
  ) {
    configStore.showPop('裁剪失败：缺少必要元素')
    return
  }

  const cropWidth = Number(cropSizeData.width) * imgRate
  const cropHeight = Number(cropSizeData.height) * imgRate

  fullCanvas.value.width = Number(cropSizeData.width)
  fullCanvas.value.height = Number(cropSizeData.height)

  const ctx = fullCanvas.value.getContext('2d')
  if (!ctx) {
    configStore.showPop('Canvas上下文获取失败')
    return
  }

  const leftCrop =
    parseInt(cropBox.value.style.left) -
    (cropImg.value.offsetLeft - cropImg.value.width / 2)
  const topCrop =
    parseInt(cropBox.value.style.top) -
    (cropImg.value.offsetTop - cropImg.value.height / 2)

  ctx.drawImage(
    shadowImg.value,
    leftCrop * imgRate,
    topCrop * imgRate,
    cropWidth,
    cropHeight,
    0,
    0,
    Number(cropSizeData.width),
    Number(cropSizeData.height)
  )

  screenStore.setEiditorPicData(fullCanvas.value.toDataURL())
  screenStore.setResizeWidth(Number(cropSizeData.width))
  screenStore.setResizeHeight(Number(cropSizeData.height))
  screenStore.setCroped(true)
  screenStore.setCropShow(false)
  showModal.value = false
  configStore.showPop('图片裁剪完成')
}

const getclipPathString = (
  left: number,
  top: number,
  width: number,
  height: number
): string => {
  return `polygon(${left}px ${top}px, ${left + width}px ${top}px, ${
    left + width
  }px ${top + height}px, ${left}px ${top + height}px)`
}

let originX: number
let originY: number

// 裁剪框鼠标事件处理函数
const cropMouseDown = (event: MouseEvent) => {
  cropMoveChangeFlag.value = true
  if (cropBox.value) {
    const { offsetLeft, offsetTop } = cropBox.value
    originX = event.clientX - offsetLeft
    originY = event.clientY - offsetTop
  }
}

const cropMouseMove = (event: MouseEvent) => {
  if (cropMoveChangeFlag.value && cropBox.value && cropImg.value) {
    const left = event.clientX - originX
    const top = event.clientY - originY

    cropBox.value.style.left = left + 'px'
    cropBox.value.style.top = top + 'px'

    // 边界检查逻辑
    if (
      cropImg.value.offsetLeft - cropBox.value.offsetLeft >
      cropImg.value.width / 2
    ) {
      cropBox.value.style.left =
        cropImg.value.offsetLeft - cropImg.value.width / 2 + 'px'
    }
    if (
      cropImg.value.offsetTop - cropBox.value.offsetTop >
      cropImg.value.height / 2
    ) {
      cropBox.value.style.top =
        cropImg.value.offsetTop - cropImg.value.height / 2 + 'px'
    }

    const bottomLimit =
      parseInt(cropBox.value.style.height) -
      (cropImg.value.offsetTop - cropBox.value.offsetTop)
    const bottomOffset =
      cropImg.value.height -
      parseInt(cropBox.value.style.height) +
      (cropImg.value.offsetTop - cropImg.value.height / 2)
    if (bottomLimit > cropImg.value.height / 2) {
      cropBox.value.style.top = bottomOffset + 'px'
    }

    const rightLimit =
      parseInt(cropBox.value.style.width) -
      (cropImg.value.offsetLeft - cropBox.value.offsetLeft)
    const rightOffset =
      cropImg.value.width -
      parseInt(cropBox.value.style.width) +
      (cropImg.value.offsetLeft - cropImg.value.width / 2)
    if (rightLimit > cropImg.value.width / 2) {
      cropBox.value.style.left = rightOffset + 'px'
    }

    const cropImgLeft =
      parseInt(cropBox.value.style.left) -
      (cropImg.value.offsetLeft - cropImg.value.width / 2)
    const cropImgTop =
      parseInt(cropBox.value.style.top) -
      (cropImg.value.offsetTop - cropImg.value.height / 2)
    clipPathConfig.value = getclipPathString(
      cropImgLeft,
      cropImgTop,
      parseInt(cropBox.value.style.width),
      parseInt(cropBox.value.style.height)
    )
  }
}

const cropMouseUp = () => {
  cropMoveChangeFlag.value = false
}

// 缩放相关函数
const resizeDown = (num: number, event: MouseEvent) => {
  resizeMoveChangeFlag.value = true
  resizeMoveNum.value = num
  if (cropBox.value) {
    const { offsetLeft, offsetTop } = cropBox.value
    originX = event.clientX - offsetLeft
    originY = event.clientY - offsetTop
  }
}

const resizeExecute = (event: MouseEvent) => {
  if (!cropBox.value || !cropImg.value) return

  const { offsetLeft, offsetTop } = cropBox.value
  const leftOffset = event.clientX - offsetLeft
  const topOffset = event.clientY - offsetTop

  const leftMove = leftOffset - originX
  const topMove = topOffset - originY

  if (resizeMoveNum.value === 0) {
    const leftData = parseInt(cropBox.value.style.left) + leftMove
    const topData = parseInt(cropBox.value.style.top) + topMove
    const widthData = parseInt(cropBox.value.style.width) - leftMove
    const heightData = parseInt(cropBox.value.style.height) - topMove

    cropBox.value.style.left = leftData + 'px'
    cropBox.value.style.top = topData + 'px'
    cropBox.value.style.width = widthData + 'px'
    cropBox.value.style.height = heightData + 'px'

    const cropImgLeft =
      leftData - (cropImg.value.offsetLeft - cropImg.value.width / 2)
    const cropImgTop =
      topData - (cropImg.value.offsetTop - cropImg.value.height / 2)
    clipPathConfig.value = getclipPathString(
      cropImgLeft,
      cropImgTop,
      widthData,
      heightData
    )

    cropSizeData.width = widthData.toString()
    cropSizeData.height = heightData.toString()
  } else if (resizeMoveNum.value === 4) {
    const topData = parseInt(cropBox.value.style.top) + topMove
    const heightData = parseInt(cropBox.value.style.height) - topMove

    cropBox.value.style.top = topData + 'px'
    cropBox.value.style.height = heightData + 'px'

    const cropImgTop =
      topData - (cropImg.value.offsetTop - cropImg.value.height / 2)
    const cropImgLeft =
      parseInt(cropBox.value.style.left) -
      (cropImg.value.offsetLeft - cropImg.value.width / 2)
    clipPathConfig.value = getclipPathString(
      cropImgLeft,
      cropImgTop,
      parseInt(cropBox.value.style.width),
      heightData
    )

    cropSizeData.height = heightData.toString()
  } else if (resizeMoveNum.value === 6) {
    const leftData = parseInt(cropBox.value.style.left) + leftMove
    const widthData = parseInt(cropBox.value.style.width) - leftMove

    cropBox.value.style.left = leftData + 'px'
    cropBox.value.style.width = widthData + 'px'

    const cropImgLeft =
      leftData - (cropImg.value.offsetLeft - cropImg.value.width / 2)
    const cropImgTop =
      parseInt(cropBox.value.style.top) -
      (cropImg.value.offsetTop - cropImg.value.height / 2)
    clipPathConfig.value = getclipPathString(
      cropImgLeft,
      cropImgTop,
      widthData,
      parseInt(cropBox.value.style.height)
    )

    cropSizeData.width = widthData.toString()
  }
}

const resizeMove = (event: MouseEvent) => {
  if (resizeMoveChangeFlag.value) {
    resizeExecute(event)
  }
}

const resizeUp = () => {
  resizeMoveChangeFlag.value = false
}

const handleClose = () => {
  screenStore.setCropShow(false)
  showModal.value = false
}
</script>

<template>
  <NModal
    v-model:show="showModal"
    :mask-closable="false"
    :close-on-esc="false"
    preset="card"
    title="图片裁剪"
    style="width: 90%; max-width: 1200px; height: 90%"
    @close="handleClose"
  >
    <div class="crop-container">
      <canvas
        ref="fullCanvas"
        class="hidden-canvas"
      ></canvas>

      <div class="editor-section">
        <div
          ref="imgEditorBox"
          class="image-editor-box"
          @mousemove="resizeMove"
        >
          <img
            ref="shadowImg"
            class="shadow-image"
            alt="阴影图片"
          />
          <img
            ref="cropImg"
            :style="{ clipPath: clipPathConfig }"
            class="crop-image"
            alt="裁剪图片"
          />

          <div
            ref="cropBox"
            class="crop-box"
            @mouseleave="cropMouseUp"
            @mouseup="cropMouseUp"
            @mousedown.stop="cropMouseDown"
            @mousemove="cropMouseMove"
          >
            <div
              class="box-corner top-left"
              @mousedown.stop="resizeDown(0, $event)"
              @mousemove="resizeMove"
              @mouseup="resizeUp"
            ></div>
            <div class="box-corner bottom-right"></div>
            <div
              class="box-middle top-middle"
              @mousedown.stop="resizeDown(4, $event)"
              @mousemove="resizeMove"
              @mouseup="resizeUp"
            ></div>
            <div
              class="box-middle left-middle"
              @mousedown.stop="resizeDown(6, $event)"
              @mousemove="resizeMove"
              @mouseup="resizeUp"
            ></div>
          </div>
        </div>
      </div>

      <div class="control-section">
        <NSpace
          vertical
          size="large"
          style="width: 100%"
        >
          <NGrid
            :cols="2"
            :x-gap="12"
          >
            <NGi>
              <NInput
                v-model:value="cropSizeData.width"
                placeholder="宽度"
                size="large"
              >
                <template #prefix>
                  <span>宽度:</span>
                </template>
              </NInput>
            </NGi>
            <NGi>
              <NInput
                v-model:value="cropSizeData.height"
                placeholder="高度"
                size="large"
              >
                <template #prefix>
                  <span>高度:</span>
                </template>
              </NInput>
            </NGi>
          </NGrid>

          <NButton
            type="primary"
            size="large"
            @click="confirmCrop"
            style="width: 100%"
          >
            确认并退出
          </NButton>
        </NSpace>
      </div>
    </div>
  </NModal>
</template>

<style lang="scss" scoped>
.hidden-canvas {
  position: absolute;
  top: -99999px;
  left: -99999px;
}

.crop-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.editor-section {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #fafafa;
}

.image-editor-box {
  width: 100%;
  height: 100%;
  border-radius: 8px;
  border: 2px solid #f0f0f0;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
  overflow: hidden;
  background-color: #fff;

  .shadow-image,
  .crop-image {
    max-width: 100%;
    max-height: 100%;
    min-width: 100px;
    min-height: 100px;
    user-select: none;
    object-fit: contain;
  }

  .shadow-image {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    opacity: 0.5;
    z-index: 1;
  }

  .crop-image {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 2;
  }

  img[src=''] {
    opacity: 0;
  }
}

.crop-box {
  max-width: 100%;
  max-height: 100%;
  position: absolute;
  z-index: 10;
  cursor: move;
  border: 2px solid #1890ff;

  .box-corner,
  .box-middle {
    position: absolute;
    background: #fff;
    border: 2px solid #1890ff;
  }

  .box-corner {
    width: 12px;
    height: 12px;
  }

  .box-middle {
    background: #1890ff;
  }

  .top-left {
    top: -6px;
    left: -6px;
    cursor: nw-resize;
  }

  .bottom-right {
    bottom: -6px;
    right: -6px;
    cursor: se-resize;
  }

  .top-middle {
    top: -6px;
    left: 50%;
    transform: translateX(-50%);
    width: 40%;
    height: 6px;
    cursor: n-resize;
  }

  .left-middle {
    top: 50%;
    left: -6px;
    transform: translateY(-50%);
    width: 6px;
    height: 40%;
    cursor: w-resize;
  }
}

.control-section {
  padding: 0 20px;
}
</style>
