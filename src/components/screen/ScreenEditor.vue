<script setup="{ emit }" lang="ts">
import { onMounted, nextTick, ref, onBeforeUnmount } from 'vue'
import { useConfigStore } from '../../stores/configStore'

// imageEditor 组件
import ImageEditor from 'tui-image-editor/dist/tui-image-editor.js'
import 'tui-image-editor/dist/tui-image-editor.css'
import 'tui-color-picker/dist/tui-color-picker.css'
import { editorConfig } from '../../utils/tools/theme'
import { resizeImage, generate } from 'ilx1-x-tool'

const win = window as any
const emits = defineEmits(['editorCancle', 'editorCommit', 'showScreenFunc'])
const configStore = useConfigStore()
let curZoom = 1

onMounted(() => {
  nextTick(() => {
    imageEditorInstance.value = new ImageEditor(
      document.querySelector('#editor'),
      editorConfig
    )
    // imageEditorInstance.value.zoom({ x: 0, y: 0, zoomLevel: 1 })
    // 缩放画布
    document.querySelector('.tui-image-editor-container').addEventListener(
      'wheel',
      e => {
        e.preventDefault()
        const delta = e.deltaY > 0 ? -0.1 : 0.1 // 滚轮向下缩小，向上放大
        curZoom > 1
          ? (curZoom = 1)
          : curZoom < 0
          ? (curZoom = 1)
          : (curZoom += delta)
        imageEditorInstance.value.zoom({ x: 0, y: 0, zoomLevel: curZoom })
      },
      { passive: false }
    )
  })
})

// 编辑组件
let imageEditorInstance = ref(null)

const imgArr: Array<string> = ['./img/black.png', './img/blank.png']

const curImg = ref<number>(0)
/********************************************************************************
 * @brief: 切换反色背景
 * @return {*}
 ********************************************************************************/
const switchBack = () => {
  curImg.value < imgArr.length - 1 ? curImg.value++ : (curImg.value = 0)
  // // console.info(curImg.value)
  let img = imgArr[curImg.value]
  let color = curImg.value == 1 ? '#000000' : '#ffffff'

  ;(imageEditorInstance as any).value
    .loadImageFromURL(img, 'blank')
    .then(result => {
      ;(imageEditorInstance as any).value.addText('', {
        position: {},
        styles: {
          fill: color,
          fontSize: 85,
          fontFamily: '',
          fontStyle: '',
          fontWeight: '',
          underline: '',
        },
      })
    })
}

/********************************************************************************
 * @brief: 重新加载已保存的图片数据
 * @return {*}
 ********************************************************************************/
const loadSavedImage = () => {
  // 获取图片数据
  const savedData = localStorage.getItem('savedImageData')
  if (savedData) {
    imageEditorInstance.value
      .loadImageFromURL(savedData, 'EditedImage')
      .then(() => {
        console.log('图片重新加载完成！')
      })
  }
}

/********************************************************************************
 * @brief: 编辑信息提交
 * @return {*}
 ********************************************************************************/
const editorCommit = async () => {
  const picBase64Str = (imageEditorInstance as any).value.toDataURL()
  let data, arrData
  configStore.showPop('处理数据中...')
  // coverShow.value = true

  // 判断是屏幕类型
  // if (configStore.curScreen < 1) {
  //   // 设置编辑状态
  //   let tempObj: object = {
  //     set: 'configStore.isEdit',
  //     value: 0,
  //   }
  //   win.api.setConfigStore(tempObj)
  //   // 缩放图片（1 为单色屏幕）
  //   data = await resizeImageWithKonva(320, 172, picBase64Str, 0)
  //   // 获取取模数据
  //   arrData = await generate(data, 120, 1, 2, 0, 0, 0)
  // } else {
  //   // 缩放图片（1 为单色屏幕）
  //   data = await resizeImageWithKonva(72, 40, picBase64Str, 1)
  //   // 获取取模数据
  //   arrData = await generate(data, 120, 1, 2, 0, 0, 1)
  // }

  // 缩放图片（1 为单色屏幕）
  data = await resizeImage(72, 40, picBase64Str, 1)
  // 获取取模数据
  arrData = await generate(data, 120, 1, 2, 0, 0, 1)

  // // console.info(arrData)
  let tempObj: object = {
    set: 'configStore.screenData',
    value: JSON.stringify({
      baseData: data,
      buffData: arrData,
    }),
  }

  console.info(data)
  win.api.setConfigStore(tempObj)
  coverShow.value = false
  // win.api.closeWindow()
}

/********************************************************************************
 * @brief: 卸载时销毁 TUI Image Editor 实例
 * @return {*}
 ********************************************************************************/
onBeforeUnmount(() => {
  if (imageEditorInstance) {
    imageEditorInstance.value.destroy()
    imageEditorInstance = null
  }
})

/********************************************************************************
 * @brief: 关闭窗口
 * @return {*}
 ********************************************************************************/
const closeWindow = () => {
  win.api.closeWindow()
}

const coverShow = ref<boolean>(false)
</script>

<template>
  <div
    id="cover"
    v-if="coverShow"
  ></div>
  <div id="editor"></div>
  <div id="tools-bar">
    <ul>
      <li @click="switchBack">切换</li>
      <li @click="closeWindow">取消</li>
      <li @click="editorCommit">确认</li>
    </ul>
  </div>
</template>

<style scoped lang="scss">
:deep(.tui-image-editor-menu) {
  background: rgb(51, 51, 51);
}
:deep(.tui-image-editor-partition) {
  width: 10px;
}
:deep(.tui-image-editor-submenu-align) {
  @include global.flex_config(1, flex-start);
  padding: 0;
  margin: 0;
}
:deep(.tool-box) {
  width: 30px;
  height: 10px;
}

#cover {
  @include global.full_wh;
  @include global.ab_center;
  background: rgba(51, 51, 51, 0.2);
  border-radius: 15px;
  z-index: var(--z-index-5);
}

.editor-tools {
  @include global.wh(50px, 30px);
  background: white;
  box-sizing: border-box;
}

#tools-bar {
  @include global.wh(8%, auto);
  @include global.pos_ab(17%, 15px, 1);
  z-index: var(--z-index-5);
  ul {
    @include global.full_wh;
    @include global.flex_config(1, flex-start);
    gap: 10px;
    li {
      width: 100%;
      aspect-ratio: 1/1;
      @include global.comm_box;
      // border-radius: 50%;
      @include global.flex_center;
      font-size: 1.3vw;
      cursor: pointer;
      &:last-child {
        background: rgba(243, 226, 224, 1);
      }
    }
  }
}
</style>
