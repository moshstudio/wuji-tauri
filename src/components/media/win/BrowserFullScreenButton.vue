<script setup lang="ts">
import { Icon } from '@iconify/vue';
const props = defineProps<{
  isFullscreen: boolean;
  isBrowserFullscreen: boolean;
  requestBrowserFullscreen: () => void;
  exitBrowserFullscreen: () => void;
}>();

const toggleBrowserFullscreen = async () => {
  if (props.isBrowserFullscreen) {
    props.exitBrowserFullscreen();
  } else {
    props.requestBrowserFullscreen();
  }
};
</script>

<template>
  <button
    @click="toggleBrowserFullscreen"
    class="rounded-md transition-colors duration-200 group relative"
    aria-label="网页全屏"
    v-show="!isFullscreen"
  >
    <div class="relative w-[16px] h-[16px]">
      <!-- 进入全屏图标 -->
      <Icon
        icon="qlementine-icons:fullscreen-16"
        class="absolute inset-0 transition-all duration-300"
        :width="16"
        :height="16"
        :class="{
          'opacity-0 scale-90': isBrowserFullscreen,
          'opacity-100 scale-100': !isBrowserFullscreen,
        }"
      />
      <!-- 退出全屏图标 -->
      <Icon
        icon="qlementine-icons:fullscreen-exit-16"
        class="absolute inset-0 transition-all duration-300"
        :width="16"
        :height="16"
        :class="{
          'opacity-100 scale-100': isBrowserFullscreen,
          'opacity-0 scale-90': !isBrowserFullscreen,
        }"
      />
    </div>
  </button>
</template>

<style scoped lang="less"></style>
