<script setup lang="ts">
import { SongInfo, SongShelf } from '@/extensions/song';
import { computed, PropType, ref } from 'vue';
import { useSongShelfStore, useSongStore } from '@/store';
import { joinSongArtists } from '@/utils';
import SongCardPhoto from '@/components/photos/SongCardPhoto.vue';
import MoreOptionsSheet from '@/components/actionSheets/MoreOptions.vue';
import { SongShelfType } from '@/types/song';

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
const song = props.song;
const emit = defineEmits(['play']);

const songStore = useSongStore();
const shelfStore = useSongShelfStore();

const showMoreOptions = ref(false);
const playButtonVisible = ref(false);
const isPlayingSong = computed(() => {
  return songStore.playingSong?.id === song.id;
});

const onPlay = () => {
  emit('play');
};
const onPause = () => {
  songStore.onPause();
};
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
          color: '#1989fa',
          callback: () => {
            showMoreOptions = false;
            shelfStore.removeSongFromShelf(song, shelf.playlist.id);
          },
        },
      ]"
    ></MoreOptionsSheet>
  </div>
</template>

<style scoped lang="less">
:deep(.van-image__img) {
  border-radius: 0.5rem 0.5rem 0 0;
}
</style>
