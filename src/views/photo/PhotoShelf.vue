<script setup lang="ts">
import _ from 'lodash';
import WinPhotoShelf from '../windowsView/photo/PhotoShelf.vue';
import MobilePhotoShelf from '../mobileView/photo/PhotoShelf.vue';
import PlatformSwitch from '@/components/PlatformSwitch.vue';
import { useDisplayStore, usePhotoShelfStore } from '@/store';
import { onMounted, onUnmounted, ref, triggerRef, watch } from 'vue';
import { PhotoItem, PhotoShelf } from '@/extensions/photo';
import { storeToRefs } from 'pinia';

const displayStore = useDisplayStore();
const shelfStore = usePhotoShelfStore();
const { showPhotoShelf } = storeToRefs(displayStore);
const { photoShelf } = storeToRefs(shelfStore);

const activeIndex = ref(0);
const selecteMode = ref(false);

const deleteSelected = () => {
  for (const shelf of photoShelf.value) {
    for (const item of shelf.photos) {
      if (item.extra.selected) {
        removePhotoFromShelf(item, shelf);
        triggerRef(photoShelf);
      }
    }
  }
  selecteMode.value = false;
};
const removePhotoFromShelf = (photo: PhotoItem, shelf: PhotoShelf) => {
  shelfStore.removePhotoFromShelf(photo, shelf.id);
};

// 书架展示相关
const shelfAnchors = ref([0, Math.round(window.innerHeight)]);
const shelfHeight = ref(0);
const hidePanel = () => {
  shelfHeight.value = shelfAnchors.value[0];
  showPhotoShelf.value = false;
};
watch(
  showPhotoShelf,
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
  if (showPhotoShelf.value) {
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
      <MobilePhotoShelf
        v-model:selecte-mode="selecteMode"
        @delete-selected="deleteSelected"
        v-model:shelf-anchors="shelfAnchors"
        v-model:shelf-height="shelfHeight"
        @hide-panel="hidePanel"
      ></MobilePhotoShelf>
    </template>
    <template #windows>
      <WinPhotoShelf
        v-model:active-index="activeIndex"
        v-model:selecte-mode="selecteMode"
        @delete-selected="deleteSelected"
        v-model:shelf-anchors="shelfAnchors"
        v-model:shelf-height="shelfHeight"
        @hide-panel="hidePanel"
      ></WinPhotoShelf>
    </template>
  </PlatformSwitch>
</template>

<style scoped lang="less"></style>
