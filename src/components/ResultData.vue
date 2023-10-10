<script setup lang="ts">
import { reactive, ref, watch, onMounted } from 'vue'
import { useScreenStore } from '../stores/store'

const screenStore = useScreenStore()
const resultString = ref<string>('')
watch(
  () => screenStore.resultString,
  () => {
    resultString.value = `${screenStore.configData['preComment']}\n${screenStore.configData['arrayName']} = {\n  ${screenStore.resultString}\n}\n${(screenStore.configData as any).backComment}\n`
  }
)
watch(
  () => screenStore.isConfigModify,
  () => {
    if (screenStore.isConfigModify == true) {
      screenStore.setModify(false)
      resultString.value = `${screenStore.configData['preComment']}\n${screenStore.configData['arrayName']} = {\n  ${screenStore.resultString}\n}\n${screenStore.configData['backComment']}\n`
      let repS1 = screenStore.configData['replaceSource1']
      let repT1 = screenStore.configData['replaceTarget1']
      let repS2 = screenStore.configData['replaceSource2']
      let repT2 = screenStore.configData['replaceTarget2']
      if (repS1 != '') {
        resultString.value = resultString.value.replace(eval('/' + repS1 + '/gi'), repT1)
      }
      if (repS2 != '') {
        resultString.value = resultString.value.replace(eval('/' + repS2 + '/gi'), repT2)
      }
    }
  }
)

const resultData = ref<HTMLElement | null>(null)
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
            screenStore.showText('复制成功!')
          })
          .catch((error) => {
            console.error('复制失败:', error)
            screenStore.showText('复制失败!')
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
          screenStore.showText('复制成功!')
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
  <!-- <PopBox /> -->
  <div id="result-data-content" v-copy="resultString">
    {{ resultString }}
    <div id="info">点击文本可复制</div>
  </div>
</template>

<style lang="scss" scoped>
#result-data-content {
  width: 100%;
  height: 100%;
  border: none;
  padding: 1em;
  box-sizing: border-box;
  word-break: break-all;
  overflow: scroll;
  white-space: pre-wrap;
  position: relative;
  div {
    border: none;
  }
}
#info {
  width: 100px;
  height: 30px;
  position: absolute;
  top: 0;
  right: 0;
  background: rgba(255, 255, 255, 0.9);
  display: flex;
  justify-content: center;
  align-items: center;
  box-shadow: 1.1px 0px 10.8px -34px rgba(0, 0, 0, 0.059), 7px 0px 81px -34px rgba(0, 0, 0, 0.12);

}
</style>
