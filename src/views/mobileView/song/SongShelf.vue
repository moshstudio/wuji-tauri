<script setup lang="ts">
import { useSongStore, useSongShelfStore, useDisplayStore } from '@/store';
import _ from 'lodash';

import { onMounted, onUnmounted, PropType, ref, watch } from 'vue';
import SimplePagination from '@/components/pagination/SimplePagination.vue';
import AddSongShelfDialog from '@/components/windows/dialogs/AddSongShelf.vue';
import RemoveSongShelfDialog from '@/components/windows/dialogs/RemoveSongShelf.vue';
import MobileShelfSongCard from '@/components/card/songCards/MobileShelfSongCard.vue';
import ImportPlaylistDialog from '@/components/windows/dialogs/ImportPlaylist.vue';
import MoreOptionsSheet from '@/components/actionSheets/MoreOptions.vue';
import { ActionSheetAction } from 'vant';
import { SongShelfType } from '@/types/song';
import { PlaylistInfo, SongInfo, SongShelf } from '@/extensions/song';
import { storeToRefs } from 'pinia';

const displayStore = useDisplayStore();
const songStore = useSongStore();
const shelfStore = useSongShelfStore();

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

const { showSongShelfDetail, selectedSongShelf } = storeToRefs(displayStore);
const offset = 0;
const shelfDetailAnchors = ref([
  offset,
  Math.round(window.innerHeight) + offset,
]);
const shelfDetailHeight = ref(0);
const hideDetailPanel = () => {
  shelfDetailHeight.value = shelfDetailAnchors.value[0];
  showSongShelfDetail.value = false;
};
watch(
  showSongShelfDetail,
  (newValue) => {
    if (newValue) {
      shelfDetailHeight.value = shelfDetailAnchors.value[1];
    } else {
      shelfDetailHeight.value = shelfDetailAnchors.value[0];
    }
  },
  { immediate: true }
);
const updateAnchors = () => {
  shelfDetailAnchors.value[1] = Math.round(window.innerHeight) + offset;
  if (showSongShelfDetail.value) {
    shelfDetailHeight.value = shelfDetailAnchors.value[1];
  }
};
onMounted(async () => {
  window.addEventListener('resize', updateAnchors);
});
onUnmounted(() => {
  window.removeEventListener('resize', updateAnchors);
});
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
    class="absolute left-[0px] right-[0px] bottom-[80px] w-auto rounded-none up-shadow"
    :style="displayStore.showSongShelf ? { height: `${shelfHeight}px` } : {}"
  >
    <template #header>
      <div class="flex justify-between items-center p-4 border-b">
        <h2 class="text-lg font-semibold">
          <slot name="title">
            <p class="text-[--van-text-color]">音乐收藏</p>
          </slot>
        </h2>
        <van-button
          icon="cross"
          size="small"
          plain
          round
          @click="
            () => {
              emit('hidePanel');
            }
          "
        >
        </van-button>
      </div>
    </template>
    <div class="flex flex-col w-full h-full">
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
        <van-button
          icon="link-o"
          size="small"
          round
          @click="() => (displayStore.showImportPlaylistDialog = true)"
        >
        </van-button>
      </div>
      <div class="flex flex-col gap-1 px-2 text-sm">
        <div
          class="flex items-center gap-2 p-1 rounded cursor-pointer hover:bg-[--van-background] text-[--van-text-color]"
          :style="{
            borderBottomColor:
              selectedSongShelf?.playlist.id ===
              shelfStore.songLikeShelf.playlist.id
                ? '#1989fa'
                : 'transparent',
          }"
          @click="
            () => {
              selectedSongShelf = shelfStore.songLikeShelf;
              showSongShelfDetail = true;
            }
          "
        >
          <SongPlaylistPhoto
            :url="shelfStore.songLikeShelf.playlist.picUrl"
            :width="40"
            :height="40"
          ></SongPlaylistPhoto>
          <span>
            {{ shelfStore.songLikeShelf.playlist.name }}
          </span>
        </div>
        <p class="text-gray-400">
          创建的歌单({{ shelfStore.songCreateShelf.length }})
        </p>
        <div
          class="flex items-center gap-2 p-1 rounded cursor-pointer hover:bg-[--van-background] text-[--van-text-color]"
          :style="{
            borderBottomColor:
              selectedSongShelf?.playlist.id === shelf.playlist.id
                ? '#1989fa'
                : 'transparent',
          }"
          @click="
            () => {
              selectedSongShelf = shelf;
              showSongShelfDetail = true;
            }
          "
          v-for="shelf in shelfStore.songCreateShelf"
        >
          <SongPlaylistPhoto
            :url="shelf.playlist.picUrl"
            :width="40"
            :height="40"
          ></SongPlaylistPhoto>
          <span>
            {{ shelf.playlist.name }}
          </span>
        </div>
        <p class="text-gray-400">
          收藏的歌单({{ shelfStore.songPlaylistShelf.length }})
        </p>
        <div
          class="flex items-center gap-2 p-1 rounded cursor-pointer hover:bg-[--van-background] text-[--van-text-color]"
          :style="{
            borderBottomColor:
              selectedSongShelf?.playlist.id === shelf.playlist.id
                ? '#1989fa'
                : 'transparent',
          }"
          @click="
            () => {
              selectedSongShelf = shelf;
              showSongShelfDetail = true;
            }
          "
          v-for="shelf in shelfStore.songPlaylistShelf"
        >
          <SongPlaylistPhoto
            :url="shelf.playlist.picUrl"
            :width="40"
            :height="40"
          ></SongPlaylistPhoto>
          <span>
            {{ shelf.playlist.name }}
          </span>
        </div>
      </div>
    </div>
  </van-floating-panel>
  <van-floating-panel
    class="song-shelf-detail pb-[110px]"
    v-model:height="shelfDetailHeight"
    :anchors="shelfDetailAnchors"
    :content-draggable="false"
    @height-change="
      (height) => {
        if (height.height === shelfDetailAnchors[0]) {
          showSongShelfDetail = false;
        }
      }
    "
  >
    <template #header>
      <van-nav-bar
        :title="selectedSongShelf?.playlist.name || '详情'"
        left-arrow
        @click-left="hideDetailPanel"
      />
    </template>
    <div class="flex flex-col gap-1 p-2 text-sm">
      <div
        class="flex gap-2"
        v-if="
          selectedSongShelf &&
          selectedSongShelf.playlist &&
          selectedSongShelf.type === SongShelfType.playlist &&
          selectedSongShelf.playlist.list &&
          (selectedSongShelf.playlist.list.totalPage || 0) > 1
        "
      >
        <van-button
          size="small"
          plain
          @click="() => emit('playAll', selectedSongShelf!.playlist)"
        >
          全部播放
        </van-button>
        <SimplePagination
          v-model="selectedSongShelf.playlist.list.page"
          :page-count="selectedSongShelf.playlist.list.totalPage || undefined"
          @change="
            (page: number) =>
              emit('loadPage', selectedSongShelf!.playlist.id, page)
          "
        ></SimplePagination>
      </div>
      <template
        v-for="song in selectedSongShelf?.playlist.list?.list"
        v-if="selectedSongShelf"
        :key="song"
      >
        <MobileShelfSongCard
          :song="song"
          :shelf="selectedSongShelf"
          @play="
            () =>
              songStore.setPlayingList(
                selectedSongShelf?.playlist.list?.list || [],
                song
              )
          "
        ></MobileShelfSongCard>
      </template>
    </div>
  </van-floating-panel>
  <AddSongShelfDialog></AddSongShelfDialog>
  <RemoveSongShelfDialog></RemoveSongShelfDialog>
  <ImportPlaylistDialog></ImportPlaylistDialog>
</template>

<style scoped lang="less">
:deep(.van-card__thumb) {
  width: 80px;
  height: 100px;
}
</style>
