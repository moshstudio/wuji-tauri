<script setup lang="ts">
import type { VideoItem, VideoShelf } from '@/extensions/video';
import PlatformSwitch from '@/components/PlatformSwitch.vue';
import { useDisplayStore, useVideoShelfStore } from '@/store';
import { storeToRefs } from 'pinia';
import { onMounted, onUnmounted, ref, triggerRef, watch } from 'vue';
import MobileVideoShelf from '../mobileView/video/VideoShelf.vue';
import WinVideoShelf from '../windowsView/video/VideoShelf.vue';

const displayStore = useDisplayStore();
const shelfStore = useVideoShelfStore();
const { showVideoShelf } = storeToRefs(displayStore);
const { videoShelf } = storeToRefs(shelfStore);

const activeIndex = ref(0);
const selecteMode = ref(false);

function deleteSelected() {
  for (const shelf of videoShelf.value) {
    for (const item of shelf.videos) {
      if (item.video.extra?.selected) {
        removeVideoFromShelf(item.video, shelf);
      }
    }
  }
  triggerRef(videoShelf);
  selecteMode.value = false;
}
function removeVideoFromShelf(video: VideoItem, shelf: VideoShelf) {
  shelfStore.removeVideoFromShelf(video, shelf.id);
}
</script>

<template>
  <PlatformSwitch>
    <template #mobile>
      <MobileVideoShelf
        v-model:active-index="activeIndex"
        v-model:selecte-mode="selecteMode"
        @delete-selected="deleteSelected"
      />
    </template>
    <template #windows>
      <WinVideoShelf
        v-model:active-index="activeIndex"
        v-model:selecte-mode="selecteMode"
        @delete-selected="deleteSelected"
      />
    </template>
  </PlatformSwitch>
</template>

<style scoped lang="less"></style>
