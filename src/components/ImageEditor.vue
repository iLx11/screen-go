<script setup="{ emit }" lang="ts">
import { onMounted, nextTick, ref } from 'vue'

import { customImgEditorTheme } from '../utils/theme'
import useLocale from '../hooks/lang'
import 'dp-image-editor/dist/tui-image-editor.css'
// import imageTool from '../utils/Base64ToHexArray.ts'
import ImageToHexArray from '../utils/ImageToHexArray'
// import { imgEditorHandle } from '../utils/imgTools'
import {useScreenStore} from '../store/store'

const { ipcRenderer } = require('electron')
const ImageEditor = require('dp-image-editor')
const { t } = useLocale()
const emits = defineEmits(['editorCancle', 'editorCommit'])
const screenStore = useScreenStore()

onMounted(() => {
  nextTick(() => {
    instance.value = new ImageEditor(document.querySelector('#editor'), {
      usageStatistics: false, //这个一定要写要不然会报错
      includeUI: {
        loadImage: {
          path: 'src/renderer/assets/img/black.png', //加载的图片链接
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
          Crop: t('index.imageEditor.Crop'),
          Load: t('index.imageEditor.Load'),
          DeleteAll: t('index.imageEditor.DeleteAll'),
          Delete: t('index.imageEditor.Delete'),
          Undo: t('index.imageEditor.Undo'),
          Redo: t('index.imageEditor.Redo'),
          Reset: t('index.imageEditor.Reset'),
          Flip: t('index.imageEditor.Flip'),
          Rotate: t('index.imageEditor.Rotate'),
          Draw: t('index.imageEditor.Draw'),
          Shape: t('index.imageEditor.Shape'),
          Icon: t('index.imageEditor.Icon'),
          Text: t('index.imageEditor.Text'),
          Mask: t('index.mask'),
          Filter: t('index.imageEditor.Filter'),
          Bold: t('index.imageEditor.Bold'),
          Italic: t('index.imageEditor.Italic'),
          Underline: t('index.imageEditor.Underline'),
          Left: t('index.imageEditor.Left'),
          Center: t('index.imageEditor.Center'),
          Right: t('index.imageEditor.Right'),
          Color: t('index.editor.rgbColorDialog.color'),
          'Text size': t('index.imageEditor.TextSize'),
          Custom: t('index.imageEditor.Custom'),
          Square: t('index.imageEditor.Square'),
          Apply: t('index.imageEditor.Apply'),
          Cancel: t('index.imageEditor.Cancel'),
          'Flip X': t('index.imageEditor.FlipX'),
          'Flip Y': t('index.imageEditor.FlipY'),
          Range: t('index.imageEditor.Range'),
          Stroke: t('index.imageEditor.Stroke'),
          Fill: t('index.imageEditor.Fill'),
          Circle: t('index.imageEditor.Circle'),
          Triangle: t('index.imageEditor.Triangle'),
          Rectangle: t('index.imageEditor.Rectangle'),
          Free: t('index.imageEditor.Free'),
          Straight: t('index.imageEditor.Straight'),
          Arrow: t('index.imageEditor.Arrow'),
          'Arrow-2': t('index.imageEditor.Arrow2'),
          'Arrow-3': t('index.imageEditor.Arrow3'),
          'Star-1': t('index.imageEditor.Star1'),
          'Star-2': t('index.imageEditor.Star2'),
          Polygon: t('index.imageEditor.Polygon'),
          Location: t('index.imageEditor.Location'),
          Heart: t('index.imageEditor.Heart'),
          Bubble: t('index.imageEditor.Bubble'),
          'Custom icon': t('index.imageEditor.CustomIcon'),
          'Load Mask Image': t('index.imageEditor.LoadMaskImage'),
          Grayscale: t('index.imageEditor.Grayscale'),
          Blur: t('index.imageEditor.Blur'),
          Sharpen: t('index.imageEditor.Sharpen'),
          Emboss: t('index.imageEditor.Emboss'),
          'Remove White': t('index.imageEditor.RemoveWhite'),
          Distance: t('index.imageEditor.Distance'),
          Brightness: t('index.imageEditor.Brightness'),
          Noise: t('index.imageEditor.Noise'),
          'Color Filter': t('index.imageEditor.ColorFilter'),
          Sepia: t('index.imageEditor.Sepia'),
          Sepia2: t('index.imageEditor.Sepia2'),
          Invert: t('index.imageEditor.Invert'),
          Pixelate: t('index.imageEditor.Pixelate'),
          Threshold: t('index.imageEditor.Threshold'),
          Tint: t('index.imageEditor.Tint'),
          Multiply: t('index.imageEditor.Multiply'),
          Blend: t('index.imageEditor.Blend'),
          Double: t('index.imageEditor.Double'),
          Download: '',
          BGColor: t('index.imageEditor.BGColor')
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
  let img = isBlank.value ? 'src/renderer/assets/img/blank.png' : 'src/renderer/assets/img/black.png'
  let color = isBlank.value ? '#000000' : '#ffffff'
  instance.value.loadImageFromURL(img, 'blank').then((result) => {
    instance.value.addText('', {
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
  const picBase64Str = instance.value.toDataURL()
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
    :nth-child(3) > div {
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
