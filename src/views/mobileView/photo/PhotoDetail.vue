<script setup lang="ts">
import { PhotoDetail, PhotoItem } from '@/extensions/photo';
import { PropType } from 'vue';
import { usePhotoShelfStore } from '@/store';
import LoadImage from '@/components/LoadImage.vue';
import FullPagination from '@/components/pagination/FullPagination.vue';

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

const emit = defineEmits<{
  (e: 'back'): void;
  (e: 'loadData', pageNo?: number): void;
  (e: 'toPage', pageNo?: number): void;
  (e: 'collect'): void;
  (e: 'addPhotoToShelf', shelfId: string): void;
}>();
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
      ref="content"
      class="grow flex flex-col overflow-y-auto p-2 bg-[--van-background-3] select-none"
    >
      <van-skeleton :loading="!photoDetail">
        <template #template>
          <div class="flex justify-center items-center mt-2 w-full">
            <van-skeleton-image />
          </div>
        </template>
        <LoadImage
          v-for="(item, index) in photoDetail!.photos"
          :key="index"
          :src="item"
          :headers="photoDetail?.photosHeaders"
          fit="contain"
          lazy-load
          class="rounded-lg max-w-[100%] max-h-[100%]"
        />
      </van-skeleton>
    </main>
    <van-row
      justify="center"
      v-if="photoDetail?.totalPage && photoDetail?.totalPage > 1"
      class="w-full bg-[--van-background-2]"
    >
      <FullPagination
        v-model="currentPage"
        :page-count="Number(photoDetail.totalPage)"
        class="p-1"
        force-ellipses
        @change="(pageNo) => emit('toPage', pageNo)"
      >
      </FullPagination>
      <!-- <van-pagination
        v-model="currentPage"
        :page-count="Number(photoDetail.totalPage)"
        show-page-size="4"
        class="p-1"
        force-ellipses
        @change="(pageNo) => emit('toPage', pageNo)"
      >
        <template #prev-text>
          <van-icon name="arrow-left" />
        </template>
        <template #next-text>
          <van-icon name="arrow" />
        </template>
        <template #page="{ text }">{{ text }}</template>
      </van-pagination> -->
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
      >
      </van-cell>
    </van-cell-group>
  </van-dialog>
</template>

<style scoped lang="less"></style>
