<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <RouterView />
</template>

<style>
@font-face {
  font-family: 'ceyy';
  src: url('./assets/font/ceyy.ttf');
}

 
*::-webkit-scrollbar {
  display: none; /* Chrome Safari */
}
* {
  margin: 0;
  padding: 0;
  scrollbar-width: none; /* firefox */
-ms-overflow-style: none; /* IE 10+ */
}
html,
body,
html, body, #app {
  width: 100%;
  height: 100%;
  overflow: hidden;
  font-family: "ceyy";
}
li {
  list-style : none;
}
</style>
