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
    class="p-2 rounded-md transition-colors duration-200 group relative"
    aria-label="全屏"
    @click="toggleFullscreen"
  >
    <!-- 两个图标叠加，通过动画切换 -->
    <div class="relative w-6 h-6">
      <!-- 进入全屏图标 -->
      <Icon
        icon="mdi:fullscreen"
        class="absolute inset-0 transition-all duration-300"
        :width="24"
        :height="24"
        :class="{
          'opacity-0 scale-90': isFullscreen,
          'opacity-100 scale-100': !isFullscreen,
        }"
      />
      <!-- 退出全屏图标 -->
      <Icon
        icon="mdi:fullscreen-exit"
        class="absolute inset-0 transition-all duration-300"
        :width="24"
        :height="24"
        :class="{
          'opacity-100 scale-100': isFullscreen,
          'opacity-0 scale-90': !isFullscreen,
        }"
      />
    </div>
  </button>
</template>
