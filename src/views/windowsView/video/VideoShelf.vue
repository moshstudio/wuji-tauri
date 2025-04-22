<script setup lang="ts">
import type { PropType } from 'vue';
import WinShelfVideoCard from '@/components/card/videoCards/WinShelfVideoCard.vue';
import ResponsiveGrid from '@/components/ResponsiveGrid.vue';
import AddVideoShelfDialog from '@/components/windows/dialogs/AddVideoShelf.vue';
import removeVideoShelfDialog from '@/components/windows/dialogs/RemoveVideoShelf.vue';
import { useDisplayStore, useVideoShelfStore } from '@/store';
import { storeToRefs } from 'pinia';

const emit = defineEmits<{
  (e: 'deleteSelected'): void;
}>();
const displayStore = useDisplayStore();
const shelfStore = useVideoShelfStore();
const { videoShelf } = storeToRefs(shelfStore);
const { showVideoShelf } = storeToRefs(displayStore);

const activeIndex = defineModel('activeIndex', { type: Number, default: 0 });
const selecteMode = defineModel('selecteMode', {
  type: Boolean,
  default: false,
});
</script>
<template>
  <van-popup
    v-model:show="showVideoShelf"
    position="bottom"
    :overlay="false"
    :z-index="1000"
    class="overflow-hidden sticky left-0 top-0 right-0 bottom-0 w-full h-full"
  >
    <div
      class="shrink-0 w-full flex justify-between items-center px-4 h-[46px] border-b"
    >
      <h2 class="text-lg font-semibold text-[--van-text-color]">影库</h2>
      <van-icon
        name="cross"
        size="24"
        @click="showVideoShelf = false"
        class="van-haptics-feedback text-[--van-text-color]"
      />
    </div>
    <div class="shrink-0 w-full flex gap-2 px-4 pt-2 h-[44px]">
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
    <van-tabs
      shrink
      animated
      sticky
      :offset-top="90"
      :active="activeIndex"
      class="w-full h-full overflow-y-scroll"
    >
      <van-tab v-for="shelf in videoShelf" :key="shelf.id" :title="shelf.name">
        <ResponsiveGrid :base-cols="2" class="p-2">
          <WinShelfVideoCard
            v-for="video in shelf.videos"
            :key="video.video.id"
            v-model:selected="video.video.extra!.selected"
            :shelf-video="video"
            :selecte-mode="selecteMode"
          />
        </ResponsiveGrid>
      </van-tab>
    </van-tabs>
  </van-popup>
  <AddVideoShelfDialog />
  <removeVideoShelfDialog />
</template>

<style scoped lang="less">
:deep(.van-card__thumb) {
  width: 80px;
  height: 100px;
}
</style>
