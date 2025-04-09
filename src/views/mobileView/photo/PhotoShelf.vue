<script setup lang="ts">
import _ from 'lodash';
import { usePhotoShelfStore, useDisplayStore } from '@/store';
import { onMounted, PropType, watch } from 'vue';
import AddPhotoShelfDialog from '@/components/windows/dialogs/AddPhotoShelf.vue';
import removePhotoShelfDialog from '@/components/windows/dialogs/removePhotoShelf.vue';
import MobileShelfPhotoCard from '@/components/card/photoCards/MobileShelfPhotoCard.vue';
import ResponsiveGrid from '@/components/ResponsiveGrid.vue';
import LeftPopup from '@/components/mobile/LeftPopup.vue';

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

const emit = defineEmits<{
  (e: 'deleteSelected'): void;
  (e: 'hidePanel'): void;
}>();
</script>

<template>
  <van-floating-panel
    v-model:height="shelfHeight"
    :anchors="shelfAnchors"
    :content-draggable="false"
    @height-change="
      (height) => {
        if (height.height === 0) {
          displayStore.showPhotoShelf = false;
        }
      }
    "
    class="left-[0px] right-[0px] w-auto rounded-none up-shadow"
    :style="displayStore.showPhotoShelf ? { height: `${shelfHeight}px` } : {}"
  >
    <template #header>
      <div class="flex justify-between items-center p-2 border-b">
        <div class="flex items-center gap-2">
          <LeftPopup></LeftPopup>
          <h2 class="text-lg font-bold">
            <slot name="title">
              <p class="text-[--van-text-color]">图库</p>
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
        >
        </van-button>
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
    <van-tabs shrink animated :active="activeIndex" class="pb-[50px]">
      <van-tab
        :title="shelf.name"
        v-for="shelf in shelfStore.photoShelf"
        :key="shelf.id"
      >
        <ResponsiveGrid :base-cols="2" class="p-2">
          <template v-for="photo in shelf.photos" :key="photo">
            <MobileShelfPhotoCard
              :item="photo"
              v-model:selected="photo.extra.selected"
              :selecteMode="selecteMode"
            ></MobileShelfPhotoCard>
          </template>
        </ResponsiveGrid>
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
