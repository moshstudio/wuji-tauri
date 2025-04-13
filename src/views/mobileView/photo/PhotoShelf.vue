<script setup lang="ts">
import type { PropType } from 'vue';
import MobileShelfPhotoCard from '@/components/card/photoCards/MobileShelfPhotoCard.vue';
import LeftPopup from '@/components/mobile/LeftPopup.vue';
import ResponsiveGrid from '@/components/ResponsiveGrid.vue';
import AddPhotoShelfDialog from '@/components/windows/dialogs/AddPhotoShelf.vue';
import removePhotoShelfDialog from '@/components/windows/dialogs/removePhotoShelf.vue';
import { useDisplayStore, usePhotoShelfStore } from '@/store';

const emit = defineEmits<{
  (e: 'deleteSelected'): void;
  (e: 'hidePanel'): void;
}>();
const displayStore = useDisplayStore();
const shelfStore = usePhotoShelfStore();

const activeIndex = defineModel('activeIndex', { type: Number, default: 0 });
const selecteMode = defineModel('selecteMode', {
  type: Boolean,
  default: false,
});

const shelfAnchors = defineModel('shelfAnchors', {
  type: Array as PropType<number[]>,
});
const shelfHeight = defineModel('shelfHeight', { type: Number, default: 0 });
</script>

<template>
  <van-floating-panel
    v-model:height="shelfHeight"
    :anchors="shelfAnchors"
    :content-draggable="false"
    class="left-[0px] right-[0px] w-auto rounded-none up-shadow"
    :style="displayStore.showPhotoShelf ? { height: `${shelfHeight}px` } : {}"
    @height-change="
      (height) => {
        if (height.height === 0) {
          displayStore.showPhotoShelf = false;
        }
      }
    "
  >
    <template #header>
      <div class="flex justify-between items-center p-2 border-b">
        <div class="flex items-center gap-2">
          <LeftPopup />
          <h2 class="text-lg font-bold">
            <slot name="title">
              <p class="text-[--van-text-color]">
                图库
              </p>
            </slot>
          </h2>
        </div>
        <van-button
          icon="arrow-down"
          size="small"
          plain
          round
          @click="
            () => {
              selecteMode = false;
              emit('hidePanel');
            }
          "
        />
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
      />
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
      />
      <van-button
        icon="edit"
        size="small"
        round
        @click="() => (selecteMode = !selecteMode)"
      />
      <van-button
        v-if="selecteMode"
        size="small"
        type="danger"
        round
        @click="() => emit('deleteSelected')"
      >
        删除所选
      </van-button>
    </div>
    <van-tabs shrink animated :active="activeIndex" class="pb-[50px]">
      <van-tab
        v-for="shelf in shelfStore.photoShelf"
        :key="shelf.id"
        :title="shelf.name"
      >
        <ResponsiveGrid :base-cols="2" class="p-2">
          <template v-for="photo in shelf.photos" :key="photo">
            <MobileShelfPhotoCard
              v-model:selected="photo.extra.selected"
              :item="photo"
              :selecte-mode="selecteMode"
            />
          </template>
        </ResponsiveGrid>
      </van-tab>
    </van-tabs>
  </van-floating-panel>
  <AddPhotoShelfDialog />
  <removePhotoShelfDialog />
</template>

<style scoped lang="less">
:deep(.van-card__thumb) {
  width: 80px;
  height: 100px;
}
</style>
