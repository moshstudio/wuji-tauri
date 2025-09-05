<script setup lang="ts">
import type { PlaylistInfo, SongInfo } from '@wuji-tauri/source-extension';
import { LoadImage, WSongCard } from '@wuji-tauri/components/src';
import AddShelfButton from '@/components/button/AddShelfButton.vue';
import ResponsiveGrid2 from '@/components/grid/ResponsiveGrid2.vue';
import MNavBar from '@/components/header/MNavBar.vue';
import MPagination from '@/components/pagination/MPagination.vue';
import WSongBar from '@/components/songbar/WSongBar.vue';
import { router } from '@/router';
import { useDisplayStore, useSongShelfStore, useSongStore } from '@/store';

withDefaults(
  defineProps<{
    playlist?: PlaylistInfo;
    pageNo?: number;
    inShelf?: boolean;
    toPage: (playlist: PlaylistInfo, pageNo: number) => void;
    playAll: (playlist: PlaylistInfo) => void;
    addToShelf: (playlist: PlaylistInfo) => void;
    showMoreOptions: (playlist: PlaylistInfo, song: SongInfo) => void;
  }>(),
  { inShelf: false },
);

const songStore = useSongStore();
const displayStore = useDisplayStore();
const shelfStore = useSongShelfStore();
</script>

<template>
  <div class="flex h-full w-full flex-col overflow-hidden">
    <MNavBar :title="playlist?.name || '歌单详情'" />
    <div class="flex flex-1 flex-col gap-2 overflow-y-auto p-2">
      <div class="flex items-center justify-center gap-2 rounded p-2 shadow">
        <div class="h-[120px] w-[120px]">
          <LoadImage
            v-if="playlist?.picUrl"
            :width="120"
            :height="120"
            :radius="8"
            fit="cover"
            :src="playlist?.picUrl"
            :headers="playlist?.picHeaders"
          >
            <template #loading>
              <div class="p-1 text-center text-lg">
                {{ playlist.name }}
              </div>
            </template>
          </LoadImage>
        </div>

        <div class="flex flex-col justify-around">
          <div class="line-clamp-3 text-lg font-bold text-[--van-text-color]">
            {{ playlist?.name }}
          </div>
          <van-text-ellipsis
            :content="playlist?.desc"
            rows="3"
            expand-text="展开"
            collapse-text="收起"
            class="text-xs text-gray-400"
          />
        </div>
      </div>
      <div class="flex items-center justify-between">
        <div class="flex gap-2">
          <AddShelfButton
            :is-added="inShelf"
            :add-click="
              () => {
                if (playlist) {
                  addToShelf(playlist);
                }
              }
            "
            :added-click="
              () => {
                router.push({ name: 'SongShelf' });
              }
            "
          />

          <van-button
            size="small"
            @click="
              () => {
                if (playlist) {
                  playAll(playlist);
                }
              }
            "
          >
            播放全部
          </van-button>
        </div>

        <MPagination
          v-if="playlist?.list?.totalPage"
          :page-no="pageNo"
          :page-count="playlist.list.totalPage"
          class="p-1"
          :to-page="
            (pageNo) => {
              if (playlist) {
                toPage(playlist, pageNo);
              }
            }
          "
        />
      </div>
      <ResponsiveGrid2>
        <WSongCard
          v-for="item in playlist?.list?.list"
          :key="item.id"
          :song="item"
          :shelfs="shelfStore.songCreateShelf"
          :is-playing="songStore.isPlaying"
          :is-playing-song="item.id === songStore.playingSong?.id"
          :play="() => songStore.setPlayingList(playlist!.list!.list, item)"
          :pause="songStore.onPause"
          :in-like-shelf="shelfStore.songInLikeShelf(item)"
          :add-to-like-shelf="shelfStore.addSongToShelf"
          :remove-from-like-shelf="shelfStore.removeSongFromShelf"
          :show-more-options="(song) => showMoreOptions(playlist!, song)"
        />
      </ResponsiveGrid2>

      <div
        v-if="!playlist?.list?.list.length"
        class="flex w-full items-center justify-center text-gray-400"
      >
        歌曲为空
      </div>
    </div>
    <WSongBar />
  </div>
</template>

<style scoped lang="less"></style>
