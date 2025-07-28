<script setup lang="ts">
import type { SongInfo, SongShelf } from '@wuji-tauri/source-extension';
import { SongShelfType } from '@wuji-tauri/source-extension';
import MoreOptionsSheet from '../../MoreOptionsSheet.vue';
import SongPhoto from './SongPhoto.vue';
import { joinSongArtists } from './index';
import { ref } from 'vue';

const props = withDefaults(
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

const showHint = ref(false);
const showMoreOptions = ref(false);

function onMouseEnter() {
  showHint.value = true;
}
function onMouseLeave() {
  showHint.value = false;
}

function onDbClick() {
  if (props.isPlayingSong) {
    if (props.isPlaying) {
      props.pause(props.song);
    } else {
      props.play(props.song);
    }
  } else {
    props.play(props.song);
  }
}
</script>

<template>
  <div
    class="active-bg-scale relative flex items-center rounded-lg p-1"
    :class="isPlayingSong ? 'bg-[var(--van-background)]' : ''"
    @mouseenter="onMouseEnter"
    @mouseleave="onMouseLeave"
    @dblclick="onDbClick"
  >
    <SongPhoto
      :photo-url="song.picUrl"
      :headers="song.picHeaders"
      :is-playing-song="isPlayingSong"
      :is-playing="isPlaying"
      :width="40"
      :height="40"
      :play="() => play(song)"
      :pause="() => pause(song)"
    />
    <div
      class="flex min-w-[10px] flex-1 grow flex-col justify-around truncate pl-2 text-xs"
    >
      <span class="font-bold text-[--van-text-color]">
        {{ song.name }}
      </span>
      <span class="text-[gray]">
        {{ joinSongArtists(song.artists) }}
      </span>
    </div>
    <div
      v-if="showHint"
      class="flex h-full flex-shrink-0 items-center justify-center gap-2 px-2"
    >
      <SongToFavoriteButton :song="song" :size="20" />
      <van-icon
        v-if="shelf.type !== SongShelfType.playlist"
        name="ellipsis"
        class="clickable p-2 text-[--van-text-color]"
        size="16"
        @click="() => (showMoreOptions = true)"
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
