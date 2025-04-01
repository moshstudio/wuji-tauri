<template>
  <button
    @click="playOrPause"
    class="flex items-center justify-center p-1 rounded-full active:scale-95 transition-all duration-300 focus:outline-none"
  >
    <div class="relative w-[24px] h-[24px]">
      <!-- 播放图标 -->
      <Icon
        :icon="'mdi:play'"
        class="absolute inset-0 transform transition-all duration-300"
        :width="24"
        :height="24"
        :class="{
          'opacity-0 scale-75': isPlaying,
          'opacity-100 scale-100': !isPlaying,
        }"
      />
      <!-- 暂停图标 -->
      <Icon
        :icon="'mdi:pause'"
        class="absolute inset-0 transform transition-all duration-300"
        :width="24"
        :height="24"
        :class="{
          'opacity-100 scale-100': isPlaying,
          'opacity-0 scale-75': !isPlaying,
        }"
      />
    </div>
  </button>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { Icon } from '@iconify/vue';

const props = defineProps<{
  isPlaying: boolean;
  playOrPause: () => void;
}>();
</script>
