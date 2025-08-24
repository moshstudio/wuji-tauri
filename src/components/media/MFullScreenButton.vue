<script setup lang="ts">
import { Icon } from '@iconify/vue';

const props = defineProps<{
  isFullscreen: boolean;
  requestFullscreen: () => void;
  exitFullscreen: () => void;
}>();

async function toggleFullscreen() {
  if (props.isFullscreen) {
    props.exitFullscreen();
  } else {
    props.requestFullscreen();
  }
}
</script>

<template>
  <button
    class="group relative rounded-md p-2 transition-colors duration-200"
    aria-label="全屏"
    @click="toggleFullscreen"
  >
    <!-- 两个图标叠加，通过动画切换 -->
    <div class="relative h-6 w-6">
      <!-- 进入全屏图标 -->
      <Icon
        icon="mdi:fullscreen"
        class="absolute inset-0 transition-all duration-300"
        :width="24"
        :height="24"
        :class="{
          'scale-90 opacity-0': isFullscreen,
          'scale-100 opacity-100': !isFullscreen,
        }"
      />
      <!-- 退出全屏图标 -->
      <Icon
        icon="mdi:fullscreen-exit"
        class="absolute inset-0 transition-all duration-300"
        :width="24"
        :height="24"
        :class="{
          'scale-100 opacity-100': isFullscreen,
          'scale-90 opacity-0': !isFullscreen,
        }"
      />
    </div>
  </button>
</template>
