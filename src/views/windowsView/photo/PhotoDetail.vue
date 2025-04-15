<script setup lang="ts">
import type { PhotoDetail, PhotoItem } from '@/extensions/photo';
import type { PropType } from 'vue';
import LoadImage from '@/components/LoadImage.vue';
import { usePhotoShelfStore } from '@/store';

const emit = defineEmits<{
  (e: 'back'): void;
  (e: 'loadData', pageNo?: number): void;
  (e: 'toPage', pageNo?: number): void;
  (e: 'collect'): void;
  (e: 'addPhotoToShelf', shelfId: string): void;
}>();

const shelfStore = usePhotoShelfStore();

const photoItem = defineModel('photoItem', {
  type: Object as PropType<PhotoItem>,
});
const photoDetail = defineModel('photoDetail', {
  type: Object as PropType<PhotoDetail>,
});
const currentPage = defineModel('currentPage', { type: Number, default: 1 });
const content = defineModel('content', { type: HTMLElement });
const showAddDialog = defineModel('showAddDialog', {
  type: Boolean,
  default: false,
});
</script>

<template>
  <div class="relative h-full flex flex-col">
    <van-nav-bar
      :title="photoItem?.title || '图片详情'"
      right-text="收藏"
      left-arrow
      @click-left="() => emit('back')"
      @click-right="() => emit('collect')"
    />
    <main
      v-remember-scroll
      ref="content"
      class="grow flex flex-col overflow-y-auto bg-[--van-background-3] select-none"
    >
      <div
        v-for="(item, index) in photoDetail?.photos"
        :key="index"
        class="w-full text-center leading-none"
      >
        <LoadImage
          :src="item"
          :headers="photoDetail?.photosHeaders"
          fit="contain"
          lazy-load
        />
      </div>
    </main>
    <van-row
      v-if="photoDetail?.totalPage && photoDetail?.totalPage > 1"
      justify="center"
      class="w-full bg-[--van-background-2]"
    >
      <van-pagination
        v-model="currentPage"
        :page-count="Number(photoDetail.totalPage)"
        class="p-1"
        :show-page-size="8"
        @change="(pageNo) => emit('toPage', pageNo)"
      />
    </van-row>
  </div>
  <van-dialog
    v-model:show="showAddDialog"
    title="选择收藏夹"
    :show-confirm-button="false"
    teleport="body"
    show-cancel-button
  >
    <van-cell-group>
      <van-cell
        v-for="item in shelfStore.photoShelf"
        :key="item.id"
        :title="item.name"
        center
        clickable
        @click="() => emit('addPhotoToShelf', item.id)"
      />
    </van-cell-group>
  </van-dialog>
</template>

<style scoped lang="less"></style>
