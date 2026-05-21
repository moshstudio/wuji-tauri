<script setup lang="ts">
import { Icon } from '@iconify/vue';
import { onMounted, ref } from 'vue';

const emit = defineEmits<{
  click: [];
}>();

const BUBBLE_SIZE = 40;

const bubbleOffset = ref({ x: 0, y: 0 });

onMounted(() => {
  const gap = 12;
  bubbleOffset.value = {
    x: window.innerWidth - BUBBLE_SIZE - gap,
    y: Math.round(window.innerHeight * 0.38),
  };
});
</script>

<template>
  <van-floating-bubble
    v-model:offset="bubbleOffset"
    axis="y"
    magnetic="x"
    :gap="12"
    teleport="body"
    class="cast-floating-bubble"
  >
    <button
      type="button"
      class="cast-floating-bubble__btn van-haptics-feedback"
      aria-label="投屏中，点击管理"
      @click.stop="emit('click')"
    >
      <span class="cast-floating-bubble__ring" aria-hidden="true" />
      <Icon
        class="cast-floating-bubble__icon"
        icon="mdi:cast-connected"
        width="20"
        height="20"
      />
    </button>
  </van-floating-bubble>
</template>

<style scoped lang="less">
:deep(.cast-floating-bubble.van-floating-bubble) {
  width: auto;
  height: auto;
  border: none;
  border-radius: 0;
  background: transparent;
  overflow: visible;
  z-index: 1003;
}

:deep(.cast-floating-bubble.van-floating-bubble:active) {
  opacity: 1;
}

.cast-floating-bubble__btn {
  position: relative;
  display: flex;
  width: 40px;
  height: 40px;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 1px solid var(--van-border-color);
  border-radius: 50%;
  background: var(--van-background-2);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.12);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.cast-floating-bubble__ring {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 1.5px solid var(--van-primary-color);
  opacity: 0;
  pointer-events: none;
  animation: cast-ring 2s ease-out infinite;
}

.cast-floating-bubble__icon {
  color: var(--van-primary-color);
  animation: cast-icon-pulse 2s ease-in-out infinite;
}

@keyframes cast-ring {
  0% {
    transform: scale(1);
    opacity: 0.5;
  }

  100% {
    transform: scale(1.45);
    opacity: 0;
  }
}

@keyframes cast-icon-pulse {
  0%,
  100% {
    opacity: 0.75;
  }

  50% {
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .cast-floating-bubble__ring,
  .cast-floating-bubble__icon {
    animation: none;
  }

  .cast-floating-bubble__ring {
    opacity: 0.35;
    transform: scale(1.1);
  }
}
</style>
