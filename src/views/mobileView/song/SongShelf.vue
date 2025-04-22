<script setup lang="ts">
import type { PlaylistInfo } from '@/extensions/song';
import type { PropType } from 'vue';

import MobileShelfSongCard from '@/components/card/songCards/MobileShelfSongCard.vue';
import LeftPopup from '@/components/mobile/LeftPopup.vue';
import SimplePagination from '@/components/pagination/SimplePagination.vue';
import AddSongShelfDialog from '@/components/windows/dialogs/AddSongShelf.vue';
import ImportPlaylistDialog from '@/components/windows/dialogs/ImportPlaylist.vue';
import RemoveSongShelfDialog from '@/components/windows/dialogs/RemoveSongShelf.vue';
import { useDisplayStore, useSongShelfStore, useSongStore } from '@/store';
import { SongShelfType } from '@/types/song';
import { storeToRefs } from 'pinia';

const emit = defineEmits<{
  (e: 'loadPage', id: string, pageNo?: number): void;
  (e: 'playAll', playlist: PlaylistInfo): void;
}>();
const displayStore = useDisplayStore();
const songStore = useSongStore();
const shelfStore = useSongShelfStore();
const { showSongShelf } = storeToRefs(displayStore);

const { showSongShelfDetail, selectedSongShelf } = storeToRefs(displayStore);
</script>

<template>
  <van-popup
    v-model:show="showSongShelf"
    position="bottom"
    :overlay="false"
    :z-index="1000"
    class="absolute inset-0 w-full h-full flex flex-col overflow-hidden"
  >
    <div
      class="shrink-0 w-full flex justify-between items-center px-4 h-[46px] border-b"
    >
      <div class="flex items-center gap-2">
        <LeftPopup />
        <h2 class="text-lg font-semibold text-[--van-text-color]">乐库</h2>
      </div>
      <van-icon
        name="cross"
        size="24"
        @click="showSongShelf = false"
        class="van-haptics-feedback text-[--van-text-color]"
      />
    </div>

    <div class="shrink-0 w-full flex gap-2 px-4 pt-2 h-[44px]">
      <van-button
        icon="plus"
        size="small"
        round
        @click="() => (displayStore.showAddSongShelfDialog = true)"
      />
      <van-button
        icon="delete-o"
        size="small"
        round
        @click="() => (displayStore.showRemoveSongShelfDialog = true)"
      />
      <van-button
        icon="link-o"
        size="small"
        round
        @click="() => (displayStore.showImportPlaylistDialog = true)"
      />
    </div>
    <div class="flex flex-col w-full h-full gap-1 px-2 text-sm overflow-y-auto">
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
        />
        <span>
          {{ shelfStore.songLikeShelf.playlist.name }}
        </span>
      </div>
      <p class="text-gray-400">
        创建的歌单({{ shelfStore.songCreateShelf.length }})
      </p>
      <div
        v-for="shelf in shelfStore.songCreateShelf"
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
      >
        <SongPlaylistPhoto
          :url="shelf.playlist.picUrl"
          :width="40"
          :height="40"
        />
        <span>
          {{ shelf.playlist.name }}
        </span>
      </div>
      <p class="text-gray-400">
        收藏的歌单({{ shelfStore.songPlaylistShelf.length }})
      </p>
      <div
        v-for="shelf in shelfStore.songPlaylistShelf"
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
      >
        <SongPlaylistPhoto
          :url="shelf.playlist.picUrl"
          :width="40"
          :height="40"
        />
        <span>
          {{ shelf.playlist.name }}
        </span>
      </div>
    </div>
  </van-popup>
  <van-popup
    v-model:show="showSongShelfDetail"
    position="bottom"
    :overlay="false"
    :z-index="1000"
    class="overflow-hidden absolute insert-0 w-ull h-full flex flex-col"
  >
    <van-nav-bar
      :title="selectedSongShelf?.playlist.name || '详情'"
      left-arrow
      @click-left="showSongShelfDetail = false"
    />
    <div class="flex flex-col w-full h-full overflow-y-auto gap-1 p-2 text-sm">
      <div
        v-if="
          selectedSongShelf &&
          selectedSongShelf.playlist &&
          selectedSongShelf.type === SongShelfType.playlist &&
          selectedSongShelf.playlist.list &&
          (selectedSongShelf.playlist.list.totalPage || 0) > 1
        "
        class="flex gap-2"
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
        />
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
                song,
              )
          "
        />
      </template>
    </div>
  </van-popup>
  <AddSongShelfDialog />
  <RemoveSongShelfDialog />
  <ImportPlaylistDialog />
</template>

<style scoped lang="less">
:deep(.van-card__thumb) {
  width: 80px;
  height: 100px;
}
</style>
