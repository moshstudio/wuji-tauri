<script setup lang="ts">
import type { SongInfo } from '@/extensions/song';
import { useDisplayStore, useSongStore } from '@/store';
import { SongPlayMode } from '@/types/song';
import { Icon } from '@iconify/vue';
import MobileSongCard from '../card/songCards/MobileSongCard.vue';
import { storeToRefs } from 'pinia';

const songStore = useSongStore();
const displayStore = useDisplayStore();
const { showPlayingPlaylist } = storeToRefs(displayStore);

function onPlay(song: SongInfo) {
  songStore.setPlayingList(songStore.playlist, song);
}
</script>

<template>
  <van-popup
    v-model:show="showPlayingPlaylist"
    position="bottom"
    :z-index="1001"
    class="h-[80vh]"
    round
  >
    <div class="flex flex-col h-full px-2 pt-2 overflow-hidden">
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
            :class="song.id === songStore.playingSong?.id ? 'playing-song' : ''"
            @play="() => onPlay(song)"
          />
        </div>
        <div
          class="shrink-0"
          :class="{
            'h-[130px]': songStore.playingSong,
            'h-[50px]': !songStore.playingSong,
          }"
        ></div>
      </div>
    </div>
  </van-popup>
</template>

<style scoped lang="less"></style>
