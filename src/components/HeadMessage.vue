<script lang="ts" setup>
import { ref } from 'vue'
import { useScreenStore } from '../stores/store'
import {XBox} from '@/utils/xBox/xBox.js'

const screenStore = useScreenStore()
const messageBoxShow = ref<boolean>(false)

const showMessgeBox = () => {
  messageBoxShow.value = true
}
const hideMessageBox = () => {
  messageBoxShow.value = false
}
const copyText = ['https://github.com/yhf98', 'https://github.com/iLx11/screen-go']
// 自定义复制指令
const vCopy = {
  mounted: (el: any, { value }: any) => {
    el.$value = value
    el.handler = () => {
      if (!el.$value) {
        return
      }
      if (navigator.clipboard && window.isSecureContext) {
        // 检查浏览器是否支持 Clipboard API
        navigator.clipboard
          .writeText(el.$value)
          .then(() => {
            XBox.popMes('复制成功!')
          })
          .catch((error) => {
            console.error('复制失败:', error)
            XBox.popMes('复制失败!')
          })
      } else {
        const textarea = document.createElement('textarea')
        textarea.readOnly = true
        textarea.style.position = 'absolute'
        textarea.style.left = '-6666px'
        textarea.value = el.$value
        document.body.appendChild(textarea)
        textarea.select()
        if (document.execCommand('Copy')) {
          XBox.popMes('复制成功!')
        }
        document.body.removeChild(textarea)
      }
    }
    //绑定事件
    el.addEventListener('click', el.handler)
  },
  //当传进来的值更新的时候触发
  updated(el, { value }) {
    el.$value = value
  },
  //指令与元素解绑的时候
  unMounted(el) {
    el.removeEventListener('click', el.handler)
  }
}
</script>

<template>
  <div id="head-message" @click="showMessgeBox">
    <div>
      <svg t="1696501327826" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="13346" width="32" height="32" data-spm-anchor-id="a313x.search_index.0.i10.77e73a81rcqrwa">
        <path
          d="M896 512a384 384 0 1 0-384 384 384 384 0 0 0 384-384z m64 0A448 448 0 1 1 512 64a448 448 0 0 1 448 448z"
          fill="#e6e6e6"
          p-id="13347"
          class="sweezy-custom-cursor-hover"
          style='null;cursor: url("data:image/png;base64,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") 5 2, pointer !important;'
          data-spm-anchor-id="a313x.search_index.0.i13.77e73a81rcqrwa"
        ></path>
        <path
          d="M608 672a32 32 0 0 1 0 64h-192a32 32 0 0 1 0-64z"
          fill="#f0b4d1"
          p-id="13348"
          class="sweezy-custom-cursor-hover"
          style='null;cursor: url("data:image/png;base64,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") 5 2, pointer !important;'
          data-spm-anchor-id="a313x.search_index.0.i15.77e73a81rcqrwa"
        ></path>
        <path
          d="M480 448h-32a32 32 0 0 1 0-64h64a32 32 0 0 1 32 32v256a32 32 0 0 1-64 0zM544 320a32 32 0 1 1-32-32 32 32 0 0 1 32 32"
          fill="#8a8a8a"
          p-id="13349"
          class="sweezy-custom-cursor-hover"
          style='null;cursor: url("data:image/png;base64,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") 5 2, pointer !important;'
          data-spm-anchor-id="a313x.search_index.0.i14.77e73a81rcqrwa"
        ></path>
      </svg>
      <h1>ScreenGo-iLx1</h1>
    </div>
  </div>
  <div id="message-show-box" v-if="messageBoxShow" @click.stop="hideMessageBox"></div>
  <div id="message-show" v-if="messageBoxShow">
    &nbsp;&nbsp;此项目基于大佬<span href="" v-copy="copyText[0]"> yhf </span> 的项目思路所开发，并遵循 MIT 开源协议<br /><br />
    &nbsp;&nbsp;此项目为图片取模软件<br>&nbsp;&nbsp;🍚 可以直接模拟对硬件屏幕的布局和显示进行编辑和调整<br>&nbsp;&nbsp;🍫  可以导入任何类型的图片<br>&nbsp;&nbsp;🍜 编辑文字与图形<br>&nbsp;&nbsp;🥘 添加与调整不同滤镜<br>&nbsp;&nbsp;🥠 任意缩放与裁剪图片<br>&nbsp;&nbsp;🍵 支持单色和彩色图片取模，并直接生成可修改可一键复制的图片取模数组（支持正则替换修改）。<br /><br />
    &nbsp;&nbsp;项目 <span href="" v-copy="copyText[1]"> 开源地址 </span><br><br>
    &nbsp;&nbsp;之后应该会不断优化此软件或开发更多有意思的软件，感谢您的支持！！！
  </div>
</template>

<style scoped lang="scss">
#head-message {
  width: 20%;
  height: 30px;
  position: absolute;
  top: 28px;
  left: 30px;
  z-index: 99;
  -webkit-app-region: no-drag;
  cursor: pointer;
  div {
    border: none;
  }
  svg {
    margin-right: 1em;
  }
  > div:nth-child(1) {
    display: flex;
    flex-flow: row nowrap;
    justify-content: flex-start;
    align-items: center;
  }
  > div:nth-child(2) {
    margin-left: 3.5em;
  }
}

#message-show-box {
  width: 100%;
  height: 100%;
  position: fixed;
  top: 0;
  left: 0;
  background: rgba(51, 51, 51, 0.2);
  z-index: 99;
}
#message-show {
  width: 75%;
  height: 75%;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(255, 255, 255, 1);
  border-radius: 20px;
  padding: 2em;
  font-size: 20px;
  color: var(--text-color-1);
  z-index: 999;
  overflow-y: scroll;
  line-height: 32px;
  span {
    text-decoration: none;
    color: var(--span-text-color);
    font-size: 20px;
    cursor: pointer;
  }
}
</style>
