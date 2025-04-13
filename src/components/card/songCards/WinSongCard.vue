<script setup lang="ts">
import type { SongInfo } from '@/extensions/song';
import type { PropType } from 'vue';
import MoreOptionsSheet from '@/components/actionSheets/MoreOptions.vue';
import SongSelectShelfSheet from '@/components/actionSheets/SongSelectShelf.vue';
import SongToFavoriteButton from '@/components/buttons/SongToFavoriteButton.vue';
import SongCardPhoto from '@/components/photos/SongCardPhoto.vue';
import { useSongShelfStore, useSongStore } from '@/store';
import { joinSongArtists } from '@/utils';
import { computed, ref } from 'vue';

const props = defineProps({
  song: {
    type: Object as PropType<SongInfo>,
    required: true,
  },
});
const emit = defineEmits(['play']);
const song = props.song;
const songStore = useSongStore();
const shelfStore = useSongShelfStore();

const playButtonVisible = ref(false);
const showHint = ref(false);
const showMoreOptions = ref(false);
const showAddToShelfSheet = ref(false);
const isPlayingSong = computed(() => {
  return songStore.playingSong?.id === song.id;
});

function onMouseEnter() {
  playButtonVisible.value = true;
  showHint.value = true;
}
function onMouseLeave() {
  playButtonVisible.value = false;
  showHint.value = false;
}

function onPlay() {
  emit('play');
}
function onPause() {
  songStore.onPause();
}
function onDbClick() {
  if (songStore.playingSong?.id === song.id && songStore.isPlaying) {
    onPause();
  }
  else {
    onPlay();
  }
}
</script>

<template>
  <div
    class="relative flex items-center p-1 hover:bg-[--van-background] rounded-lg select-none"
    :class="isPlayingSong ? 'bg-[var(--van-background)]' : ''"
    @mouseenter="onMouseEnter"
    @mouseleave="onMouseLeave"
    @dblclick="onDbClick"
  >
    <SongCardPhoto
      :url="song.picUrl"
      :headers="song.picHeaders"
      :is-hover="playButtonVisible"
      :is-playing-song="isPlayingSong"
      :is-playing="songStore.isPlaying"
      :width="40"
      :height="40"
      @play="onPlay"
      @pause="onPause"
    />
    <div
      class="grow flex flex-col pl-2 text-xs min-w-[10px] justify-around truncate"
    >
      <span
        class="font-bold"
        :class="
          isPlayingSong && songStore.isPlaying
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
      class="absolute right-0 px-2 flex gap-2 h-full items-center justify-center bg-[--van-background]"
    >
      <SongToFavoriteButton :song="song" :size="20" />
      <van-icon
        name="ellipsis"
        class="clickable text-[--van-text-color]"
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
      title="选择收藏夹"
      :show-confirm-button="false"
      teleport="body"
      show-cancel-button
    />
  </div>
</template>

<style scoped lang="less">
:deep(.van-image__img) {
  border-radius: 0.5rem 0.5rem 0 0;
}
</style>
