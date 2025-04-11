<template>
  <div class="flex items-center gap-2 text-sm font-mono">
    <!-- 当前时间 -->
    <span class="py-1 text-gray-300 rounded-md transition-all duration-300">
      {{ formatTime(state.currentTime) }}
    </span>

    <!-- 分隔线 -->
    <div
      class="h-4 w-px bg-gray-500 transform transition-all duration-500"
      :class="{ 'scale-y-125': isPlaying }"
    ></div>

    <!-- 总时长 -->
    <span class="py-1 text-gray-300 rounded-md">
      {{ formatTime(state.duration) }}
    </span>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

const props = defineProps<{
  state: {
    currentTime: number;
    duration: number;
  };
  isPlaying: boolean;
}>();

// 格式化时间为 MM:SS
const formatTime = (seconds: number) => {
  if (seconds === Infinity) return '';

  if (!seconds) return '--:--';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};
</script>
