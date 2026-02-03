<script setup lang="ts">
import WindowTitle from '../components/tools/WindowTitle.vue'
import ScreenEditor from '@/components/screen/ScreenEditor.vue'
import { onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { useConfigStore } from '../stores/configStore'
import { useRouter } from 'vue-router'
// import ScreenFunc from '@/components/screenPage/ScreenFunc.vue'
// import { PROTOCOL_HEAD_ARR, PROTOCOL_CMD } from '@/utils/data/protocol'
// import FilerobotEditor from '../components/screenPage/FilerobotEditor.vue'
import { storeSetter } from '@/utils/tools/storeTools'

const router = useRouter()
const win = window as any
const configStore = useConfigStore()

onMounted(() => {
  win.api.storeChangeListener((objData: object) => {
    // set 属性处理
    storeSetter(objData, (path: string, value: any) => {
      // 设置对应 store 的值
      if (path == 'configStore.curScreen') {
        // if (configStore.curScreen > 0) {
        //   // 隐藏屏幕功能选择组件
        //   screenFuncShow.value = false
        // }
      }
    })
  })

  // 获取 配置的索引
  win.api.setConfigStore({
    get: 'configStore.curScreen',
  })

  win.api.setConfigStore({
    get: 'configStore.curMenu',
  })
})

const screenFuncShow = ref<boolean>(true)
const filerobotEditorRef = ref(null)

/********************************************************************************
 * @brief: 提交屏幕功能
 * @return {*}
 ********************************************************************************/
const commitScreenFunc = () => {
  // const funcType = screenFuncRef.value?.getSelectFunc()
  // if (!funcType) {
  //   win.api.closeWindow()
  //   return
  // }
  let tempObj: object = {
    // set: `configStore.screenData[${configStore.curScreen}]`,
    // value: JSON.stringify({
    //   // 图片 base 数据 / 图片地址
    //   baseData: screenFuncRef.value?.getSelectImgPath(),
    //   // 图片取模数据 / 屏幕功能对应的指令
    //   buffData: PROTOCOL_HEAD_ARR.concat(
    //     [PROTOCOL_CMD.USE_SCREEN_FUNC],
    //     screenFuncRef.value?.getSelectFunc() || [0, 0],
    //   ),
    // }),
  }
  win.api.setConfigStore(tempObj)
  win.api.closeWindow()
}

/********************************************************************************
 * @brief: 关闭窗口
 * @return {*}
 ********************************************************************************/
const closeWindow = () => {
  win.api.closeWindow()
}
</script>

<template>
  <div id="editor-container">
    <WindowTitle>
      <template #title>
        <div class="win-title">ScreenEditor</div>
      </template>
    </WindowTitle>
    <div id="screen-config-content">
      <!-- 屏幕编辑组件 -->
      <ScreenEditor />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.win-title {
  @include global.flex_center;
  color: var(--text-color-1);
}
#cover {
  width: 98%;
  height: 98%;
  @include global.ab_center;
  @include global.style_common(15px, rgba(51, 51, 51, 0.2));
  z-index: var(--z-index-4);
}
#editor-container {
  @include global.full_wh;
  @include global.ab_center;
  // border: 6px solid rgba(73, 74, 77, 0.9);
  border-radius: 25px;
  overflow: hidden;
  box-sizing: border-box;
  padding: 10px;
  padding-top: 6px;
  z-index: var(--z-index-1);
  color: var(--text-color-1);
  // padding-bottom: 12px;
  background-color: #ffffff;
  // background-image: linear-gradient(
  //   135deg,
  //   #c6b5b5 0%,
  //   #869497 87%,
  //   #8f9091 100%
  // );
  padding-bottom: 4em;
  position: relative;
}
#screen-config-content {
  @include global.full_wh;
  // min-width: 950px;
  // min-height: 750px;
  margin: 0 auto;
  overflow: hidden;
  @include global.style_common(25px, rgb(240, 240, 240));

  #screen-tool {
    @include global.wh(100%, 10%);
    @include global.pos_ab(30px, 0, 2);
    @include global.flex_config(0, space-between);
    padding: 0 20px;
    > div {
      @include global.flex_center;
      @include global.font_config(2vw, rgb(224, 224, 224));
      cursor: pointer;
    }
    // 显示自定义
    :nth-child(1) {
      @include global.wh(30%, 100%);
      @include global.style_common(20px, rgb(46, 53, 56));
    }
    // 确定与返回
    :nth-child(2) {
      @include global.wh(67%, 100%);
      @include global.style_common(20px, rgb(115, 115, 115));
      @include global.flex_config(0, space-between);
      padding: 5px;
      > div {
        @include global.flex_center;
        @include global.style_common(15px, rgba(46, 53, 56, 0.4));
      }
      :nth-child(1) {
        @include global.wh(30%, 100%);
      }
      :nth-child(2) {
        @include global.wh(67%, 100%);
      }
    }
  }
}
</style>
