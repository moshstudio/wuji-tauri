<script setup lang="ts">
import type { SongInfo, SongShelf } from '@wuji-tauri/source-extension';
import { WSongShelfCard } from '@wuji-tauri/components/src';
import ResponsiveGrid2 from '@/components/grid/ResponsiveGrid2.vue';
import MNavBar from '@/components/header/MNavBar.vue';
import MPagination from '@/components/pagination/MPagination.vue';
import WSongBar from '@/components/songbar/WSongBar.vue';
import { useSongShelfStore, useSongStore } from '@/store';

withDefaults(
  defineProps<{
    shelf?: SongShelf;
    toPage: (shelf: SongShelf, pageNo: number) => void;
    playAll: (shelf: SongShelf) => void;
    removeSong?: (shelf: SongShelf, song: SongInfo) => void;
    removeShelf: (shelf: SongShelf) => void;
    showMoreOptions: (shelf: SongShelf, song: SongInfo) => void;
  }>(),
  {},
);
const songStore = useSongStore();
const shelfStore = useSongShelfStore();
</script>

<template>
  <div class="flex h-full w-full flex-col overflow-hidden">
    <MNavBar :title="shelf?.playlist.name || '歌单详情'" />
    <div class="flex flex-1 flex-col gap-2 overflow-y-auto p-2">
      <div v-if="shelf" class="flex gap-2">
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
        <ResponsiveGrid2>
          <WSongShelfCard
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
            :in-like-shelf="shelfStore.songInLikeShelf(song)"
            :add-to-like-shelf="shelfStore.addSongToShelf"
            :remove-from-like-shelf="shelfStore.removeSongFromShelf"
            :show-more-options="(song) => showMoreOptions(shelf!, song)"
          />
        </ResponsiveGrid2>

        <div
          v-if="!shelf.playlist.list?.list.length"
          class="flex w-full items-center justify-center text-gray-400"
        >
          歌曲为空
        </div>
      </div>
      <div v-else class="flex w-full items-center justify-center">
        <van-loading />
      </div>
    </div>
    <WSongBar />
  </div>
</template>

<style scoped lang="less"></style>
