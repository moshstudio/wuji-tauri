<script setup lang="ts">
import type { PlaylistInfo } from '@/extensions/song/index';
import type { PropType } from 'vue';
import SongShelfSideBar from '@/components/SongShelfSideBar.vue';
import AddSongShelfDialog from '@/components/windows/dialogs/AddSongShelf.vue';
import ImportPlaylistDialog from '@/components/windows/dialogs/ImportPlaylist.vue';
import RemoveSongShelfDialog from '@/components/windows/dialogs/RemoveSongShelf.vue';
import { useDisplayStore } from '@/store/index';
import { storeToRefs } from 'pinia';

const emit = defineEmits<{
  (e: 'loadPage', id: string, pageNo?: number): void;
  (e: 'playAll', playlist: PlaylistInfo): void;
  (e: 'hidePanel'): void;
}>();
const displayStore = useDisplayStore();

const shelfAnchors = defineModel('shelfAnchors', {
  type: Array as PropType<number[]>,
  default: () => [0, 100],
});
const shelfHeight = defineModel('shelfHeight', { type: Number, default: 0 });

const { selectedSongShelf } = storeToRefs(displayStore);
</script>

<template>
  <van-floating-panel
    v-model:height="shelfHeight"
    :anchors="shelfAnchors"
    :content-draggable="false"
    class="left-[50px] right-[0px] w-auto rounded-none up-shadow bottom-[80px]"
    :style="displayStore.showSongShelf ? { height: `${shelfHeight}px` } : {}"
    @height-change="
      (height) => {
        if (height.height === shelfAnchors[0]) {
          displayStore.showSongShelf = false;
        }
      }
    "
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
        class="w-full h-full flex-grow"
        @load-page="(id, pageNo) => emit('loadPage', id, pageNo)"
        @play-all="(playlist) => emit('playAll', playlist)"
      />
    </div>
  </van-floating-panel>
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
