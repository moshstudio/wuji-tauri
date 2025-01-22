<script setup lang="ts">
import _ from 'lodash';
import { usePhotoShelfStore, useDisplayStore } from '@/store';
import { PropType, watch } from 'vue';
import AddPhotoShelfDialog from '@/components/windows/dialogs/AddPhotoShelf.vue';
import removePhotoShelfDialog from '@/components/windows/dialogs/removePhotoShelf.vue';
import { PhotoShelf } from '@/extensions/photo';
import PhotoCard from '@/components/card/PhotoCard.vue';

const displayStore = useDisplayStore();
const shelfStore = usePhotoShelfStore();

const show = defineModel('show', { type: Boolean, default: false });
const activeIndex = defineModel('activeIndex', { type: Number, default: 0 });
const selecteMode = defineModel('selecteMode', {
  type: Boolean,
  default: false,
});
const selectedItems = defineModel('selectedItems', {
  type: Array as PropType<PhotoShelf[]>,
  default: [],
});
const shelfAnchors = defineModel('shelfAnchors', {
  type: Array as PropType<number[]>,
});
const shelfHeight = defineModel('shelfHeight', { type: Number, default: 0 });

const emit = defineEmits<{
  (e: 'deleteSelected'): void;
  (e: 'hidePanel'): void;
}>();

watch(selecteMode, (mode) => {
  if (mode == true) {
    const clone = _.cloneDeep(shelfStore.photoShelf);
    clone.forEach((shelf) => {
      shelf.photos.forEach((photo) => {
        photo.extra ||= {};
        photo.extra.selected = false;
      });
    });
    selectedItems.value = clone;
  } else {
    selectedItems.value = [];
  }
});
</script>

<template>
  <van-floating-panel
    v-model:height="shelfHeight"
    :anchors="shelfAnchors"
    :content-draggable="false"
    @height-change="
      (height) => {
        if (height.height === 0) {
          show = false;
        }
      }
    "
    class="left-[0px] right-[0px] w-auto rounded-none up-shadow"
    :style="show ? { height: `${shelfHeight}px` } : {}"
  >
    <template #header>
      <div class="flex justify-between items-center p-4 border-b">
        <h2 class="text-lg font-semibold">
          <slot name="title">
            <p class="text-[--van-text-color]">图片收藏</p>
          </slot>
        </h2>
        <div
          class="text-button"
          @click="
            () => {
              selecteMode = false;
              emit('hidePanel');
            }
          "
        >
          关闭收藏
        </div>
      </div>
    </template>
    <div class="flex gap-2 m-2 p-1 shrink">
      <van-button
        icon="plus"
        size="small"
        round
        @click="
          () => {
            selecteMode = false;
            displayStore.showAddPhotoShelfDialog = true;
          }
        "
      >
      </van-button>
      <van-button
        icon="delete-o"
        size="small"
        round
        @click="
          () => {
            selecteMode = false;
            displayStore.showRemovePhotoShelfDialog = true;
          }
        "
      >
      </van-button>
      <van-button
        icon="edit"
        size="small"
        round
        @click="() => (selecteMode = !selecteMode)"
      >
      </van-button>
      <van-button
        size="small"
        type="danger"
        round
        @click="() => emit('deleteSelected')"
        v-if="selecteMode"
      >
        删除所选
      </van-button>
    </div>
    <van-tabs shrink :active="activeIndex" class="pb-[50px]">
      <van-tab
        :title="shelf.name"
        v-for="shelf in shelfStore.photoShelf"
        :key="shelf.id"
        v-if="!selecteMode"
      >
        <div class="grid grid-cols-2 gap-1">
          <PhotoCard
            :item="photo"
            v-for="photo in shelf.photos"
            :key="photo.id"
            :selecteMode="selecteMode"
          ></PhotoCard>
        </div>
      </van-tab>
      <van-tab
        :title="shelf.name"
        v-for="shelf in selectedItems"
        :key="shelf.id"
      >
        <div class="grid grid-cols-2 gap-2">
          <PhotoCard
            v-model:selected="photo.extra.selected"
            :item="photo"
            v-for="photo in shelf.photos"
            :key="photo.id"
            :selecteMode="selecteMode"
          ></PhotoCard>
        </div>
      </van-tab>
    </van-tabs>
  </van-floating-panel>
  <AddPhotoShelfDialog></AddPhotoShelfDialog>
  <removePhotoShelfDialog></removePhotoShelfDialog>
</template>

<style scoped lang="less">
:deep(.van-card__thumb) {
  width: 80px;
  height: 100px;
}
</style>
