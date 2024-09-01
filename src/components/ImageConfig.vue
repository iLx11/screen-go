<script setup lang="ts">
import { reactive, ref, watch, onMounted } from 'vue'
import { useScreenStore } from '../stores/store'
import { getItem, setItem } from '../utils/storage'
import FuncBox from "../components/FuncBox.vue"
import {XBox} from '@/utils/xBox/xBox.js'

// const { ipcRenderer } = require('electron')
const win = window as any

const screenStore = useScreenStore()
onMounted(() => {
  let tempArray = JSON.parse(getItem('configArray'))
  if (tempArray != null) {
    setLatticeFormat(tempArray[0])
    setModeMethod(tempArray[1])
    setModeDirection(tempArray[2])
    setOutputDecimal(tempArray[3])
  }
  let presetArray = JSON.parse(getItem('presetArray'))
  if (presetArray != null)
    presetArray.forEach((element, index) => {
      preSize[index] = element
    })
})
// -------------------------------- 图片设置 ---------------------------------
const resizeText = ref<string>('图片缩放预览')
const picSizeData = reactive({
  width: '',
  height: ''
})

watch(() => screenStore.configArray[4], () => {
  if(screenStore.configArray[4]) {
    setLatticeFormat(1)
    setModeMethod(2)
    setModeDirection(0)
    setOutputDecimal(0)
  }else {
    setLatticeFormat(1)
    setModeMethod(0)
    setModeDirection(0)
    setOutputDecimal(0)
  }
})

watch(() => screenStore.isCroped, () => {
    picSizeData.width = screenStore.resizeWidth.toString()
    picSizeData.height = screenStore.resizeHeight.toString()
}, {
  deep: true,
  immediate: true
})

watch(
  picSizeData,
  () => {
    screenStore.resizeWidth = parseInt(picSizeData.width)
    screenStore.resizeHeight = parseInt(picSizeData.height)
  },
  {
    deep: true,
    immediate: false
  }
)

const preSize: object[] = reactive([{}, {}, {}])

watch(
  () => screenStore.isCountModify,
  () => {
    if (screenStore.isCountModify == true) {
      screenStore.setCountModify(false)
      preSize[screenStore.preSizeCount] = {
        width: picSizeData.width,
        height: picSizeData.height
      }
    }
  },
  {
    immediate: true
  }
)

// 图片大小预设值
const setPreSize = (v: object) => {
  picSizeData.width = v['width']
  picSizeData.height = v['height']
}
// 图片缩放预览
const resizePic = async () => {
  if (screenStore.editorPicData != '' && screenStore.isResized == false) {
    // 图片裁剪
    if (picSizeData.height != '' && picSizeData.width != '') {
      if(picSizeData.height == '0' || picSizeData.width == '0') {
        XBox.popMes('请正确设置图片大小!')
        return
      }
      screenStore.setWaitExecute(true)
      const data = await win.myApi.resizeImage(parseInt(picSizeData.width), parseInt(picSizeData.height), screenStore.editorPicData, screenStore.configArray[4])
      screenStore.setResizePicData(data)
      screenStore.setResized(true)
      resizeText.value = '返回原始图片'
      XBox.popMes('执行完成')
      screenStore.setWaitExecute(false)
      return
    } else XBox.popMes('请设置图片的大小！')
  } else {
    if (screenStore.editorPicData == '') XBox.popMes('请先设置一个图片！')
  }
  if (screenStore.resizePicData != '' && screenStore.isResized == true) {
    screenStore.setResized(false)
    resizeText.value = '图片缩放预览'
  }
}

// -------------------------------- 取模设置 ---------------------------------
// 点阵格式
const formatBoxLeft = ref<string>(2 + '%')
const latticeFormat = reactive<string[]>(['阳码', '阴码'])
const setLatticeFormat = (k: number) => {
  formatBoxLeft.value = k * 50 + 2 + '%'
  screenStore.setConfigArray(0, k)
}
// 取模方式
const moveBoxLeft = ref<string>(2 + '%')
const modeMethod = reactive<string[]>(['逐行式', '逐列式', '列行式', '行列式'])
const setModeMethod = (k: number) => {
  if(!screenStore.configArray[4] && screenStore.configArray[1] != 0)
    XBox.popMes('目前彩色取模只支持逐行哦！')
  moveBoxLeft.value = k * 25 + 2 + '%'
  screenStore.setConfigArray(1, k)
}
// 取模走向
const moveDirectionBoxLeft = ref<string>(5.5 + '%')
const modeDirection = reactive<string[]>(['逆向', '顺向'])
const setModeDirection = (k: number) => {
  moveDirectionBoxLeft.value = k * 45 + 5.5 + '%'
  screenStore.setConfigArray(2, k)
}
// 输出进制
const outputBoxLeft = ref<string>(5.5 + '%')
const outputDecimal = reactive<string[]>(['十六进制', '十进制'])
const setOutputDecimal = (k: number) => {
  outputBoxLeft.value = k * 45 + 5.5 + '%'
  screenStore.setConfigArray(3, k)
}
watch(
  screenStore.configArray,
  () => {
    setItem('configArray', JSON.stringify(screenStore.configArray))
  },
  {
    deep: true,
    immediate: true
  }
)
</script>

