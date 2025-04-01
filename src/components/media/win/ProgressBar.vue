<template>
  <div class="w-full group">
    <!-- 进度条容器 -->
    <van-slider
      class="video-slider"
      :model-value="currValue"
      :min="0"
      :max="state.duration"
      :bar-height="6"
      :button-size="6"
      active-color="rgb(59 130 246 / var(--tw-bg-opacity, 1))"
      inactive-color="rgb(75 85 99 / var(--tw-bg-opacity, 0.5))"
      @change="handleSeek"
      @mousemove="handleHover"
      @touchmove="handleTouchMove"
      @mouseleave="handleHoverLeave"
      @drag-start="() => (isDragging = true)"
      @drag-end="() => (isDragging = false)"
      @touchstart="() => (isDragging = true)"
      @touchend="() => (isDragging = false)"
    />
    <div
      v-if="hoverTime !== null"
      class="absolute bottom-full mb-2 px-2 py-1 text-xs bg-black/80 text-white rounded pointer-events-none"
      :style="{
        left: `${hoverPosition * 100}%`,
        transform: 'translateX(-50%)',
      }"
    >
      {{ formatTime(hoverTime) }}
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed } from 'vue';

interface Props {
  state: {
    currentTime: number;
    duration: number;
    bufferedPercent: number;
  };
  onSeek: (time: number) => void;
}

const props = defineProps<Props>();

const isDragging = ref(false);
const hoverTime = ref<number | null>(null);
const hoverPosition = ref(0);

const currValue = computed(() => {
  return isDragging.value && hoverTime.value !== null
    ? hoverTime.value
    : props.state.currentTime;
});
const handleSeek = (value: number) => {
  isDragging.value = false;
  hoverPosition.value = 0;
  hoverTime.value = null;
  props.onSeek(value);
};

const handleHover = (e: MouseEvent) => {
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
  const percent = (e.clientX - rect.left) / rect.width;
  hoverPosition.value = percent;
  hoverTime.value = percent * props.state.duration;
};
const handleTouchMove = (e: TouchEvent) => {
  e.preventDefault(); // 阻止默认行为（如页面滚动）
  const touch = e.touches[0];
  if (!touch) return;

  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
  const percent = (touch.clientX - rect.left) / rect.width;
  hoverPosition.value = Math.max(0, Math.min(1, percent)); // 确保在0-1范围内
  hoverTime.value = percent * props.state.duration;
};
const handleHoverLeave = (e: MouseEvent) => {
  if (!isDragging.value) {
    hoverPosition.value = 0;
    hoverTime.value = null;
  }
};

const formatTime = (seconds: number) => {
  if (isNaN(seconds)) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};
</script>

<style lang="less" scoped>
:deep(.van-slider__button) {
  background-color: rgb(59 130 246 / var(--tw-bg-opacity, 1));
  box-shadow: none;
  border-top-left-radius: 0;
  border-bottom-left-radius: 0;
}
</style>
