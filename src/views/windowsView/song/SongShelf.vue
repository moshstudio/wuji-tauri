<script setup lang="ts">
import type { PlaylistInfo } from '@/extensions/song/index';
import SongShelfSideBar from '@/components/SongShelfSideBar.vue';
import AddSongShelfDialog from '@/components/windows/dialogs/AddSongShelf.vue';
import ImportPlaylistDialog from '@/components/windows/dialogs/ImportPlaylist.vue';
import RemoveSongShelfDialog from '@/components/windows/dialogs/RemoveSongShelf.vue';
import { useDisplayStore, useSongStore } from '@/store/index';
import { storeToRefs } from 'pinia';

const emit = defineEmits<{
  (e: 'loadPage', id: string, pageNo?: number): void;
  (e: 'playAll', playlist: PlaylistInfo): void;
}>();

const songStore = useSongStore();
const displayStore = useDisplayStore();
const { showSongShelf } = storeToRefs(displayStore);

const { selectedSongShelf } = storeToRefs(displayStore);
</script>

<template>
  <van-popup
    v-model:show="showSongShelf"
    position="bottom"
    :overlay="false"
    :z-index="1000"
    class="overflow-hidden sticky left-0 top-0 right-0 bottom-0 w-full h-full flex flex-col"
  >
    <div
      class="shrink-0 w-full flex justify-between items-center px-4 h-[46px] border-b"
    >
      <h2 class="text-lg font-semibold text-[--van-text-color]">音乐收藏</h2>
      <van-icon
        name="arrow-down"
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

    <SongShelfSideBar
      v-model:selected-shelf="selectedSongShelf"
      @load-page="(id, pageNo) => emit('loadPage', id, pageNo)"
      @play-all="(playlist) => emit('playAll', playlist)"
    />
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
