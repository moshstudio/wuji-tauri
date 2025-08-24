<script setup lang="ts">
import type { PhotoItem, PhotoShelf } from '@wuji-tauri/source-extension';
import PlatformSwitch from '@/components/platform/PlatformSwitch.vue';
import { usePhotoShelfStore } from '@/store';
import { storeToRefs } from 'pinia';
import { computed, ref, triggerRef } from 'vue';
import AppPhotoShelf from '@/layouts/app/photo/PhotoShelf.vue';
import DesktopPhotoShelf from '@/layouts/desktop/photo/PhotoShelf.vue';

const shelfStore = usePhotoShelfStore();
const { photoShelf } = storeToRefs(shelfStore);

const activeIndex = ref(0);
const selecteMode = ref(false);
const showDeleteSheet = ref(false);
const deleteSheetActions = computed(() => {
  return photoShelf.value.map((shelf) => {
    return {
      name: shelf.name,
      subname: `共 ${shelf.photos.length || 0} 个相册`,
      color: '#E74C3C',
      callback: () => {
        shelfStore.removeShelf(shelf.id);
        showDeleteSheet.value = false;
      },
    };
  });
});

function createShelf(name: string) {
  shelfStore.createShelf(name);
}

function deleteShelf() {
  showDeleteSheet.value = true;
}
function deleteSelected() {
  for (const shelf of photoShelf.value) {
    const list: PhotoItem[] = [];
    for (const item of shelf.photos) {
      if (item.extra.selected) {
        list.push(item);
      }
    }
    removePhotoFromShelf(list, shelf);
  }
  removePhotoFromShelf;
  selecteMode.value = false;
  triggerRef(photoShelf);
}
function removePhotoFromShelf(
  photo: PhotoItem | PhotoItem[],
  shelf: PhotoShelf,
) {
  shelfStore.removePhotoFromShelf(photo, shelf.id);
}
</script>

<template>
  <PlatformSwitch>
    <template #app>
      <AppPhotoShelf
        v-model:active-index="activeIndex"
        v-model:selecte-mode="selecteMode"
        :create-shelf="createShelf"
        :deleteShelf="deleteShelf"
        :delete-selected="deleteSelected"
      />
    </template>
    <template #desktop>
      <DesktopPhotoShelf
        v-model:active-index="activeIndex"
        v-model:selecte-mode="selecteMode"
        :create-shelf="createShelf"
        :deleteShelf="deleteShelf"
        :delete-selected="deleteSelected"
      />
    </template>
    <van-action-sheet
      v-model:show="showDeleteSheet"
      title="删除图片收藏夹"
      :actions="deleteSheetActions"
      teleport="body"
    ></van-action-sheet>
  </PlatformSwitch>
</template>

<style scoped lang="less"></style>
