<script setup lang="ts">
import { SongInfo } from '@/extensions/song';
import { computed, PropType, ref } from 'vue';
import { useSongStore } from '@/store';
import { joinSongArtists } from '@/utils';
import SongCardPhoto from '@/components/photos/SongCardPhoto.vue';
import { SongShelfType } from '@/types/song';

const props = defineProps({
  song: {
    type: Object as PropType<SongInfo>,
    required: true,
  },
  type: {
    type: String as PropType<SongShelfType>,
    required: true,
  },
});
const song = props.song;
const emit = defineEmits(['play', 'showMoreOptions']);

const songStore = useSongStore();

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
    class="relative flex items-center max-w-[400px] p-1 active:bg-[--van-background] rounded-lg select-none"
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
    <div v-if="type !== SongShelfType.playlist">
      <van-icon
        name="ellipsis"
        class="clickable text-[--van-text-color]"
        size="16"
        @click.stop="() => emit('showMoreOptions')"
      />
    </div>
  </div>
</template>

<style scoped lang="less">
:deep(.van-image__img) {
  border-radius: 0.5rem 0.5rem 0 0;
}
</style>
