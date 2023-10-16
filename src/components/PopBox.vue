<script setup lang="ts">
import { ref } from 'vue'

const popBoxShow = ref<boolean>(false)
const popBoxRef = ref<HTMLElement | null>(null)
const popBoxText = ref<string>('')

let timer: any

const showPop = (text: string) => {
  popBoxShow.value = true
  popBoxText.value = text
  if (timer) {  
    clearTimeout(timer)
  }
  timer = setTimeout(() => {
    const backAnimationEffect = new KeyframeEffect(
      (popBoxRef as any).value, // element to animate
      [
        {
          width: '30%',
          opacity: '100%',
          top: '10%'
        },
        {
          opacity: '0%',
          top: '5%',
          width: '35%',
          height: '40px'
        }
      ],
      {
        duration: 300
      } // keyframe options
    )
    const backAnimation = new Animation(backAnimationEffect, document.timeline)
    backAnimation.play()
    backAnimation.onfinish = () => {
      popBoxShow.value = false
    }
  }, 2000)
}

defineExpose({
  showPop
})
</script>

<template>
  <div id="pop-box" v-if="popBoxShow" ref="popBoxRef">
    <div id="font-box">
      <svg t="1696492214067" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="9765" data-spm-anchor-id="a313x.search_index.0.i0.77e73a81rcqrwa" width="32" height="32">
        <path
          d="M639.892491 415.930119 383.935495 415.930119c-17.717453 0-31.994625-14.277171-31.994625-31.994625s14.277171-31.994625 31.994625-31.994625L639.892491 351.94087c17.717453 0 31.994625 14.277171 31.994625 31.994625S657.609945 415.930119 639.892491 415.930119z"
          fill="#8a8a8a"
          p-id="9766"
          class="sweezy-custom-cursor-hover selected"
          style='null;cursor: url("data:image/png;base64,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") 5 2, pointer !important;'
          data-spm-anchor-id="a313x.search_index.0.i1.77e73a81rcqrwa"
        ></path>
        <path
          d="M579.17151 543.908618 383.935495 543.908618c-17.717453 0-31.994625-14.277171-31.994625-31.994625S366.390055 479.919368 383.935495 479.919368l195.236015 0c17.717453 0 31.994625 14.277171 31.994625 31.994625S596.888964 543.908618 579.17151 543.908618z"
          fill="#8a8a8a"
          p-id="9767"
          class="sweezy-custom-cursor-hover selected"
          style='null;cursor: url("data:image/png;base64,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") 5 2, pointer !important;'
          data-spm-anchor-id="a313x.search_index.0.i2.77e73a81rcqrwa"
        ></path>
        <path
          d="M962.246934 447.924744c0-211.74937-200.912481-383.935495-447.924744-383.935495S66.225433 236.175374 66.225433 447.924744c0 116.453553 62.957164 226.026541 172.874181 300.680665 14.621199 9.976818 34.574836 6.192508 44.379641-8.428691 9.976818-14.621199 6.192508-34.574836-8.428691-44.379641-92.027549-62.441122-144.835881-152.74853-144.835881-247.700319 0-176.486477 172.186125-319.946246 383.935495-319.946246s383.935495 143.631782 383.935495 319.946246-172.186125 319.946246-383.935495 319.946246c-2.064169 0-3.612296 0.688056-5.504452 1.204099-15.137242-2.752226-30.446498 5.160423-35.778935 20.125651-6.192508 17.373425-46.44381 46.615824-94.091718 73.794053 17.373425-58.140769 9.116748-70.697799 3.440282-78.954477-6.70855-9.976818-17.889467-15.997312-29.930455-15.997312-17.717453 0-31.994625 14.277171-31.994625 31.994625 0 5.84848 1.548127 11.180917 4.300353 15.997312-3.268268 18.233496-17.201411 60.892995-33.026709 99.768184-4.988409 12.040988-2.064169 25.974131 7.396607 35.090879 6.020494 5.84848 14.105157 8.944734 22.18982 8.944734 4.300353 0 8.77272-0.860071 13.073072-2.752226 36.466991-16.341341 147.588107-69.149672 187.667395-125.570301C765.290778 828.075928 962.246934 657.609945 962.246934 447.924744z"
          fill="#8a8a8a"
          p-id="9768"
          class="sweezy-custom-cursor-hover selected"
          style='null;cursor: url("data:image/png;base64,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") 5 2, pointer !important;'
          data-spm-anchor-id="a313x.search_index.0.i3.77e73a81rcqrwa"
        ></path>
      </svg>
    </div>
    <div id="message-box">{{popBoxText}}</div>
  </div>
</template>

<style lang="scss" scoped>
#pop-box {
  width: 30%;
  height: 30px;
  position: fixed;
  top: 10%;
  left: 50%;
  transform: translateX(-50%);
  background: var(--pop-box-color);
  border-radius: 25px;
  box-shadow: 1.1px 0px 10.8px -34px rgba(0, 0, 0, 0.059), 7px 0px 81px -34px rgba(0, 0, 0, 0.12);
  border: 0.1 solid rgba(0, 0, 0, 0.12);
  display: flex;
  justify-content: space-around;
  align-items: center;
  padding: 2em;
  z-index: 9999;
  animation: begin 0.3s ease-in-out;
  color: var(--text-color-1);
  div {
    display: flex;
    justify-content: center;
    align-items: center;
  }
  #font-box {
    width: 20%;
    height: 100%;
    font-size: 12px;
  }
  #message-box {
    width: 75%;
    height: 100%;
    font-size: 18px;
  }
}
@keyframes begin {
  0% {
    opacity: 0%;
    top: 1%;
    width: 20%;
  }
  100% {
    width: 30%;
    opacity: 100%;
    top: 10%;
  }
}
@keyframes end {
  100% {
    opacity: 0%;
    top: 1%;
    width: 20%;
  }
  0% {
    width: 30%;
    opacity: 100%;
    top: 10%;
  }
}
</style>
