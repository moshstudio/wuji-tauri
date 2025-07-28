<script setup lang="ts">
import { Icon } from '@iconify/vue';

const props = defineProps<{
  isPlaying: boolean;
  playOrPause: () => void;
}>();
</script>

<template>
  <button
    class="relative flex h-[24px] w-[24px] items-center justify-center rounded-full duration-200"
    aria-label="Play/Pause"
    @click="playOrPause"
  >
    <Transition name="bounce" mode="out-in">
      <Icon
        :key="isPlaying ? 'pause' : 'play'"
        :icon="
          isPlaying ? 'material-symbols:pause' : 'material-symbols:play-arrow'
        "
        :width="24"
        :height="24"
        color="white"
      />
    </Transition>
  </button>
</template>

<style lang="less" scoped>
/* 入场动画 */
.bounce-enter-active {
  animation: bounce-in 0.2s;
}

/* 离场动画 */
.bounce-leave-active {
  animation: bounce-in 0.2s reverse;
}

/* 弹跳动画关键帧 */
@keyframes bounce-in {
  0% {
    transform: scale(0);
  }
  50% {
    transform: scale(0.5);
  }
  100% {
    transform: scale(1);
  }
}
</style>
