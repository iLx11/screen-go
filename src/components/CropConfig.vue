<script setup lang="ts">
import { useScreenStore } from '../stores/store'
import { getItem, setItem } from '../utils/storage'
import { onMounted, reactive, ref, watch } from 'vue'
import { createCanvas } from 'canvas'
// const { ipcRenderer } = require('electron')
const win = window as any
const screenStore = useScreenStore()
const shadowImg = ref(null)
const cropImg = ref(null)
const cropBox = ref(null)
const imgEditorBox = ref(null)
// const fullImg = ref(null)
const cropMoveChangeFlag = ref<boolean>(false)
const resizeMoveChangeFlag = ref<boolean>(false)
const resizeMoveNum = ref<number>(0)
const cropSizeData = reactive<Object>({
  width: '',
  height: ''
})
const originImgSize = {
  width: 0,
  height: 0
}
let imgRate: number = 0
const clipPathConfig = ref<string>('')

onMounted(() => {
  let tempImage = new Image()
  tempImage.src = screenStore.editorPicData
  originImgSize.width = tempImage.width
  originImgSize.height = tempImage.height
  screenStore.showText('按所需等比例设置数值即可（可缩放）')
  shadowImg.value.src = screenStore.editorPicData
  cropImg.value.src = screenStore.editorPicData
  cropBox.value.style.width = cropImg.value.width + 'px'
  cropBox.value.style.height = cropImg.value.height + 'px'
  cropSizeData['width'] = cropImg.value.width
  cropSizeData['height'] = cropImg.value.height
  imgRate = originImgSize.width / cropSizeData['width']
  cropBox.value.style.left = cropImg.value.offsetLeft - cropImg.value.width / 2 + 'px'
  cropBox.value.style.top = cropImg.value.offsetTop - cropImg.value.height / 2 + 'px'
  clipPathConfig.value = getclipPathString(0, 0, cropImg.value.width, cropImg.value.height)
})

watch(
  cropSizeData,
  () => {
    if (!Number(cropSizeData['width']) || !Number(cropSizeData['height'])) {
      screenStore.showText('请输入有效纯数字')
      return
    }
    if (cropSizeData['width'] > cropImg.value.width || cropSizeData['height'] > cropImg.value.height) {
      screenStore.showText('数值越界')
      cropSizeData['width'] = cropImg.value.width
      cropSizeData['height'] = cropImg.value.height
      cropBox.value.style.width = cropSizeData['width'] + 'px'
      cropBox.value.style.height = cropSizeData['height'] + 'px'
      return
    }
    cropBox.value.style.width = cropSizeData['width'] + 'px'
    cropBox.value.style.height = cropSizeData['height'] + 'px'
    let cropImgLeft = parseInt(cropBox.value.style.left) - (cropImg.value.offsetLeft - cropImg.value.width / 2)
    let cropImgTop = parseInt(cropBox.value.style.top) - (cropImg.value.offsetTop - cropImg.value.height / 2)
    clipPathConfig.value = getclipPathString(cropImgLeft, cropImgTop, parseInt(cropBox.value.style.width), parseInt(cropBox.value.style.height))
  },
  {
    deep: true
  }
)

const confirmCrop = () => {
  let cropWidth = cropSizeData['width'] * imgRate
  let cropHeight = cropSizeData['height'] * imgRate
  const canvas = createCanvas(cropSizeData['width'], cropSizeData['height'])
  const ctx = canvas.getContext('2d')
  let leftCrop = parseInt(cropBox.value.style.left) - (cropImg.value.offsetLeft - cropImg.value.width / 2)
  let topCrop = parseInt(cropBox.value.style.top) - (cropImg.value.offsetTop - cropImg.value.height / 2)
  ctx.drawImage(shadowImg.value, leftCrop * imgRate, topCrop * imgRate, cropWidth, cropHeight, 0, 0, cropSizeData['width'], cropSizeData['height'])
  // 替换裁剪后的数据
  screenStore.setEiditorPicData(canvas.toDataURL())
  screenStore.setResizeWidth(cropSizeData['width'])
  screenStore.setResizeHeight(cropSizeData['height'])
  screenStore.setCroped(true)
  screenStore.setCropShow(false)
  // ctx.drawImage(shadowImg.value, 0, 0, cropWidth, cropHeight)
}

const getclipPathString = (left: number, top: number, width: number, height: number): string => {
  return `polygon(${left}px ${top}px, ${left + width}px ${top}px, ${left + width}px ${top + height}px, ${left}px ${top + height}px)`
}

let originX
let originY

