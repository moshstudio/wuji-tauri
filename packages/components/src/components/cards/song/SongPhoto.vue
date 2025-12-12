<script setup lang="ts">
import { Icon } from '@iconify/vue';
import { ref } from 'vue';
import LoadImage from '../../LoadImage.vue';

withDefaults(
  defineProps<{
    photoUrl?: string;
    headers?: Record<string, string>;
    isPlaying?: boolean;
    isPlayingSong?: boolean;
    showButton?: boolean;
    width?: number;
    height?: number;
    play: () => void;
    pause: () => void;
  }>(),
  {
    isPlaying: false,
    isPlayingSong: false,
    showButton: false,
    width: 36,
    height: 36,
  },
);
const isHover = ref(false);
function onMouseEnter() {
  isHover.value = true;
}
function onMouseLeave() {
  isHover.value = false;
}
</script>

<template>
  <div
    class="relative flex items-center justify-center"
    @mouseenter="onMouseEnter"
    @mouseleave="onMouseLeave"
  >
    <LoadImage
      :width="width"
      :height="height"
      :radius="8"
      fit="cover"
      :src="photoUrl || ''"
      :headers="headers"
      lazy-load
    >
      <template #loading>
        <Icon icon="basil:music-solid" width="22" height="22" />
      </template>
      <template #error>
        <Icon icon="basil:music-solid" width="22" height="22" />
      </template>
    </LoadImage>
    <div
      v-if="isHover || isPlayingSong || showButton"
      class="absolute cursor-pointer rounded-[50%] bg-black/50 p-1 leading-[16px]"
    >
      <van-icon
        v-if="isPlaying && isPlayingSong"
        name="pause"
        class="text-white"
        size="16"
        @click.stop="pause"
      />
      <van-icon
        v-else
        name="play"
        class="text-white"
        size="16"
        @click.stop="play"
      />
    </div>
  </div>
</template>

<style scoped lang="less"></style>
