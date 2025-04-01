<template>
  <button
    @click="toggleFullscreen"
    class="p-2 rounded-md transition-colors duration-200 group relative"
    aria-label="全屏"
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
          'opacity-0 scale-90': state.isFullscreen,
          'opacity-100 scale-100': !state.isFullscreen,
        }"
      />
      <!-- 退出全屏图标 -->
      <Icon
        icon="mdi:fullscreen-exit"
        class="absolute inset-0 transition-all duration-300"
        :width="24"
        :height="24"
        :class="{
          'opacity-100 scale-100': state.isFullscreen,
          'opacity-0 scale-90': !state.isFullscreen,
        }"
      />
    </div>

    <!-- 悬浮提示 -->
    <span
      class="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs bg-gray-800 text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap"
    >
      {{ state.isFullscreen ? '退出全屏' : '全屏' }}
    </span>
  </button>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { useDisplayStore } from '@/store';

const displayStore = useDisplayStore();

const props = defineProps<{
  state: {
    isFullscreen: boolean;
  };
  player: {
    requestFullscreen: () => void;
    exitFullscreen: () => void;
  };
}>();

const toggleFullscreen = async () => {
  if (props.state.isFullscreen) {
    displayStore.fullScreenMode = false;
    if (!displayStore.isAndroid) {
      await getCurrentWindow().setFullscreen(false);
    }
    props.player.exitFullscreen();
  } else {
    displayStore.fullScreenMode = true;
    if (!displayStore.isAndroid) {
      await getCurrentWindow().setFullscreen(true);
    }

    props.player.requestFullscreen();
  }
};
</script>
