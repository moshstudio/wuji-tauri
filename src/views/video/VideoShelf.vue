<script setup lang="ts">
import _ from 'lodash';
import WinVideoShelf from '../windowsView/video/VideoShelf.vue';
import MobileVideoShelf from '../mobileView/video/VideoShelf.vue';
import PlatformSwitch from '@/components/PlatformSwitch.vue';
import { useDisplayStore, useVideoShelfStore } from '@/store';
import { onMounted, onUnmounted, ref, triggerRef, watch } from 'vue';
import { VideoItem, VideoShelf } from '@/extensions/video';
import { storeToRefs } from 'pinia';

const displayStore = useDisplayStore();
const shelfStore = useVideoShelfStore();
const { showVideoShelf } = storeToRefs(displayStore);
const { videoShelf } = storeToRefs(shelfStore);

const activeIndex = ref(0);
const selecteMode = ref(false);

const deleteSelected = () => {
  for (const shelf of videoShelf.value) {
    for (const item of shelf.videos) {
      if (item.video.extra?.selected) {
        removeVideoFromShelf(item.video, shelf);
        triggerRef(videoShelf);
      }
    }
  }
  selecteMode.value = false;
};
const removeVideoFromShelf = (video: VideoItem, shelf: VideoShelf) => {
  shelfStore.removeVideoFromShelf(video, shelf.id);
};

// 书架展示相关
const shelfAnchors = ref([0, Math.round(window.innerHeight)]);
const shelfHeight = ref(0);
const hidePanel = () => {
  shelfHeight.value = shelfAnchors.value[0];
  showVideoShelf.value = false;
};
watch(
  showVideoShelf,
  (newValue) => {
    if (newValue) {
      shelfHeight.value = shelfAnchors.value[1];
    } else {
      shelfHeight.value = shelfAnchors.value[0];
    }
  },
  { immediate: true }
);
const updateAnchors = () => {
  shelfAnchors.value[1] = Math.round(window.innerHeight);
  if (showVideoShelf.value) {
    shelfHeight.value = shelfAnchors.value[1];
  }
};
onMounted(() => {
  window.addEventListener('resize', updateAnchors);
});
onUnmounted(() => {
  window.removeEventListener('resize', updateAnchors);
});
</script>

<template>
  <PlatformSwitch>
    <template #mobile>
      <MobileVideoShelf
        v-model:selecte-mode="selecteMode"
        @delete-selected="deleteSelected"
        v-model:shelf-anchors="shelfAnchors"
        v-model:shelf-height="shelfHeight"
        @hide-panel="hidePanel"
      ></MobileVideoShelf>
    </template>
    <template #windows>
      <WinVideoShelf
        v-model:active-index="activeIndex"
        v-model:selecte-mode="selecteMode"
        @delete-selected="deleteSelected"
        v-model:shelf-anchors="shelfAnchors"
        v-model:shelf-height="shelfHeight"
        @hide-panel="hidePanel"
      ></WinVideoShelf>
    </template>
  </PlatformSwitch>
</template>

<style scoped lang="less"></style>
