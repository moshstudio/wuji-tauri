<script setup lang="ts">
import { Icon } from '@iconify/vue';

const props = defineProps<{
  isFullscreen: boolean;
  isBrowserFullscreen: boolean;
  requestBrowserFullscreen: () => void;
  exitBrowserFullscreen: () => void;
}>();

async function toggleBrowserFullscreen() {
  if (props.isBrowserFullscreen) {
    props.exitBrowserFullscreen();
  } else {
    props.requestBrowserFullscreen();
  }
}
</script>

<template>
  <button
    v-show="!isFullscreen"
    class="group relative rounded-md transition-colors duration-200"
    aria-label="网页全屏"
    @click="toggleBrowserFullscreen"
  >
    <div class="relative h-[16px] w-[16px]">
      <!-- 进入全屏图标 -->
      <Icon
        icon="qlementine-icons:fullscreen-16"
        class="absolute inset-0 transition-all duration-300"
        :width="16"
        :height="16"
        :class="{
          'scale-90 opacity-0': isBrowserFullscreen,
          'scale-100 opacity-100': !isBrowserFullscreen,
        }"
      />
      <!-- 退出全屏图标 -->
      <Icon
        icon="qlementine-icons:fullscreen-exit-16"
        class="absolute inset-0 transition-all duration-300"
        :width="16"
        :height="16"
        :class="{
          'scale-100 opacity-100': isBrowserFullscreen,
          'scale-90 opacity-0': !isBrowserFullscreen,
        }"
      />
    </div>
  </button>
</template>

<style scoped lang="less"></style>
