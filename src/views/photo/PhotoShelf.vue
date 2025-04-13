<script setup lang="ts">
import type { PhotoItem, PhotoShelf } from '@/extensions/photo';
import PlatformSwitch from '@/components/PlatformSwitch.vue';
import { useDisplayStore, usePhotoShelfStore } from '@/store';
import { storeToRefs } from 'pinia';
import { onMounted, onUnmounted, ref, triggerRef, watch } from 'vue';
import MobilePhotoShelf from '../mobileView/photo/PhotoShelf.vue';
import WinPhotoShelf from '../windowsView/photo/PhotoShelf.vue';

const displayStore = useDisplayStore();
const shelfStore = usePhotoShelfStore();
const { showPhotoShelf } = storeToRefs(displayStore);
const { photoShelf } = storeToRefs(shelfStore);

const activeIndex = ref(0);
const selecteMode = ref(false);

function deleteSelected() {
  for (const shelf of photoShelf.value) {
    for (const item of shelf.photos) {
      if (item.extra.selected) {
        removePhotoFromShelf(item, shelf);
        triggerRef(photoShelf);
      }
    }
  }
  selecteMode.value = false;
}
function removePhotoFromShelf(photo: PhotoItem, shelf: PhotoShelf) {
  shelfStore.removePhotoFromShelf(photo, shelf.id);
}

// 书架展示相关
const shelfAnchors = ref([0, Math.round(window.innerHeight)]);
const shelfHeight = ref(0);
function hidePanel() {
  shelfHeight.value = shelfAnchors.value[0];
  showPhotoShelf.value = false;
}
watch(
  showPhotoShelf,
  (newValue) => {
    if (newValue) {
      shelfHeight.value = shelfAnchors.value[1];
    }
    else {
      shelfHeight.value = shelfAnchors.value[0];
    }
  },
  { immediate: true },
);
function updateAnchors() {
  shelfAnchors.value[1] = Math.round(window.innerHeight);
  if (showPhotoShelf.value) {
    shelfHeight.value = shelfAnchors.value[1];
  }
}
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
        v-model:shelf-anchors="shelfAnchors"
        v-model:shelf-height="shelfHeight"
        @delete-selected="deleteSelected"
        @hide-panel="hidePanel"
      />
    </template>
    <template #windows>
      <WinPhotoShelf
        v-model:active-index="activeIndex"
        v-model:selecte-mode="selecteMode"
        v-model:shelf-anchors="shelfAnchors"
        v-model:shelf-height="shelfHeight"
        @delete-selected="deleteSelected"
        @hide-panel="hidePanel"
      />
    </template>
  </PlatformSwitch>
</template>

<style scoped lang="less"></style>
