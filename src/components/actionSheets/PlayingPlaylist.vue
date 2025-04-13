<script setup lang="ts">
import type { SongInfo } from '@/extensions/song';
import { useSongStore } from '@/store';
import { SongPlayMode } from '@/types/song';
import { Icon } from '@iconify/vue';
import { ref, watch } from 'vue';
import MobileSongCard from '../card/songCards/MobileSongCard.vue';

const show = defineModel<boolean>();

const songStore = useSongStore();

function onPlay(song: SongInfo) {
  songStore.setPlayingList(songStore.playlist, song);
}

const anchors = [0, Math.round(0.8 * window.innerHeight)];
const height = ref(anchors[0]);
watch(
  show,
  (val) => {
    if (val == undefined)
      return;
    if (val) {
      height.value = anchors[1];
    }
    else {
      height.value = anchors[0];
    }
  },
  { immediate: true },
);

watch(height, (h) => {
  if (h === 0) {
    show.value = false;
  }
});
</script>

<template>
  <van-overlay :show="show" class="z-[1001]" @click="show = false">
    <van-floating-panel
      v-model:height="height"
      :anchors="anchors"
      :content-draggable="true"
      teleport="body"
      class="pb-[110px] z-[1001]"
      @click.stop
      @touchmove.stop
    >
      <div class="flex flex-col h-full px-2 overflow-hidden">
        <div class="flex select-none pb-2 pl-2">
          <div class="playMode">
            <div
              v-if="songStore.playMode === SongPlayMode.list"
              class="flex gap-1 items-center text-sm cursor-pointer van-haptics-feedback text-gray-400 hover:text-[--van-text-color]"
              @click="songStore.playMode = SongPlayMode.single"
            >
              <Icon icon="ic:round-list" width="22px" height="22px" />
              列表循环
            </div>
            <div
              v-else-if="songStore.playMode === SongPlayMode.single"
              class="flex gap-1 items-center text-sm cursor-pointer van-haptics-feedback text-gray-400 hover:text-[--van-text-color]"
              @click="songStore.playMode = SongPlayMode.random"
            >
              <Icon icon="typcn:arrow-loop" width="22px" height="22px" />
              单曲循环
            </div>
            <div
              v-else
              class="flex gap-1 items-center text-sm cursor-pointer van-haptics-feedback text-gray-400 hover:text-[--van-text-color]"
              @click="songStore.playMode = SongPlayMode.list"
            >
              <Icon icon="fe:random" width="22px" height="22px" />
              随机播放
            </div>
          </div>
        </div>
        <div
          class="flex flex-col flex-grow overflow-y-auto pl-2"
          @click.stop
          @touchmove.stop
        >
          <div v-for="song in songStore.playingPlaylist" :key="song.id">
            <MobileSongCard
              :song="song"
              :class="
                song.id === songStore.playingSong?.id ? 'playing-song' : ''
              "
              @play="() => onPlay(song)"
            />
          </div>
        </div>
      </div>
    </van-floating-panel>
  </van-overlay>
</template>

<style scoped lang="less"></style>
