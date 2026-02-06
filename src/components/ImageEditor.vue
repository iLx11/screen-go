<script setup="{ emit }" lang="ts">
import { onMounted, nextTick, ref } from 'vue'

import { customImgEditorTheme } from '../utils/theme'
import 'tui-image-editor/dist/tui-image-editor.css'
import { useScreenStore } from '../stores/store'
// const ImageEditor = require('dp-image-editor')
import ImageEditor from 'tui-image-editor/dist/tui-image-editor.js'

// const { t } = useLocale()
// import imgBlack from './img/black.png'
// import imgWhite from './img/blank.png'
const emits = defineEmits(['editorCancle', 'editorCommit'])
const screenStore = useScreenStore()

onMounted(() => {
  nextTick(() => {
    instance.value = new ImageEditor(document.querySelector('#editor'), {
      usageStatistics: false, //这个一定要写要不然会报错
      includeUI: {
        // 装载图片
        loadImage: {
          path: './img/black.png', //加载的图片链接
          name: 'image', //图片名称（不重要）
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
          'mask', // 添加覆盖
          'filter', // 添加滤镜
        ],
        menuBarPosition: 'bottom', //操作栏位置
        locale: {
          Crop: '裁剪',
          Load: '加载图片背景',
          DeleteAll: '删除全部',
          Delete: '删除',
          Undo: '前一步',
          Redo: '后一步',
          Reset: '重置',
          Flip: '镜像',
          Rotate: '旋转',
          Draw: '画笔',
          Shape: '图形',
          Icon: '图标',
          Text: '文字',
          Mask: '图片遮罩',
          Filter: '滤镜',
          History: '历史',
          Hand: '手型',
          ZoomIn: '放大',
          ZoomOut: '缩小',
          Bold: '加粗',
          Italic: '斜体',
          Underline: '下划线',
          Left: '左',
          Center: '中',
          Right: '右',
          Color: '颜色',
          'Text size': '字体颜色',
          Custom: '用户配置',
          Square: '正方形',
          Apply: '应用',
          Cancel: '取消',
          'Flip X': 'X镜像',
          'Flip Y': 'Y镜像',
          Range: '范围',
          Stroke: '边框',
          Fill: '填充',
          Circle: '圆',
          Triangle: '三角形',
          Rectangle: '多边形',
          Free: '自由曲线',
          Straight: '直线',
          Arrow: '箭头',
          'Arrow-2': '箭头2',
          'Arrow-3': '箭头3',
          'Star-1': '星1',
          'Star-2': '星2',
          Polygon: '多边形',
          Location: '定位标',
          Heart: '心',
          Bubble: '对话框',
          'Custom icon': '用户图标',
          'Load Mask Image': '加载图片遮罩',
          Grayscale: '去色灰色',
          Blur: '模糊',
          Sharpen: '锐化',
          Emboss: '浮雕',
          'Remove White': '去除白色',
          Distance: '距离',
          Brightness: '亮度',
          Noise: '噪点',
          'Color Filter': '彩色滤光',
          Sepia: '怀旧风',
          Sepia2: '怀旧风2',
          Invert: '反色',
          Pixelate: '像素化',
          Threshold: '阈值',
          Tint: '色调',
          Multiply: '加倍的',
          Blend: '混合',
          Double: '双倍的',
          // Download: '324',
          BGColor: '背景颜色',
        },
        theme: customImgEditorTheme, //主题样式
      },
    })
  })
})
let instance = ref(null)
let isBlank = ref<boolean>(false)

// 切换反色背景
const switchBack = () => {
  isBlank.value = !isBlank.value
  let img = isBlank.value ? './img/blank.png' : './img/black.png'
  let color = isBlank.value ? '#000000' : '#ffffff'
  ;(instance as any).value.loadImageFromURL(img, 'blank').then(result => {
    ;(instance as any).value.addText('', {
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
  box-shadow:
    1.1px 0px 10.8px -34px rgba(0, 0, 0, 0.059),
    7px 0px 81px -34px rgba(0, 0, 0, 0.12);
  border: 1px solid rgba(51, 51, 51, 0.2);
  padding: 0;
  margin: 0;
  z-index: var(--z-index-2);

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
