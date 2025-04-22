<script setup lang="ts">
import type { PhotoItem, PhotoShelf } from '@/extensions/photo';
import PlatformSwitch from '@/components/PlatformSwitch.vue';
import { usePhotoShelfStore } from '@/store';
import { storeToRefs } from 'pinia';
import { ref, triggerRef } from 'vue';
import MobilePhotoShelf from '../mobileView/photo/PhotoShelf.vue';
import WinPhotoShelf from '../windowsView/photo/PhotoShelf.vue';

const shelfStore = usePhotoShelfStore();
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
</script>

<template>
  <PlatformSwitch>
    <template #mobile>
      <MobilePhotoShelf
        v-model:active-index="activeIndex"
        v-model:selecte-mode="selecteMode"
        @delete-selected="deleteSelected"
      />
    </template>
    <template #windows>
      <WinPhotoShelf
        v-model:active-index="activeIndex"
        v-model:selecte-mode="selecteMode"
        @delete-selected="deleteSelected"
      />
    </template>
  </PlatformSwitch>
</template>

<style scoped lang="less"></style>
