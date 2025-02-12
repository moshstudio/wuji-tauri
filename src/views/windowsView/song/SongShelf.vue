<script setup lang="ts">
import { useSongStore, useSongShelfStore, useDisplayStore } from '@/store';
import _ from 'lodash';

import { PropType } from 'vue';
import AddSongShelfDialog from '@/components/windows/dialogs/AddSongShelf.vue';
import RemoveSongShelfDialog from '@/components/windows/dialogs/RemoveSongShelf.vue';
import { PlaylistInfo, SongShelf } from '@/extensions/song';
import SongShelfSideBar from '@/components/SongShelfSideBar.vue';

const displayStore = useDisplayStore();
const songStore = useSongStore();
const shelfStore = useSongShelfStore();

const selectedShelf = defineModel('selectedShelf', {
  type: Object as PropType<SongShelf>,
});
const shelfAnchors = defineModel('shelfAnchors', {
  type: Array as PropType<number[]>,
  default: () => [0, 100],
});
const shelfHeight = defineModel('shelfHeight', { type: Number, default: 0 });

const emit = defineEmits<{
  (e: 'loadPage', id: String, pageNo?: number): void;
  (e: 'playAll', playlist: PlaylistInfo): void;
  (e: 'hidePanel'): void;
}>();
</script>

<template>
  <van-floating-panel
    v-model:height="shelfHeight"
    :anchors="shelfAnchors"
    :content-draggable="false"
    @height-change="
      (height) => {
        if (height.height === shelfAnchors[0]) {
          displayStore.showSongShelf = false;
        }
      }
    "
    class="absolute left-[50px] right-[0px] w-auto rounded-none up-shadow bottom-[80px]"
    :style="displayStore.showSongShelf ? { height: `${shelfHeight}px` } : {}"
  >
    <template #header>
      <div class="flex justify-between items-center p-4 border-b">
        <h2 class="text-lg font-semibold">
          <slot name="title">
            <p class="text-[--van-text-color]">音乐收藏</p>
          </slot>
        </h2>
        <div class="text-button" @click="() => emit('hidePanel')">关闭收藏</div>
      </div>
    </template>
    <div class="flex flex-col w-full h-full overflow-hidden">
      <div class="flex gap-2 m-2 p-1 shrink">
        <van-button
          icon="plus"
          size="small"
          round
          @click="() => (displayStore.showAddSongShelfDialog = true)"
        >
        </van-button>
        <van-button
          icon="delete-o"
          size="small"
          round
          @click="() => (displayStore.showRemoveSongShelfDialog = true)"
        >
        </van-button>
      </div>
      <SongShelfSideBar
        class="w-full h-full"
        v-model:selected-shelf="selectedShelf"
        @load-page="(id, pageNo) => emit('loadPage', id, pageNo)"
        @play-all="(playlist) => emit('playAll', playlist)"
      ></SongShelfSideBar>

      <!-- <van-tabs shrink @rendered="(id) => emit('loadPage', id)" class="grow">
        <template
          v-for="shelf in [
            shelfStore.songLikeShelf,
            ...shelfStore.songCreateShelf,
            ...shelfStore.songPlaylistShelf,
          ]"
          :key="shelf.playlist.id"
        >
          <van-tab :name="shelf.playlist.id">
            <template #title>
              <span class="max-w-[40px] truncate">
                {{ shelf.playlist.name }}
              </span>
            </template>
            <van-row
              align="center"
              class="mt-2"
              v-if="
                shelf.type === SongShelfType.playlist &&
                shelf.playlist.list?.page &&
                shelf.playlist.list?.totalPage &&
                shelf.playlist.list?.totalPage > 1
              "
            >
              <SimplePagination
                v-model="shelf.playlist.list.page"
                :page-count="shelf.playlist.list.totalPage"
                @change="
                  (page: number) => emit('loadPage', shelf.playlist.id, page)
                "
              ></SimplePagination>
              <van-button
                size="small"
                @click="() => emit('playAll', shelf.playlist)"
              >
                播放全部
              </van-button>
            </van-row>
            <ResponsiveGrid class="pb-4">
              <WinShelfSongCard
                :song="song"
                :shelf="shelf"
                v-for="song in shelf.playlist.list?.list"
                :key="song.id"
                @play="
                  () =>
                    songStore.setPlayingList(
                      shelf.playlist.list?.list || [],
                      song
                    )
                "
              ></WinShelfSongCard>
            </ResponsiveGrid>
          </van-tab>
        </template>
      </van-tabs> -->
    </div>
  </van-floating-panel>
  <AddSongShelfDialog></AddSongShelfDialog>
  <RemoveSongShelfDialog></RemoveSongShelfDialog>
</template>

<style scoped lang="less">
:deep(.van-card__thumb) {
  width: 80px;
  height: 100px;
}
</style>