// 裁剪框鼠标按下
const cropMouseDown = (event) => {
  cropMoveChangeFlag.value = true
  // console.log(cropBox.value)
  const { offsetLeft, offsetTop } = cropBox.value
  originX = event.clientX - offsetLeft
  originY = event.clientY - offsetTop
  // console.log(originX, originY)
}

// 裁剪框鼠标移动
const cropMouseMove = (event) => {
  // eventPropagation()
  if (cropMoveChangeFlag.value) {
    // cropMoveChangeFlag.value = false
    const left = event.clientX - originX
    const top = event.clientY - originY
    cropBox.value.style.left = left + 'px'
    cropBox.value.style.top = top + 'px'
    if (cropImg.value.offsetLeft - cropBox.value.offsetLeft > cropImg.value.width / 2) {
      cropBox.value.style.left = cropImg.value.offsetLeft - cropImg.value.width / 2 + 'px'
    }
    if (cropImg.value.offsetTop - cropBox.value.offsetTop > cropImg.value.height / 2) {
      cropBox.value.style.top = cropImg.value.offsetTop - cropImg.value.height / 2 + 'px'
    }
    let bottomLimit = parseInt(cropBox.value.style.height) - (cropImg.value.offsetTop - cropBox.value.offsetTop)
    let bottomOffset = cropImg.value.height - parseInt(cropBox.value.style.height) + (cropImg.value.offsetTop - cropImg.value.height / 2)
    if (bottomLimit > cropImg.value.height / 2) {
      cropBox.value.style.top = bottomOffset + 'px'
    }
    let rightLimit = parseInt(cropBox.value.style.width) - (cropImg.value.offsetLeft - cropBox.value.offsetLeft)
    let rightOffset = cropImg.value.width - parseInt(cropBox.value.style.width) + (cropImg.value.offsetLeft - cropImg.value.width / 2)
    if (rightLimit > cropImg.value.width / 2) {
      cropBox.value.style.left = rightOffset + 'px'
    }
    let cropImgLeft = parseInt(cropBox.value.style.left) - (cropImg.value.offsetLeft - cropImg.value.width / 2)
    let cropImgTop = parseInt(cropBox.value.style.top) - (cropImg.value.offsetTop - cropImg.value.height / 2)
    clipPathConfig.value = getclipPathString(cropImgLeft, cropImgTop, parseInt(cropBox.value.style.width), parseInt(cropBox.value.style.height))
    // console.log(bottomLimit)
    // console.log((cropImg.value.height / 2), '---', cropImg.value.offsetTop, '---', cropBox.value.offsetTop, '---', cropImg.value.offsetTop - cropBox.value.offsetTop)
  }
}

// 裁剪框鼠标抬起
const cropMouseUp = (event: any) => {
  cropMoveChangeFlag.value = false
}

// 缩放按下
const resizeDown = (num: number, event: any) => {
  resizeMoveChangeFlag.value = true
  resizeMoveNum.value = num
  const { offsetLeft, offsetTop } = cropBox.value
  originX = event.clientX - offsetLeft
  originY = event.clientY - offsetTop
}

// 缩放执行
const resizeExecute = (event: any) => {
  const { offsetLeft, offsetTop } = cropBox.value
  const leftOffset = event.clientX - offsetLeft
  const topOffset = event.clientY - offsetTop
  // 移动距离
  let leftMove = leftOffset - originX
  let topMove = topOffset - originY

  if (resizeMoveNum.value == 0) {
    let leftData = parseInt(cropBox.value.style.left) + leftMove
    let topData = parseInt(cropBox.value.style.top) + topMove
    let widthData = parseInt(cropBox.value.style.width) - leftMove
    let heightData = parseInt(cropBox.value.style.height) - topMove
    // console.log(originX, originY, leftOffset, topOffset, leftMove, topMove)
    cropBox.value.style.left = leftData + 'px'
    cropBox.value.style.top = topData + 'px'
    cropBox.value.style.width = widthData + 'px'
    cropBox.value.style.height = heightData + 'px'
    let cropImgLeft = leftData - (cropImg.value.offsetLeft - cropImg.value.width / 2)
    let cropImgTop = topData - (cropImg.value.offsetTop - cropImg.value.height / 2)
    clipPathConfig.value = getclipPathString(cropImgLeft, cropImgTop, widthData, heightData)
    cropSizeData['width'] = widthData
    cropSizeData['height'] = heightData
  } else if (resizeMoveNum.value == 4) {
    let topData = parseInt(cropBox.value.style.top) + topMove
    let heightData = parseInt(cropBox.value.style.height) - topMove
    cropBox.value.style.top = topData + 'px'
    cropBox.value.style.height = heightData + 'px'
    let cropImgTop = topData - (cropImg.value.offsetTop - cropImg.value.height / 2)
    let cropImgLeft = parseInt(cropBox.value.style.left) - (cropImg.value.offsetLeft - cropImg.value.width / 2)
    clipPathConfig.value = getclipPathString(cropImgLeft, cropImgTop, parseInt(cropBox.value.style.width), heightData)
    cropSizeData['height'] = heightData
  } else if (resizeMoveNum.value == 6) {
    let leftData = parseInt(cropBox.value.style.left) + leftMove
    let widthData = parseInt(cropBox.value.style.width) - leftMove
    cropBox.value.style.left = leftData + 'px'
    cropBox.value.style.width = widthData + 'px'
    let cropImgLeft = leftData - (cropImg.value.offsetLeft - cropImg.value.width / 2)
    let cropImgTop = parseInt(cropBox.value.style.top) - (cropImg.value.offsetTop - cropImg.value.height / 2)
    clipPathConfig.value = getclipPathString(cropImgLeft, cropImgTop, widthData, parseInt(cropBox.value.style.height))
    cropSizeData['width'] = widthData
  }
  // cropSizeData['width'] = widthData
  // cropSizeData['height'] = heightData
}

