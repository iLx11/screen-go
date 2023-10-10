<script setup="{ emit }" lang="ts">
import { onMounted, nextTick, ref } from 'vue'

import { customImgEditorTheme } from '../utils/theme'
// import useLocale from '../hooks/lang'
import 'dp-image-editor/dist/tui-image-editor.css'
// import imageTool from '../utils/Base64ToHexArray.ts'
import ImageToHexArray from '../utils/ImageToHexArray'
// import { imgEditorHandle } from '../utils/imgTools'
import { useScreenStore } from '../stores/store'

const { ipcRenderer } = require('electron')
const ImageEditor = require('dp-image-editor')
// const { t } = useLocale()
const emits = defineEmits(['editorCancle', 'editorCommit'])
const screenStore = useScreenStore()

onMounted(() => {
  nextTick(() => {
    instance.value = new ImageEditor(document.querySelector('#editor'), {
      usageStatistics: false, //这个一定要写要不然会报错
      includeUI: {
        loadImage: {
          path: 'src/assets/img/black.png', //加载的图片链接
          name: 'image' //图片名称（不重要）
        },
        //操作菜单栏
        menu: [
          'crop', // 裁切
          'flip', // 翻转
          'rotate', // 旋转
          'draw', // 添加绘画
          'shape', // 添加形状
          'icon', // 添加图标
          'text', // 添加文本
          'mask' // 添加覆盖
          // "filter", // 添加滤镜
        ],
        menuBarPosition: 'bottom', //操作栏位置
        locale: {
          Crop: 'index.imageEditor.Crop',
          Load: 'index.imageEditor.Load',
          DeleteAll: 'index.imageEditor.DeleteAll',
          Delete: 'index.imageEditor.Delete',
          Undo: 'index.imageEditor.Undo',
          Redo: 'index.imageEditor.Redo',
          Reset: 'index.imageEditor.Reset',
          Flip: 'index.imageEditor.Flip',
          Rotate: 'index.imageEditor.Rotate',
          Draw: 'index.imageEditor.Draw',
          Shape: 'index.imageEditor.Shape',
          Icon: 'index.imageEditor.Icon',
          Text: 'index.imageEditor.Text',
          Mask: 'index.mask',
          Filter: 'index.imageEditor.Filter',
          Bold: 'index.imageEditor.Bold',
          Italic: 'index.imageEditor.Italic',
          Underline: 'index.imageEditor.Underline',
          Left: 'index.imageEditor.Left',
          Center: 'index.imageEditor.Center',
          Right: 'index.imageEditor.Right',
          Color: 'index.editor.rgbColorDialog.color',
          'Text size': 'index.imageEditor.TextSize',
          Custom: 'index.imageEditor.Custom',
          Square: 'index.imageEditor.Square',
          Apply: 'index.imageEditor.Apply',
          Cancel: 'index.imageEditor.Cancel',
          'Flip X': 'index.imageEditor.FlipX',
          'Flip Y': 'index.imageEditor.FlipY',
          Range: 'index.imageEditor.Range',
          Stroke: 'index.imageEditor.Stroke',
          Fill: 'index.imageEditor.Fill',
          Circle: 'index.imageEditor.Circle',
          Triangle: 'index.imageEditor.Triangle',
          Rectangle: 'index.imageEditor.Rectangle',
          Free: 'index.imageEditor.Free',
          Straight: 'index.imageEditor.Straight',
          Arrow: 'index.imageEditor.Arrow',
          'Arrow-2': 'index.imageEditor.Arrow2',
          'Arrow-3': 'index.imageEditor.Arrow3',
          'Star-1': 'index.imageEditor.Star1',
          'Star-2': 'index.imageEditor.Star2',
          Polygon: 'index.imageEditor.Polygon',
          Location: 'index.imageEditor.Location',
          Heart: 'index.imageEditor.Heart',
          Bubble: 'index.imageEditor.Bubble',
          'Custom icon': 'index.imageEditor.CustomIcon',
          'Load Mask Image': 'index.imageEditor.LoadMaskImage',
          Grayscale: 'index.imageEditor.Grayscale',
          Blur: 'index.imageEditor.Blur',
          Sharpen: 'index.imageEditor.Sharpen',
          Emboss: 'index.imageEditor.Emboss',
          'Remove White': 'index.imageEditor.RemoveWhite',
          Distance: 'index.imageEditor.Distance',
          Brightness: 'index.imageEditor.Brightness',
          Noise: 'index.imageEditor.Noise',
          'Color Filter': 'index.imageEditor.ColorFilter',
          Sepia: 'index.imageEditor.Sepia',
          Sepia2: 'index.imageEditor.Sepia2',
          Invert: 'index.imageEditor.Invert',
          Pixelate: 'index.imageEditor.Pixelate',
          Threshold: 'index.imageEditor.Threshold',
          Tint: 'index.imageEditor.Tint',
          Multiply: 'index.imageEditor.Multiply',
          Blend: 'index.imageEditor.Blend',
          Double: 'index.imageEditor.Double',
          Download: '',
          BGColor: 'index.imageEditor.BGColor'
        }, //语言
        theme: customImgEditorTheme //主题样式
      }
    })
  })
})
let instance = ref(null)
let isBlank = ref<boolean>(false)

