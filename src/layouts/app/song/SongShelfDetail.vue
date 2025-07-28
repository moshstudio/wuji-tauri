<script setup lang="ts">
import MNavBar from '@/components2/header/MNavBar.vue';
import MSongBar from '@/components2/songbar/MSongBar.vue';
import { MSongShelfCard } from '@wuji-tauri/components/src';
import MPagination from '@/components2/pagination/MPagination.vue';
import { useDisplayStore, useSongShelfStore, useSongStore } from '@/store';
import { SongInfo, SongShelf } from '@wuji-tauri/source-extension';
import { ref } from 'vue';

withDefaults(
  defineProps<{
    shelf?: SongShelf;
    toPage: (shelf: SongShelf, pageNo: number) => void;
    playAll: (shelf: SongShelf) => void;
    removeSong?: (shelf: SongShelf, song: SongInfo) => void;
    removeShelf: (shelf: SongShelf) => void;
  }>(),
  {},
);
const songStore = useSongStore();
const shelfStore = useSongShelfStore();

const showMoreOptions = ref(false);
</script>

<template>
  <div class="flex h-full w-full flex-col overflow-hidden">
    <MNavBar :title="shelf?.playlist.name || '歌单详情'">
      <template #right>
        <van-icon
          name="ellipsis"
          class="clickable p-2 text-[--van-text-color]"
          @click="() => (showMoreOptions = true)"
        ></van-icon>
      </template>
    </MNavBar>
    <div class="flex flex-1 flex-col gap-2 overflow-y-auto p-2">
      <div class="flex gap-2" v-if="shelf">
        <van-button
          size="small"
          @click="
            () => {
              if (shelf) {
                playAll(shelf);
              }
            }
          "
        >
          播放全部
        </van-button>
        <MPagination
          v-if="shelf.playlist.list?.totalPage"
          :page-no="shelf.playlist.list.page"
          :page-count="shelf.playlist.list.totalPage"
          :to-page="
            (page: number) => {
              if (shelf) {
                toPage(shelf, page);
              }
            }
          "
        />
      </div>

      <div
        v-if="shelf"
        class="flex flex-1 flex-col gap-1 overflow-y-auto px-2 text-sm"
      >
        <MSongShelfCard
          v-for="(song, index) in shelf.playlist.list?.list"
          :key="index"
          :song="song"
          :shelf="shelf"
          :is-playing="songStore.isPlaying"
          :is-playing-song="song.id === songStore.playingSong?.id"
          :play="
            () =>
              songStore.setPlayingList(shelf?.playlist.list?.list || [], song)
          "
          :pause="songStore.onPause"
          :remove-song-from-shelf="
            (song, shelf) => {
              shelfStore.removeSongFromShelf(song, shelf.playlist.id);
            }
          "
        ></MSongShelfCard>
        <div
          v-if="!shelf.playlist.list?.list.length"
          class="flex w-full items-center justify-center text-gray-400"
        >
          歌曲为空
        </div>
      </div>
      <div v-else class="flex w-full items-center justify-center">
        <van-loading></van-loading>
      </div>
    </div>
    <MSongBar></MSongBar>
  </div>
</template>

<style scoped lang="less"></style>
