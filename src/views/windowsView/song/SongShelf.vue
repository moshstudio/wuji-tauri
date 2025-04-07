<script setup lang="ts">
import { useSongStore, useSongShelfStore, useDisplayStore } from '@/store';
import _ from 'lodash';

import { PropType } from 'vue';
import AddSongShelfDialog from '@/components/windows/dialogs/AddSongShelf.vue';
import RemoveSongShelfDialog from '@/components/windows/dialogs/RemoveSongShelf.vue';
import ImportPlaylistDialog from '@/components/windows/dialogs/ImportPlaylist.vue';
import { PlaylistInfo, SongShelf } from '@/extensions/song';
import { Icon } from '@iconify/vue';
import SongShelfSideBar from '@/components/SongShelfSideBar.vue';
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
const { selectedSongShelf } = storeToRefs(displayStore);
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
    class="left-[50px] right-[0px] w-auto rounded-none up-shadow bottom-[80px]"
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
      <div class="flex items-center gap-2 m-2 p-1 shrink">
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
      <SongShelfSideBar
        class="w-full h-full flex-grow"
        v-model:selected-shelf="selectedSongShelf"
        @load-page="(id, pageNo) => emit('loadPage', id, pageNo)"
        @play-all="(playlist) => emit('playAll', playlist)"
      ></SongShelfSideBar>
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