// 缩放移动
const resizeMove = (event: any) => {
  if (resizeMoveChangeFlag.value) {
    resizeExecute(event)
  }
}

// 缩放按下
const resizeUp = () => {
  resizeMoveChangeFlag.value = false
}

// 缩放鼠标离开
const resizeleave = () => {
  // resizeMoveChangeFlag.value = false
}
</script>

<template>
  <div id="crop-config-box">
    <!-- <img src="" alt="" id="full-img" ref="fullImg"> -->
    <div id="img-editor-box" ref="imgEditorBox" @mousemove="resizeMove">
      <img ref="shadowImg" src="" alt="" />
      <img ref="cropImg" :style="{ clipPath: clipPathConfig }" src="" alt="" />
      <div id="crop-box" ref="cropBox" @mouseleave="cropMouseUp" @mouseup="cropMouseUp" @mousedown.stop="cropMouseDown" @mousemove="cropMouseMove">
        <div class="box-corner topleft" style="cursor: nw-resize" @mousedown.stop="resizeDown(0, $event)" @mousemove="resizeMove" @mouseup="resizeUp"></div>
        <!-- <div class="box-corner topright" style="cursor: ne-resize" @mousedown.stop="resizeDown(1, $event)" @mousemove="resizeMove" @mouseup="resizeUp"></div> -->
        <!-- style="cursor: se-resize" -->
        <div class="box-corner bottomright"></div>
        <!-- <div class="box-corner bottomleft" style="cursor: sw-resize" @mousedown.stop="resizeDown(3, $event)" @mousemove="resizeMove" @mouseup="resizeUp"></div> -->
        <div class="box-middle topmiddle" style="cursor: n-resize" @mousedown.stop="resizeDown(4, $event)" @mousemove="resizeMove" @mouseup="resizeUp"></div>
        <!-- <div class="box-middle bottommiddle" style="cursor: s-resize" @mousedown.stop="resizeDown(5, $event)" @mousemove="resizeMove" @mouseup="resizeUp"></div> -->
        <div class="box-middle leftmiddle" style="cursor: w-resize" @mousedown.stop="resizeDown(6, $event)" @mousemove="resizeMove" @mouseup="resizeUp"></div>
        <!-- <div class="box-middle rightmiddle" style="cursor: e-resize" @mousedown.stop="resizeDown(7, $event)" @mousemove="resizeMove" @mouseup="resizeUp"></div> -->
      </div>
    </div>
    <div id="data-config-box">
      <div id="input-box-group">
        <div class="crop-input-group">
          <input type="text" class="input" v-model="cropSizeData.width" />
          <label class="user-label">宽度:</label>
        </div>
        <div class="crop-input-group">
          <input type="text" class="input" v-model="cropSizeData.height" />
          <label class="user-label">高度:</label>
        </div>
      </div>
      <div id="confirm-button" @click="confirmCrop">确认并退出</div>
    </div>
  </div>
</template>

