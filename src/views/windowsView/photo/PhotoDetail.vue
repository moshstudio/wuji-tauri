<script setup lang="ts">
import { PhotoDetail, PhotoItem } from '@/extensions/photo';
import { PropType } from 'vue';
import { usePhotoShelfStore } from '@/store';
import LoadImage from '@/components/LoadImage.vue';

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
      class="grow flex flex-col overflow-y-auto bg-[--van-background-3] select-none"
    >
      <div
        class="w-full text-center leading-none"
        v-for="(item, index) in photoDetail?.photos"
        :key="index"
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
      justify="center"
      v-if="photoDetail?.totalPage && photoDetail?.totalPage > 1"
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
      >
      </van-cell>
    </van-cell-group>
  </van-dialog>
</template>

<style scoped lang="less"></style>
