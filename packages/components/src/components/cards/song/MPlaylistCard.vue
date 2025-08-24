<script setup lang="ts">
import type { PlaylistInfo } from '@wuji-tauri/source-extension';
import { LoadImage } from '@wuji-tauri/components/src';
import { Icon } from '@iconify/vue';
import tinycolor from 'tinycolor2';
import { ref } from 'vue';

withDefaults(
  defineProps<{
    playlist: PlaylistInfo;
    click: (playlist: PlaylistInfo) => void;
  }>(),
  {},
);

const playButtonVisible = ref(false);
const color = tinycolor.random().toRgbString();
function onMouseEnter() {
  playButtonVisible.value = true;
}
function onMouseLeave() {
  playButtonVisible.value = false;
}
</script>

<template>
  <div
    class="active-bg-scale flex w-[100px] flex-col items-center rounded-lg"
    @click="() => click(playlist)"
    @mouseenter="onMouseEnter"
    @mouseleave="onMouseLeave"
  >
    <LoadImage
      :width="100"
      :height="120"
      fit="cover"
      :src="playlist.picUrl"
      :headers="playlist.picHeaders"
      class="rounded-t-lg"
    >
      <template #loading>
        <Icon icon="mdi:playlist-music" width="60" height="60" :color="color" />
      </template>
      <template #error>
        <Icon icon="mdi:playlist-music" width="60" height="60" />
      </template>
    </LoadImage>
    <p
      v-if="playlist.name"
      :rows="1"
      class="w-full truncate py-1 text-center text-xs text-[--van-text-color]"
    >
      {{ playlist.name }}
    </p>
  </div>
</template>

<style scoped lang="less"></style>
