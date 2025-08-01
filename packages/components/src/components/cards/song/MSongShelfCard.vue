<script setup lang="ts">
import type { SongInfo, SongShelf } from '@wuji-tauri/source-extension';
import { SongShelfType } from '@wuji-tauri/source-extension';
import MoreOptionsSheet from '../../MoreOptionsSheet.vue';
import SongPhoto from './SongPhoto.vue';
import { joinSongArtists } from './index';
import { ref } from 'vue';

withDefaults(
  defineProps<{
    song: SongInfo;
    shelf: SongShelf;
    isPlaying?: boolean;
    isPlayingSong?: boolean;
    play: (song: SongInfo) => void;
    pause: (song: SongInfo) => void;
    removeSongFromShelf: (song: SongInfo, shelf: SongShelf) => void;
  }>(),
  {
    isPlaying: false,
  },
);

const showMoreOptions = ref(false);

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
            : 'text-[var(--van-text-color)]'
        "
      >
        {{ song.name }}
      </span>
      <span class="text-[gray]">
        {{ joinSongArtists(song.artists) }}
      </span>
    </div>
    <div v-if="shelf.type !== SongShelfType.playlist">
      <van-icon
        name="ellipsis"
        class="clickable p-2 text-[var(--van-text-color)]"
        size="16"
        @click.stop="() => (showMoreOptions = !showMoreOptions)"
      />
    </div>
    <MoreOptionsSheet
      v-model="showMoreOptions"
      :actions="[
        {
          name: '从当前收藏夹移除',
          subname: song.name,
          color: '#E74C3C',
          callback: () => {
            showMoreOptions = false;
            removeSongFromShelf(song, shelf);
          },
        },
      ]"
    />
  </div>
</template>

<style scoped lang="less"></style>
