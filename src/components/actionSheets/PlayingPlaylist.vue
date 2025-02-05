<script setup lang="ts">
import { useSongStore } from '@/store';
import { SongPlayMode } from '@/types/song';
import { Icon } from '@iconify/vue';
import { ref, watch } from 'vue';
import MobileSongCard from '../card/songCards/MobileSongCard.vue';
import { SongInfo } from '@/extensions/song';

const show = defineModel<boolean>();

const songStore = useSongStore();

const onPlay = (song: SongInfo) => {
  songStore.setPlayingList(songStore.playlist, song);
};

const anchors = [0, Math.round(0.8 * window.innerHeight)];
const height = ref(anchors[0]);
watch(
  show,
  (val) => {
    if (val == undefined) return;
    if (val) {
      height.value = anchors[1];
    } else {
      height.value = anchors[0];
    }
  },
  { immediate: true }
);

watch(height, (h) => {
  if (h === 0) {
    show.value = false;
  }
});
</script>

<template>
  <!-- <van-overlay :show="show" @click="show = false" class="z-[999]"> -->
  <van-floating-panel
    v-model:height="height"
    title="播放列表"
    :anchors="anchors"
    :content-draggable="false"
    teleport="body"
    class="pb-[110px] z-[1001]"
    @click.stop
  >
    <van-cell-group class="flex flex-col px-4 h-full overflow-y-auto">
      <div class="flex select-none pb-2">
        <div class="playMode">
          <div
            class="flex gap-1 items-center text-sm cursor-pointer van-haptics-feedback text-gray-400 hover:text-[--van-text-color]"
            @click="songStore.playMode = SongPlayMode.single"
            v-if="songStore.playMode === SongPlayMode.list"
          >
            <Icon icon="ic:round-list" width="22px" height="22px" />
            列表循环
          </div>
          <div
            class="flex gap-1 items-center text-sm cursor-pointer van-haptics-feedback text-gray-400 hover:text-[--van-text-color]"
            @click="songStore.playMode = SongPlayMode.random"
            v-else-if="songStore.playMode === SongPlayMode.single"
          >
            <Icon icon="typcn:arrow-loop" width="22px" height="22px" />
            单曲循环
          </div>
          <div
            class="flex gap-1 items-center text-sm cursor-pointer van-haptics-feedback text-gray-400 hover:text-[--van-text-color]"
            @click="songStore.playMode = SongPlayMode.list"
            v-else
          >
            <Icon icon="fe:random" width="22px" height="22px" />
            随机播放
          </div>
        </div>
      </div>
      <div v-for="song in songStore.playingPlaylist" :key="song.id">
        <MobileSongCard
          :song="song"
          @play="() => onPlay(song)"
        ></MobileSongCard>
      </div>
    </van-cell-group>
  </van-floating-panel>
  <!-- </van-overlay> -->
</template>

<style scoped lang="less"></style>
