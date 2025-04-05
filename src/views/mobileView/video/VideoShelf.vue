<script setup lang="ts">
import _ from 'lodash';
import { useVideoShelfStore, useDisplayStore } from '@/store';
import { PropType } from 'vue';
import AddVideoShelfDialog from '@/components/windows/dialogs/AddVideoShelf.vue';
import removeVideoShelfDialog from '@/components/windows/dialogs/RemoveVideoShelf.vue';
import MobileShelfVideoCard from '@/components/card/videoCards/MobileShelfVideoCard.vue';
import ResponsiveGrid from '@/components/ResponsiveGrid.vue';
import { storeToRefs } from 'pinia';

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
          displayStore.showVideoShelf = false;
        }
      }
    "
    class="left-[0px] right-[0px] w-auto rounded-none up-shadow"
    :style="displayStore.showVideoShelf ? { height: `${shelfHeight}px` } : {}"
  >
    <template #header>
      <div class="flex justify-between items-center p-4 border-b">
        <h2 class="text-lg font-semibold">
          <slot name="title">
            <p class="text-[--van-text-color]">视频收藏</p>
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
            displayStore.showAddVideoShelfDialog = true;
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
            displayStore.showRemoveVideoShelfDialog = true;
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
    <van-tabs shrink animated :active="activeIndex">
      <van-tab :title="shelf.name" v-for="shelf in videoShelf" :key="shelf.id">
        <ResponsiveGrid :base-cols="2" class="p-2">
          <MobileShelfVideoCard
            :shelf-video="video"
            v-model:selected="video.video.extra!.selected"
            v-for="video in shelf.videos"
            :key="video.video.id"
            :selecteMode="selecteMode"
          ></MobileShelfVideoCard>
        </ResponsiveGrid>
      </van-tab>
    </van-tabs>
  </van-floating-panel>
  <AddVideoShelfDialog></AddVideoShelfDialog>
  <removeVideoShelfDialog></removeVideoShelfDialog>
</template>

<style scoped lang="less">
:deep(.van-card__thumb) {
  width: 80px;
  height: 100px;
}
</style>
