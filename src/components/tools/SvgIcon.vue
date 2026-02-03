<template>
  <svg
    aria-hidden="true"
    class="svg-icon"
    :style="'width:' + size + ';height:' + size"
    :color="color"
  >
    <use
      :xlink:href="symbolId"
      :color="color"
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
    default: '',
  },
  size: {
    type: String,
    default: '1em',
  },
})

const symbolId = computed(() => `#${props.prefix}-${props.iconClass}`)
</script>

<style>
.svg-icon {
  display: inline-block;
  width: 2em;
  height: 2em;
  overflow: hidden;
  vertical-align: -0.15em;
  outline: none;
  fill: currentColor;
}

path {
  fill: currentColor;
}
</style>
