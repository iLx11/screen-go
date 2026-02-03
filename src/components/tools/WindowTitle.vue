<script setup lang="ts">
import WindowTools from './WindowTools.vue'

const win = window as any
</script>

<template>
  <div class="top-tool">
    <div class="top-tool-ab">
      <div class="tool-title-box">
        <!-- 窗户标识 -->
        <div class="window-sign"></div>
        <!-- 标题 -->
        <slot name="title"></slot>
      </div>
      <!-- 窗口工具 -->
      <WindowTools />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.top-tool {
  @include global.wh(100%, 50px);
  @include global.font_config(20px, rgba(255, 255, 255, 0.9));
  border-radius: 12px;
  -webkit-app-region: drag;
  .top-tool-ab {
    @include global.wh(100%, 30px, 100%, 30px);
    @include global.flex_config(0, space-between);
    @include global.pos_ab(0, 50%);
    transform: translate(-50%, 15px);
    padding: 0 18px;
    z-index: var(--z-index-5);
    .tool-title-box {
      width: 50%;
      @include global.flex_config(0, flex-start);
      gap: 15px;
      padding-left: 15px;
      .window-sign {
        @include global.wh(3px, 20px);
        @include global.style_common(6px, rgba(51, 51, 51, 0.4));
      }
    }
  }
}
</style>
