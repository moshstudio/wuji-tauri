<script setup lang="ts">
import type { PhotoDetail, PhotoItem } from '@wuji-tauri/source-extension';
import { LoadImage } from '@wuji-tauri/components/src';
import { computed, watch } from 'vue';
import WNavbar from '@/components/header/WNavbar.vue';

const props = withDefaults(
  defineProps<{
    photoItem?: PhotoItem;
    photoDetail?: PhotoDetail;
    pageNo?: number;
    back: () => void;
    toPage: (pageNo?: number) => void;
    toShelf: (item: PhotoItem) => void;
    savePic: (url: string, headers?: Record<string, string>) => void;
  }>(),
  { pageNo: 1 },
);
const pageNo = computed({
  get() {
    return props.pageNo;
  },
  set(value) {
    props.toPage(value);
  },
});
watch(
  () => props.photoDetail?.photos,
  () => {
    document.querySelector('.photo-detail')?.scrollTo(0, 0);
  },
);
</script>

<template>
  <div class="relative flex h-full flex-col overflow-hidden">
    <WNavbar
      :title="photoItem?.title || '图片详情'"
      right-text="收藏"
      :click-right="
        () => {
          if (photoItem) {
            toShelf(photoItem);
          }
        }
      "
    />
    <main
      v-if="photoItem && photoDetail"
      v-remember-scroll
      class="photo-detail flex grow select-none flex-col overflow-y-auto bg-[--van-background-3]"
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
          :lazy-load="true"
          :compress="false"
        />
      </div>
    </main>
    <main v-else class="flex flex-col items-center justify-center">
      <van-loading />
    </main>
    <van-row
      v-if="photoDetail?.totalPage && photoDetail?.totalPage > 1"
      justify="center"
      class="w-full bg-[--van-background-2]"
    >
      <van-pagination
        v-model="pageNo"
        :page-count="Number(photoDetail.totalPage)"
        class="p-1"
        :show-page-size="8"
      />
    </van-row>
  </div>
</template>

<style scoped lang="less"></style>