// 切换反色背景
const switchBack = () => {
  isBlank.value = !isBlank.value
  let img = isBlank.value ? 'src/assets/img/blank.png' : 'src/assets/img/black.png';
  let color = isBlank.value ? '#000000' : '#ffffff';
  (instance as any).value.loadImageFromURL(img, 'blank').then((result) => {
    (instance as any).value.addTex('', {
      position: {},
      styles: {
        fill: color,
        fontSize: 85,
        fontFamily: '',
        fontStyle: '',
        fontWeight: '',
        underline: ''
      }
    })
  })
}
// 编辑信息提交
const editorCommit = () => {
  const picBase64Str = (instance as any).value.toDataURL()
  // 提交到父组件显示
  emits('editorCommit', picBase64Str)
  // 存储图像数据
  screenStore.setEiditorPicData(picBase64Str)
  // 更改裁剪状态
  screenStore.setResized(false)
}
</script>

<template>
  <div id="editor"></div>
  <div id="tools-bar">
    <ul>
      <li>
        <div @click="switchBack">切换</div>
      </li>
      <li>
        <div @click="emits('editorCancle')">取消</div>
      </li>
      <li>
        <div @click="editorCommit">确认</div>
      </li>
    </ul>
  </div>
</template>

<style scoped lang="scss">
.editor-tools {
  width: 50px;
  height: 30px;
  background: white;
  box-sizing: border-box;
}

#tools-bar {
  width: 8%;
  height: 50%;
  position: absolute;
  top: 50%;
  right: 0px;
  transform: translateY(-50%);
  background: rgba(255, 255, 255, 1);
  border-radius: 12px;
  box-shadow: 1.1px 0px 10.8px -34px rgba(0, 0, 0, 0.059), 7px 0px 81px -34px rgba(0, 0, 0, 0.12);
  border: 1px solid rgba(51, 51, 51, 0.2);
  padding: 0;
  margin: 0;
  z-index: 9999;

  ul {
    width: 100%;
    height: 100%;
    display: flex;
    flex-flow: column nowrap;
    justify-content: space-around;
    align-items: center;
    padding: 0;
    margin: 0;

    :nth-child(3)>div {
      background: rgba(243, 226, 224, 1);
    }

    li {
      height: 10%;
      width: 100%;
      list-style: none;
      display: flex;
      justify-content: center;
      align-items: center;
      cursor: pointer;

      div {
        width: 40px;
        height: 40px;
        border-radius: 9px;
        border: 0.2px solid rgba(51, 51, 51, 0.1);
        font-size: 14px;
        display: flex;
        justify-content: center;
        align-items: center;

      }
    }
  }
}
</style>
