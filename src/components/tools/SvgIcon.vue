<template>
  <svg
    aria-hidden="true"
    class="svg-icon"
    :style="{ width: size, height: size, color: color }"
  >
    <use
      :xlink:href="symbolId"
      :style="{ width: size, height: size, color: color }"
    />
  </svg>
</template>

<script setup lang="ts">
import { computed } from 'vue'
const props = defineProps({
  prefix: {
    type: String,
    default: 'icon',
  },
  iconClass: {
    type: String,
    required: false,
    default: '',
  },
  color: {
    type: String,
    default: '', // 留空则继承父元素color，传值则覆盖
  },
  size: {
    type: String,
    default: '1em',
  },
})

const symbolId = computed(() => `#${props.prefix}-${props.iconClass}`)
</script>

<style scoped>
.svg-icon {
  display: inline-block;
  width: 2em;
  height: 2em;
  overflow: hidden;
  vertical-align: -0.15em;
  outline: none;
  fill: currentColor;
  color: inherit;
}

:deep(svg *),
:deep(path),
:deep(g),
:deep(circle),
:deep(rect) {
  fill: currentColor !important;
  /* 可选：如果SVG有描边，也让stroke继承颜色，按需开启 */
  /* stroke: currentColor !important; */
}
</style>
