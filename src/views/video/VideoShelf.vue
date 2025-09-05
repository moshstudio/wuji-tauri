<script setup lang="ts">
import type { VideoItem, VideoShelf } from '@wuji-tauri/source-extension';
import { storeToRefs } from 'pinia';
import { computed, ref, triggerRef } from 'vue';
import PlatformSwitch from '@/components/platform/PlatformSwitch.vue';
import AppVideoShelf from '@/layouts/app/video/VideoShelf.vue';
import DesktopVideoShelf from '@/layouts/desktop/video/VideoShelf.vue';
import { useVideoShelfStore } from '@/store';

const shelfStore = useVideoShelfStore();
const { videoShelf } = storeToRefs(shelfStore);

const activeIndex = ref(0);
const selecteMode = ref(false);
const showDeleteSheet = ref(false);
const deleteSheetActions = computed(() => {
  return videoShelf.value.map((shelf) => {
    return {
      name: shelf.name,
      subname: `共 ${shelf.videos.length || 0} 个视频`,
      color: '#E74C3C',
      callback: () => {
        shelfStore.removeVideoShelf(shelf.id);
        showDeleteSheet.value = false;
      },
    };
  });
});

function createShelf(name: string) {
  shelfStore.createVideoShelf(name);
}

function deleteShelf() {
  showDeleteSheet.value = true;
}

function deleteSelected() {
  for (const shelf of videoShelf.value) {
    const list: VideoItem[] = [];
    for (const item of shelf.videos) {
      if (item.video.extra?.selected) {
        list.push(item.video);
      }
    }
    removeVideoFromShelf(list, shelf);
  }
  triggerRef(videoShelf);
  selecteMode.value = false;
}
function removeVideoFromShelf(
  video: VideoItem | VideoItem[],
  shelf: VideoShelf,
) {
  shelfStore.removeVideoFromShelf(video, shelf.id);
}
</script>

<template>
  <PlatformSwitch>
    <template #app>
      <AppVideoShelf
        v-model:active-index="activeIndex"
        v-model:selecte-mode="selecteMode"
        :create-shelf="createShelf"
        :delete-shelf="deleteShelf"
        :delete-selected="deleteSelected"
      />
    </template>
    <template #desktop>
      <DesktopVideoShelf
        v-model:active-index="activeIndex"
        v-model:selecte-mode="selecteMode"
        :create-shelf="createShelf"
        :delete-shelf="deleteShelf"
        :delete-selected="deleteSelected"
      />
    </template>
    <van-action-sheet
      v-model:show="showDeleteSheet"
      title="删除视频收藏夹"
      :actions="deleteSheetActions"
      teleport="body"
    />
  </PlatformSwitch>
</template>

<style scoped lang="less"></style>
