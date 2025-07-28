<script setup lang="ts">
const props = defineProps<{
  state: {
    currentTime: number;
    duration: number;
  };
  isPlaying: boolean;
}>();

// 格式化时间为 MM:SS
function formatTime(seconds: number) {
  if (seconds === Infinity) return '';

  if (!seconds) return '--:--';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}
</script>

<template>
  <div class="flex items-center gap-2 font-mono text-sm">
    <!-- 当前时间 -->
    <span class="rounded-md py-1 text-gray-300 transition-all duration-300">
      {{ formatTime(state.currentTime) }}
    </span>

    <!-- 分隔线 -->
    <div
      class="h-4 w-px transform bg-gray-500 transition-all duration-500"
      :class="{ 'scale-y-125': isPlaying }"
    />

    <!-- 总时长 -->
    <span class="rounded-md py-1 text-gray-300">
      {{ formatTime(state.duration) }}
    </span>
  </div>
</template>
