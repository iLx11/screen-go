<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
import "./utils/xBox/style/xBox.css"
</script>

<template>
  <RouterView />
</template>

<style>
@font-face {
  font-family: 'ceyy';
  src: url('./assets/font/ceyy.ttf');
}

:root {
  --content-box-color: rgb(255, 255, 255);
  --editor-box-color: rgb(222, 227, 232);
  --head-box-color: rgb(240, 245, 244);
  --result-data-box-color: rgb(232, 237, 237);

  --data-config-box-color: rgb(58, 142, 124);
  --data-config-title-box-color: rgba(0, 0, 0, 0.1);
  --data-config-input-color: rgb(225, 230, 232);
  --data-size-box-color: rgb(255, 255, 255);
  --data-config-func-box-color: rgba(230, 237, 241, 0.61);
  --data-config-move-box-color: rgba(255, 255, 255, 1);
  --config-botton-color: rgb(236, 243, 242);
  
  --commit-box-color: rgb(160, 160, 168);

  --pop-box-color: rgba(255, 255, 255, 0.95);
  --text-color-1: rgba(51, 51, 51, 1);
  --text-color-2: rgba(51, 51, 51, 0.8);
  --span-text-color: rgb(143, 206, 202);
}

[main-theme="color"] {
  --content-box-color: rgb(254, 255, 255);
  --editor-box-color: rgb(226, 232, 238);
  --head-box-color: rgb(240, 245, 244);
  --result-data-box-color: rgb(237, 245, 243);

  --data-config-box-color: rgb(231, 240, 238);
  --data-config-title-box-color: rgba(94, 93, 93, 0.1);
  --data-config-input-color: rgb(248, 237, 230);
  --data-size-box-color: rgb(239, 245, 250);
  --data-config-func-box-color: rgba(232, 241, 241, 0.61);
  --data-config-move-box-color: rgba(255, 255, 255, 1);
  --config-botton-color: rgb(236, 243, 242);
  
  --commit-box-color: rgb(253, 237, 229);

  --pop-box-color: rgba(255, 255, 255, 0.95);
  --text-color-1: rgba(51, 51, 51, 0.85);
  --text-color-2: rgba(51, 51, 51, 0.5);
  --span-text-color: rgb(143, 206, 202);
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
