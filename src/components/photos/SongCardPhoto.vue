<script setup lang="ts">
import { Icon } from '@iconify/vue';
import LoadImage from '../LoadImage.vue';

const { url, isHover, isPlayingSong, isPlaying } = defineProps<{
  url?: string;
  headers?: Record<string, string>;
  isHover: boolean;
  isPlayingSong: boolean;
  isPlaying: boolean;
  width: number;
  height: number;
}>();
const emit = defineEmits(['play', 'pause']);
</script>

<template>
  <div class="relative flex items-center justify-center">
    <LoadImage
      :width="width"
      :height="height"
      :radius="8"
      fit="cover"
      lazy-load
      :src="url || ''"
      :headers="headers"
    >
      <template #loading>
        <Icon icon="basil:music-solid" width="22" height="22" />
      </template>
      <template #error>
        <Icon icon="basil:music-solid" width="22" height="22" />
      </template>
    </LoadImage>
    <div
      v-if="isHover || isPlayingSong"
      class="absolute leading-[16px] rounded-[50%] bg-black/50 p-1 hover:scale-110 cursor-pointer"
    >
      <van-icon
        v-if="isPlaying && isPlayingSong"
        name="pause"
        class="text-white"
        size="16"
        @click.stop="() => emit('pause')"
      />
      <van-icon
        v-else
        name="play"
        class="text-white"
        size="16"
        @click.stop="() => emit('play')"
      />
    </div>
  </div>
</template>

<style scoped lang="less"></style>
