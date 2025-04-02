<template>
  <button
    @click="toggleFullscreen"
    class="rounded-md transition-colors duration-200 group relative"
    aria-label="全屏"
  >
    <!-- 两个图标叠加，通过动画切换 -->
    <div class="relative w-[24px] h-[24px]">
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
  </button>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue';
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
  focus: () => void;
}>();

const toggleFullscreen = async () => {
  if (props.state.isFullscreen) {
    displayStore.fullScreenMode = false;
    props.player.exitFullscreen();
  } else {
    displayStore.fullScreenMode = true;
    props.player.requestFullscreen();
    props.focus();
  }
};
</script>
