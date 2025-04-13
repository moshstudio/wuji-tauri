<script setup lang="ts">
import type { PropType } from 'vue';
import MobileShelfVideoCard from '@/components/card/videoCards/MobileShelfVideoCard.vue';
import LeftPopup from '@/components/mobile/LeftPopup.vue';
import ResponsiveGrid from '@/components/ResponsiveGrid.vue';
import AddVideoShelfDialog from '@/components/windows/dialogs/AddVideoShelf.vue';
import removeVideoShelfDialog from '@/components/windows/dialogs/RemoveVideoShelf.vue';
import { useDisplayStore, useVideoShelfStore } from '@/store';
import { storeToRefs } from 'pinia';

const emit = defineEmits<{
  (e: 'deleteSelected'): void;
  (e: 'hidePanel'): void;
}>();
const displayStore = useDisplayStore();
const shelfStore = useVideoShelfStore();
const { videoShelf } = storeToRefs(shelfStore);

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
    :style="displayStore.showVideoShelf ? { height: `${shelfHeight}px` } : {}"
    @height-change="
      (height) => {
        if (height.height === 0) {
          displayStore.showVideoShelf = false;
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
                收藏
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
            displayStore.showAddVideoShelfDialog = true;
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
            displayStore.showRemoveVideoShelfDialog = true;
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
      <van-tab v-for="shelf in videoShelf" :key="shelf.id" :title="shelf.name">
        <ResponsiveGrid :base-cols="2" class="p-2">
          <MobileShelfVideoCard
            v-for="video in shelf.videos"
            :key="video.video.id"
            v-model:selected="video.video.extra!.selected"
            :shelf-video="video"
            :selecte-mode="selecteMode"
          />
        </ResponsiveGrid>
      </van-tab>
    </van-tabs>
  </van-floating-panel>
  <AddVideoShelfDialog />
  <removeVideoShelfDialog />
</template>

<style scoped lang="less">
:deep(.van-card__thumb) {
  width: 80px;
  height: 100px;
}
</style>
