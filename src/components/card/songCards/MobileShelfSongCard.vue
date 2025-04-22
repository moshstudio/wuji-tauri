<script setup lang="ts">
import type { SongInfo, SongShelf } from '@/extensions/song';
import type { PropType } from 'vue';
import MoreOptionsSheet from '@/components/actionSheets/MoreOptions.vue';
import SongCardPhoto from '@/components/photos/SongCardPhoto.vue';
import { useSongShelfStore, useSongStore } from '@/store';
import { SongShelfType } from '@/types/song';
import { joinSongArtists } from '@/utils';
import { computed, ref } from 'vue';

const props = defineProps({
  song: {
    type: Object as PropType<SongInfo>,
    required: true,
  },
  shelf: {
    type: Object as PropType<SongShelf>,
    required: true,
  },
});
const emit = defineEmits(['play']);
const song = props.song;
const songStore = useSongStore();
const shelfStore = useSongShelfStore();

const showMoreOptions = ref(false);
const playButtonVisible = ref(false);
const isPlayingSong = computed(() => {
  return songStore.playingSong?.id === song.id;
});

function onPlay() {
  emit('play');
}
function onPause() {
  songStore.onPause();
}
</script>

<template>
  <div
    class="relative flex items-center p-1 active:scale-[0.98] rounded-lg select-none"
    :class="isPlayingSong ? 'bg-[var(--van-background)]' : ''"
    @click="onPlay"
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
      <span class="text-[--van-text-color] font-bold">
        {{ song.name }}
      </span>
      <span class="text-[gray]">
        {{ joinSongArtists(song.artists) }}
      </span>
    </div>
    <div v-if="shelf.type !== SongShelfType.playlist">
      <van-icon
        name="ellipsis"
        class="clickable text-[--van-text-color]"
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
            shelfStore.removeSongFromShelf(song, shelf.playlist.id);
          },
        },
      ]"
    />
  </div>
</template>

<style scoped lang="less">
:deep(.van-image__img) {
  border-radius: 0.5rem 0.5rem 0 0;
}
</style>