<style lang="scss">
#full-img {
  width: auto;
  height: auto;
  position: absolute;
  top: -99999px;
  left: -99999px;
}
#crop-config-box {
  width: 87%;
  height: 87%;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  box-shadow: 1.1px 0px 10.8px -34px rgba(0, 0, 0, 0.059), 7px 0px 81px -34px rgba(0, 0, 0, 0.12);
  background: rgba(255, 255, 255, 1);
  border-radius: 14px;
  border: 0.2px solid rgba(51, 51, 51, 0.1);
  // box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.4);
  padding: 2.5em;
  overflow: scroll;
  z-index: 99999;
  display: flex;
  flex-flow: column nowrap;
  justify-content: space-between;
  align-items: center;
  user-select: none;

  #img-editor-box {
    width: 100%;
    height: 73%;
    border-radius: 9px;
    box-shadow: 0 0 0 2px rgba(51, 51, 51, 0.1);
    display: flex;
    justify-content: center;
    align-items: center;
    position: relative;
    #crop-box {
      max-width: 100%;
      max-height: 100%;
      position: absolute;
      z-index: 99999;
      cursor: move;
      .box-corner,
      .box-middle {
        width: 7px;
        height: 7px;
        position: absolute;
        background: rgba(255, 255, 255, 1);
      }
      .topleft {
        top: -0.5px;
        left: -0.5px;
        width: 25px;
        border-radius: 12px;
      }
      .topleft::before {
        content: '';
        width: 8px;
        height: 25px;
        position: absolute;
        background: rgba(255, 255, 255, 1);
        border-radius: 12px;
        left: 0;
      }
      .topright {
        top: 0;
        right: 0;
        width: 20px;
        border-radius: 12px;
      }
      .topright::before {
        content: '';
        width: 8px;
        height: 20px;
        position: absolute;
        right: 0;
        background: rgba(255, 255, 255, 1);
        border-radius: 12px;
      }
      .bottomleft {
        left: 0;
        bottom: 0;
        width: 20px;
        border-radius: 12px;
      }
      .bottomleft::before {
        content: '';
        width: 8px;
        height: 20px;
        position: absolute;
        background: rgba(255, 255, 255, 1);
        border-radius: 12px;
        left: 0;
        bottom: 0;
      }

      .bottomright {
        right: -0.5px;
        bottom: -0.5px;
        width: 30px;
        height: 2px;
        border-radius: 12px;
      }
      .bottomright::before {
        content: '';
        width: 2px;
        height: 30px;
        position: absolute;
        right: 0;
        bottom: 0;
        background: rgba(255, 255, 255, 1);
        border-radius: 12px;
      }

      .topmiddle {
        left: 50%;
        top: -0.5px;
        transform: translateX(-50%);
        width: 40%;
        border-radius: 12px;
      }
      .bottommiddle {
        left: 50%;
        bottom: 0;
        transform: translateX(-50%);
        width: 30px;
        border-radius: 12px;
      }
      .leftmiddle {
        top: 50%;
        left: -0.5px;
        transform: translateY(-50%);
        height: 40%;
        border-radius: 12px;
      }
      .rightmiddle {
        top: 50%;
        right: 0;
        transform: translateY(-50%);
        height: 30px;
        border-radius: 12px;
      }
    }
    img {
      max-width: 100%;
      max-height: 100%;
      min-width: 30%;
      display: flex;
      justify-content: center;
      align-items: center;
      user-select: none;
    }
    img:nth-child(1) {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      opacity: 0.5;
    }
    img:nth-child(2) {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
    }

    img[src=''] {
      opacity: 0;
    }
  }

  #data-config-box {
    width: 100%;
    height: 25%;
    display: grid;
    grid-template-rows: repeat(2, 1fr);
    grid-template-columns: 1fr;
    justify-content: center;
    align-items: center;
    justify-items: center;
    text-align: center;
    position: relative;
    #input-box-group {
      width: 35%;
      height: 70%;
      display: flex;
      flex-flow: row nowrap;
      justify-content: space-around;
      align-items: center;
    }
    .crop-input-group {
      width: 43%;
      height: 40px;
      position: relative;
      // box-sizing: border-box;
      display: flex;
      justify-content: center;
      align-items: center;
      color: var(--text-color-2);
      font-weight: 900;
      padding: 0.1em;
      box-shadow: 0 0 0 5px rgba(255, 255, 255, 0.3);

      .input {
        width: 100%;
        height: 100%;
        border-radius: 12px;
        display: block;
        border: none;
        font-size: 18px;
        color: var(--text-color-1);
        font-family: 'ceyy';
        text-align: center;
        box-shadow: 0 0 0 2px rgba(51, 51, 51, 0.1);
      }

      .user-label {
        width: 29px;
        height: 60%;
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
    #confirm-button {
      width: 20%;
      height: 80%;
      border-radius: 12px;
      background: rgba(51, 51, 51, 0.1);
      box-shadow: 0 0 0 1.5px rgba(51, 51, 51, 0.1);
      cursor: pointer;
      display: flex;
      justify-content: center;
      align-items: center;
    }
  }
}
</style>
