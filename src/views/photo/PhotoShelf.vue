<script setup lang="ts">
import _ from 'lodash';
import WinPhotoShelf from '../windowsView/photo/PhotoShelf.vue';
import MobilePhotoShelf from '../mobileView/photo/PhotoShelf.vue';
import PlatformSwitch from '@/components/PlatformSwitch.vue';
import { usePhotoShelfStore } from '@/store';
import { onMounted, onUnmounted, ref, triggerRef, watch } from 'vue';
import { PhotoItem, PhotoShelf } from '@/extensions/photo';

const show = defineModel('show', { type: Boolean, default: false });

const shelfStore = usePhotoShelfStore();

const activeIndex = ref(0);
const selecteMode = ref(false);
const selectedItems = ref<PhotoShelf[]>([]);

const deleteSelected = () => {
  for (const shelf of selectedItems.value) {
    for (const item of _.cloneDeep(shelf.photos)) {
      if (item.extra.selected) {
        _.remove(shelf.photos, item);
        triggerRef(selectedItems);
        removePhotoFromShelf(item, shelf);
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
  console.log(shelfAnchors.value);
  console.log(shelfHeight.value);

  show.value = false;
};
watch(
  show,
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
  if (show.value) {
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
        v-model:show="show"
        v-model:selecte-mode="selecteMode"
        v-model:selected-items="selectedItems"
        @delete-selected="deleteSelected"
        v-model:shelf-anchors="shelfAnchors"
        v-model:shelf-height="shelfHeight"
        @hide-panel="hidePanel"
      ></MobilePhotoShelf>
    </template>
    <template #windows>
      <WinPhotoShelf
        v-model:show="show"
        v-model:active-index="activeIndex"
        v-model:selecte-mode="selecteMode"
        v-model:selected-items="selectedItems"
        @delete-selected="deleteSelected"
        v-model:shelf-anchors="shelfAnchors"
        v-model:shelf-height="shelfHeight"
        @hide-panel="hidePanel"
      ></WinPhotoShelf>
    </template>
  </PlatformSwitch>
</template>

<style scoped lang="less"></style>
