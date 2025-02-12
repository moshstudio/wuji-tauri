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
      <template v-slot:loading>
        <Icon icon="basil:music-solid" width="22" height="22" />
      </template>
      <template v-slot:error>
        <Icon icon="basil:music-solid" width="22" height="22" />
      </template>
    </LoadImage>
    <div
      class="absolute leading-[16px] rounded-[50%] bg-black/50 p-1 hover:scale-110 cursor-pointer"
      v-if="isHover || isPlayingSong"
    >
      <van-icon
        name="pause"
        class="text-white"
        size="16"
        @click.stop="() => emit('pause')"
        v-if="isPlaying && isPlayingSong"
      />
      <van-icon
        name="play"
        class="text-white"
        size="16"
        @click.stop="() => emit('play')"
        v-else
      />
    </div>
  </div>
</template>

<style scoped lang="less"></style>
