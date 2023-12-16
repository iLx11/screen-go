<script setup lang="ts">
import { reactive, ref, watch, onMounted } from 'vue'
import { useScreenStore } from '../stores/store'

const screenStore = useScreenStore()
const configData = reactive({
  arrayName: 'unsigned char bmp',
  preComment: '// 图片数组开始',
  backComment: '// 图片数组结束',
  replaceSource1: '',
  replaceTarget1: '',
  replaceSource2: '',
  replaceTarget2: ''
})

watch(configData, () => {
  screenStore.setConfigData(configData)
}, {
  deep: true,
  immediate: true
})
const modifyData = () => {
  screenStore.setModify(true)
  screenStore.showText("数据修改成功！")
}
</script>

<template>
  <div id="result-data-config">
    <div class="div1">数组名</div>
    <div class="div2">
      <input type="text" v-model="configData.arrayName" />
    </div>
    <div class="div3">数组前缀注释</div>
    <div class="div4">
      <input type="text" v-model="configData.preComment" />
    </div>
    <div class="div5">数组后缀注释</div>
    <div class="div6">
      <input type="text" v-model="configData.backComment" />
    </div>
    <div class="div7"><input type="text" style="font-size: 13px" placeholder="自定义替换"
        v-model="configData.replaceSource1" /></div>
    <div class="div8">
      <input type="text" placeholder="替换数据" v-model="configData.replaceTarget1" />
    </div>
    <div class="div9"><input type="text" style="font-size: 13px" placeholder="自定义替换"
        v-model="configData.replaceSource2" /></div>
    <div class="div10">
      <input type="text" placeholder="替换数据" v-model="configData.replaceTarget2" />
    </div>
    <div class="div11" @click="modifyData">修改数据</div>
  </div>
</template>

<style scoped lang="scss">
#result-data-config {
  width: 100%;
  height: 100%;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-template-rows: repeat(5, 1fr);
  column-gap: 4px;
  row-gap: 4px;
  padding: 1em;
  border: none;
  overflow: hidden;

  >div {
    border: none;
    background: var(--data-config-title-box-color);
    border-radius: 9px;
    display: flex;
    justify-content: center;
    align-items: center;
    text-align: center;
    overflow: hidden;
  }

  input {
    width: 100%;
    height: 100%;
    outline: none;
    border: none;
    font-size: 15px;
    text-align: center;
    font-family: 'ceyy';
    color: var(--text-color-1);
    background: var(--data-config-input-color);
  }

  .div1 {
    grid-area: 1 / 1 / 2 / 2;
    font-size: 14px;

  }

  .div2 {
    grid-area: 1 / 2 / 2 / 4;
  }

  .div3 {
    grid-area: 2 / 1 / 3 / 2;
    font-size: 14px;

  }

  .div4 {
    grid-area: 2 / 2 / 3 / 4;
  }

  .div5 {
    grid-area: 3 / 1 / 4 / 2;
    font-size: 14px;

  }

  .div6 {
    grid-area: 3 / 2 / 4 / 4;
  }

  .div7 {
    grid-area: 4 / 1 / 5 / 2;
  }

  .div8 {
    grid-area: 4 / 2 / 5 / 4;
  }

  .div9 {
    grid-area: 5 / 1 / 6 / 2;
  }

  .div10 {
    grid-area: 5 / 2 / 6 / 4;
  }

  .div11 {
    grid-area: 1 / 4 / 6 / 5;
    display: flex;
    justify-content: center;
    align-items: center;
    writing-mode: tb-rl;
    font-size: 19px;
    background: var(--config-botton-color);
    cursor: pointer;
  }
}</style>