<template>
  <div id="config-content">
    <div id="img-size-config">
      <div id="func-box">
        <FuncBox />
      </div>
      <div id="resize-config-box">
        <div class="input-group">
          <input type="text" class="input" v-model="picSizeData.width" />
          <label class="user-label">宽度:</label>
        </div>
        <div class="input-group">
          <input type="text" class="input" v-model="picSizeData.height" />
          <label class="user-label">高度:</label>
        </div>
      </div>
      <div id="size-choose-box">
        <div v-for="(v, k) in preSize" :key="k" @click="setPreSize(v)">{{ v['width'] }} - {{ v['height'] }}</div>
      </div>
      <div @click="resizePic">{{ resizeText }}</div>
    </div>
    <div id="img-data-config">
      <div class="div1">点阵<br />格式</div>
      <div class="div2">
        <div v-for="(v, k) in latticeFormat" :key="k" @click="setLatticeFormat(k)">
          {{ v }}
        </div>
        <div id="format-move-box" :style="{ left: formatBoxLeft }"></div>
      </div>
      <div class="div3">取模方式</div>
      <div class="div4">
        <div v-for="(v, k) in modeMethod" :key="k" @click="setModeMethod(k)">
          {{ v }}
        </div>
        <div id="mode-move-box" :style="{ left: moveBoxLeft }"></div>
      </div>
      <div class="div5">取模走向</div>
      <div class="div6">
        <div v-for="(v, k) in modeDirection" :key="k" @click="setModeDirection(k)">
          {{ v }}
        </div>
        <div id="mode-direction-move-box" :style="{ left: moveDirectionBoxLeft }"></div>
      </div>
      <div class="div7">输出进制</div>
      <div class="div8">
        <div v-for="(v, k) in outputDecimal" :key="k" @click="setOutputDecimal(k)">
          {{ v }}
        </div>
        <div id="output-move-box" :style="{ left: outputBoxLeft }"></div>
      </div>
      <div class="div9"></div>
      <div class="div10"></div>
      <div class="div11"></div>
      <div class="div12"></div>
    </div>
  </div>
</template>

