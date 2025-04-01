<script setup lang="ts">
import { SongInfo } from '@/extensions/song';
import { computed, PropType, ref } from 'vue';
import { useSongStore } from '@/store';
import { joinSongArtists } from '@/utils';
import SongCardPhoto from '@/components/photos/SongCardPhoto.vue';

const props = defineProps({
  song: {
    type: Object as PropType<SongInfo>,
    required: true,
  },
});
const song = props.song;
const emit = defineEmits(['play']);

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
      :width="36"
      :height="36"
      @play="onPlay"
      @pause="onPause"
    ></SongCardPhoto>
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
  </div>
</template>

<style scoped lang="less">
:deep(.van-image__img) {
  border-radius: 0.5rem 0.5rem 0 0;
}
</style>
