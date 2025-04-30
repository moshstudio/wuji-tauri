<script setup lang="ts">
import WinShelfPhotoCard from '@/components/card/photoCards/WinShelfPhotoCard.vue';
import ResponsiveGrid from '@/components/ResponsiveGrid.vue';
import AddPhotoShelfDialog from '@/components/windows/dialogs/AddPhotoShelf.vue';
import removePhotoShelfDialog from '@/components/windows/dialogs/removePhotoShelf.vue';
import { useDisplayStore, usePhotoShelfStore } from '@/store';
import { storeToRefs } from 'pinia';

const emit = defineEmits<{
  (e: 'deleteSelected'): void;
}>();
const displayStore = useDisplayStore();
const shelfStore = usePhotoShelfStore();
const { photoShelf } = storeToRefs(shelfStore);
const { showPhotoShelf } = storeToRefs(displayStore);

const activeIndex = defineModel('activeIndex', {
  type: Number,
  required: true,
});
const selecteMode = defineModel('selecteMode', {
  type: Boolean,
  default: false,
});
</script>

<template>
  <van-popup
    v-model:show="showPhotoShelf"
    position="bottom"
    class="overflow-hidden sticky left-0 top-0 right-0 bottom-0 w-ull h-full flex flex-col"
    :overlay="false"
  >
    <div
      class="shrink-0 w-full flex justify-between items-center px-4 h-[46px] border-b"
    >
      <h2 class="text-lg font-semibold text-[--van-text-color]">图片收藏</h2>
      <van-icon
        name="arrow-down"
        size="24"
        @click="showPhotoShelf = false"
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
    <van-tabs
      shrink
      animated
      sticky
      :offset-top="90"
      :active="activeIndex"
      class="w-full h-full overflow-y-scroll"
    >
      <van-tab v-for="shelf in photoShelf" :key="shelf.id" :title="shelf.name">
        <ResponsiveGrid :base-cols="2" v-if="shelf.photos.length">
          <WinShelfPhotoCard
            v-for="photo in shelf.photos"
            :key="photo.id"
            v-model:selected="photo.extra.selected"
            :item="photo"
            :selecte-mode="selecteMode"
          />
        </ResponsiveGrid>
      </van-tab>
    </van-tabs>
  </van-popup>
  <AddPhotoShelfDialog />
  <removePhotoShelfDialog />
</template>

<style scoped lang="less">
:deep(.van-card__thumb) {
  width: 80px;
  height: 100px;
}
</style>