<style scoped lang="scss">
#config-content {
  width: 100%;
  height: 100%;
  display: flex;
  flex-flow: row nowrap;
  justify-content: space-between;
  align-items: center;
  padding: 0.7em;
  border: none;

  > div {
    width: 48.5%;
    height: 100%;
    border-radius: 10px;
    border: none;
  }

  #img-size-config {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    grid-template-rows: repeat(5, 1fr);
    column-gap: 5px;
    row-gap: 5px;

    > div {
      border: none;
      background: var(--data-config-title-box-color);
    }

    #func-box {
      grid-area: 1 / 1 / 5 / 2;
      display: flex;
      flex-flow: column wrap;
      justify-content: center;
      align-items: center;
      // writing-mode: tb-rl;
      // font-size: 18px;
      color: var(--text-color-2);
    }

    #resize-config-box {
      width: 100%;
      height: 100%;
      grid-area: 1 / 2 / 3 / 4;
      display: flex;
      flex-flow: column nowrap;
      justify-content: space-around;
      align-items: center;
      padding: 0.5em;
      background: var(--data-config-input-color);
      
      > div {
        border: none;
      }

      .input-group {
        width: 100%;
        height: 42%;
        position: relative;
        box-sizing: border-box;
        // overflow: hidden;
        // border-radius: 9px;
        display: flex;
        justify-content: center;
        align-items: center;
        color: var(--text-color-2);
        font-weight: 900;
        padding: 0.1em;
        box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.8);

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
        }

        .user-label {
          width: 29px;
          height: 50%;
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
    }

    #size-choose-box {
      grid-area: 3 / 2 / 5 / 4;
      display: flex;
      flex-flow: column nowrap;
      justify-content: space-between;
      align-items: center;
      padding: 0.66em;
      box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.8);

      > div {
        width: 100%;
        height: 27%;
        background: var(--data-size-box-color);
        display: flex;
        justify-content: center;
        align-items: center;
        color: rgba(51, 51, 51, 0.6);
        border: 0.03px solid rgba(51, 51, 51, 0.1);
        border-radius: 7px;
        cursor: pointer;
      }
    }

    :nth-child(4) {
      grid-area: 5 / 1 / 6 / 4;
      display: flex;
      justify-content: center;
      align-items: center;
      font-size: 18px;
      color: var(--text-color-2);
      cursor: pointer;
      background: var(--config-botton-color);
    }
  }

  // ------------------ 取模设置 -------------------
  #img-data-config {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    grid-template-rows: repeat(7, 1fr);
    column-gap: 4px;
    row-gap: 4px;
    color: var(--text-color-1);
    box-shadow: 0 0 0 4px rgba(255, 255, 255, 0.8);

    > div {
      border: none;
      background: var(--data-config-title-box-color);
      border-radius: 10px;
    }

    div {
      border: none;
      display: flex;
      justify-content: center;
      align-items: center;
    }

    .div1 {
      grid-area: 1 / 1 / 2 / 2;
      font-size: 12px;
    }

    .div2 {
      grid-area: 1 / 2 / 2 / 5;
      justify-content: space-around;
      background: var(--data-config-func-box-color);
      position: relative;
      font-size: 14.5px;
      > div {
        width: 46%;
        height: 100%;
        cursor: pointer;
      }

      #format-move-box {
        width: 45%;
        height: 80%;
        position: absolute;
        background: var(--data-config-move-box-color);
        z-index: -1;
        transition: all 0.6s ease-in-out;
        border-radius: 8px;
        border: 0.1px solid rgba(51, 51, 51, 0.2);
        box-shadow: 2.6px 0.5px 10px rgba(0, 0, 0, 0.023), 21px 4px 80px rgba(0, 0, 0, 0.07);
      }
    }

    .div3 {
      grid-area: 2 / 1 / 3 / 5;
      font-size: 13px;
    }

    .div4 {
      grid-area: 3 / 1 / 5 / 5;
      justify-content: space-between;
      align-items: center;
      position: relative;
      padding: 0.3em;
      background: var(--data-config-func-box-color);
      overflow: hidden;

      > div {
        width: 22%;
        height: 100%;
        writing-mode: tb-rl;
        cursor: pointer;
        font-size: 14px;
      }

      #mode-move-box {
        width: 22%;
        height: 90%;
        position: absolute;
        background: var(--data-config-move-box-color);
        z-index: -1;
        transition: all 0.6s ease-in-out;
        border: 0.1px solid rgba(51, 51, 51, 0.2);
        border-radius: 8px;
        box-shadow: 2.6px 0.5px 10px rgba(0, 0, 0, 0.023), 21px 4px 80px rgba(0, 0, 0, 0.07);
      }
    }

    .div5 {
      grid-area: 5 / 1 / 6 / 3;
      font-size: 13px;
    }

    .div6 {
      grid-area: 6 / 1 / 8 / 3;
      justify-content: space-around;
      align-items: center;
      padding: 0.3em;
      position: relative;
      background: var(--data-config-func-box-color);

      > div {
        width: 45%;
        height: 100%;
        writing-mode: tb-rl;
        cursor: pointer;
        font-size: 13px;
      }

      #mode-direction-move-box {
        width: 45%;
        height: 90%;
        position: absolute;
        background: var(--data-config-move-box-color);
        z-index: -1;
        border-radius: 8px;
        border: 0.1px solid rgba(51, 51, 51, 0.2);
        transition: all 0.5s ease-in-out;
        box-shadow: 2.6px 0.5px 10px rgba(0, 0, 0, 0.023), 21px 4px 80px rgba(0, 0, 0, 0.07);
      }
    }

    .div7 {
      grid-area: 5 / 3 / 6 / 5;
      font-size: 13px;
    }

    .div8 {
      grid-area: 6 / 3 / 8 / 5;
      justify-content: space-around;
      align-items: center;
      padding: 0.3em;
      background: var(--data-config-func-box-color);
      position: relative;

      > div {
        width: 45%;
        height: 100%;
        writing-mode: tb-rl;
        cursor: pointer;
        font-size: 12px;
      }

      #output-move-box {
        width: 45%;
        height: 90%;
        position: absolute;
        background: var(--data-config-move-box-color);
        z-index: -1;
        border-radius: 8px;
        border: 0.1px solid rgba(51, 51, 51, 0.15);
        transition: all 0.5s ease-in-out;
        box-shadow: 2.6px 0.5px 10px rgba(0, 0, 0, 0.023), 21px 4px 80px rgba(0, 0, 0, 0.07);
      }
    }

    .div9 {
      grid-area: 1/ 1/ 2/ 5;
      z-index: -1;
      padding: 1em;
    }

    .div10 {
      grid-area: 2/ 1/ 5/ 5;
      z-index: -1;
    }

    .div11 {
      grid-area: 5 / 1 / 8 / 3;
      z-index: -1;
    }

    .div12 {
      grid-area: 5 / 3 / 8 / 5;
      z-index: -1;
    }
  }
}
</style>
