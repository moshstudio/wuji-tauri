<script setup lang="ts">
import type { SongInfo, SongShelf } from '@wuji-tauri/source-extension';
import { MoreOptionsSheet } from '@wuji-tauri/components/src';
import SongSelectShelfSheet from './SongSelectShelfSheet.vue';
import SongToFavoriteButton from './SongToFavoriteButton.vue';
import SongPhoto from './SongPhoto.vue';
import { ref } from 'vue';
import { joinSongArtists } from './index';

const props = withDefaults(
  defineProps<{
    song: SongInfo;
    shelfs: SongShelf[];
    isPlaying?: boolean;
    isPlayingSong?: boolean;
    play: (song: SongInfo) => void;
    pause: (song: SongInfo) => void;
    inLikeShelf?: boolean;
    addToLikeShelf: (song: SongInfo) => void;
    removeFromLikeShelf: (song: SongInfo) => void;
    addToShelf: (song: SongInfo, shelf: SongShelf) => void;
  }>(),
  {
    isPlaying: false,
    isPlayingSong: false,
    inLikeShelf: false,
  },
);
const showHint = ref(false);
const showMoreOptions = ref(false);
const showAddToShelfSheet = ref(false);

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
    <div
      v-if="showHint"
      class="flex h-full flex-shrink-0 items-center justify-center gap-2 px-2"
    >
      <SongToFavoriteButton
        :song="song"
        :in-like-shelf="inLikeShelf"
        :add-to-like-shelf="addToLikeShelf"
        :remove-from-like-shelf="removeFromLikeShelf"
      />
      <van-icon
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
          name: '添加到收藏夹',
          color: '#1989fa',
          callback: () => {
            showMoreOptions = false;
            showAddToShelfSheet = true;
          },
        },
      ]"
    />
    <SongSelectShelfSheet
      v-model:show="showAddToShelfSheet"
      :song="song"
      :shelfs="shelfs"
      :add-to-shelf="addToShelf"
      title="选择收藏夹"
      :show-confirm-button="false"
      teleport="body"
      show-cancel-button
    />
  </div>
</template>

<style scoped lang="less"></style>
