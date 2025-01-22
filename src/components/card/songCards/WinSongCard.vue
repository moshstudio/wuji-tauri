<script setup lang="ts">
import { SongInfo } from '@/extensions/song';
import { computed, ref } from 'vue';
import { useSongStore, useSongShelfStore, useDisplayStore } from '@/store';
import { Icon } from '@iconify/vue';
import { joinSongArtists } from '@/utils';
import SongCardPhoto from '@/components/photos/SongCardPhoto.vue';
import MoreOptionsSheet from '@/components/actionSheets/MoreOptions.vue';
import SongSelectShelfSheet from '@/components/actionSheets/SongSelectShelf.vue';
import SongToFavoriteButton from '@/components/buttons/SongToFavoriteButton.vue';

const props = defineProps({
  song: {
    type: Object as () => SongInfo,
    required: true,
  },
});
const song = props.song;
const emit = defineEmits(['play']);

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

const onPlay = () => {
  emit('play');
};
const onPause = () => {
  songStore.onPause();
};
const onDbClick = () => {
  if (songStore.playingSong?.id === song.id && songStore.isPlaying) {
    onPause();
  } else {
    onPlay();
  }
};
</script>

<template>
  <div
    class="relative flex items-center max-w-[400px] p-1 hover:bg-[--van-background] hover:shadow-md rounded-lg select-none"
    @mouseenter="onMouseEnter"
    @mouseleave="onMouseLeave"
    @dblclick="onDbClick"
  >
    <SongCardPhoto
      :url="song.picUrl"
      :is-hover="playButtonVisible"
      :is-playing-song="isPlayingSong"
      :is-playing="songStore.isPlaying"
      :width="40"
      :height="40"
      @play="onPlay"
      @pause="onPause"
    ></SongCardPhoto>
    <div
      class="grow flex flex-col pl-2 text-xs min-w-[10px] justify-around truncate"
    >
      <span class="text-[--van-text-color] font-bold">
        {{ song.name }}
      </span>
      <span class="text-[gray]">
        {{ joinSongArtists(song.artists) }}
      </span>
    </div>
    <div
      class="absolute right-0 px-2 flex gap-2 h-full items-center justify-center bg-[--van-background]"
      v-if="showHint"
    >
      <SongToFavoriteButton :song="song" :size="20"></SongToFavoriteButton>
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
    ></MoreOptionsSheet>
    <SongSelectShelfSheet
      v-model:show="showAddToShelfSheet"
      :song="song"
      title="选择收藏夹"
      :show-confirm-button="false"
      teleport="body"
      show-cancel-button
    >
    </SongSelectShelfSheet>
  </div>
</template>

<style scoped lang="less">
:deep(.van-image__img) {
  border-radius: 0.5rem 0.5rem 0 0;
}
</style>
