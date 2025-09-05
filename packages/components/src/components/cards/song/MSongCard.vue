<script setup lang="ts">
import type { SongInfo } from '@wuji-tauri/source-extension';
import { ref } from 'vue';
import { joinSongArtists } from './index';
import SongPhoto from './SongPhoto.vue';

withDefaults(
  defineProps<{
    song: SongInfo;
    isPlaying?: boolean;
    isPlayingSong?: boolean;
    play: (song: SongInfo) => void;
    pause: (song: SongInfo) => void;
  }>(),
  {
    isPlaying: false,
    isPlayingSong: false,
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
    class="active-bg-scale relative flex items-center rounded-lg p-1"
    :class="isPlayingSong ? 'bg-[var(--van-background)]' : ''"
    @click="() => (isPlaying && isPlayingSong ? pause(song) : play(song))"
    @mouseenter="onMouseEnter"
    @mouseleave="onMouseLeave"
  >
    <SongPhoto
      :photo-url="song.picUrl"
      :headers="song.picHeaders"
      :is-playing="isPlaying"
      :is-playing-song="isPlayingSong"
      :show-button="isHover"
      :width="36"
      :height="36"
      :play="() => play(song)"
      :pause="() => pause(song)"
    />
    <div
      class="flex min-w-[10px] grow flex-col justify-around truncate pl-2 text-xs"
    >
      <span
        class="font-bold"
        :class="
          isPlayingSong
            ? 'text-[var(--van-primary-color)]'
            : 'text-[--van-text-color]'
        "
      >
        {{ song.name }}
      </span>
      <span class="text-[gray]">
        {{ joinSongArtists(song.artists) }}
      </span>
    </div>
  </div>
</template>

<style scoped lang="less"></style>
