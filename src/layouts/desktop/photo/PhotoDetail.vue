<script setup lang="ts">
import type { PhotoDetail, PhotoItem } from '@wuji-tauri/source-extension';
import { LoadImage } from '@wuji-tauri/components';
import { computed, ref, watch } from 'vue';
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
    onDownload?: () => void;
  }>(),
  { pageNo: 1 },
);
const showClickImageOptions = ref(false);
const clickedItem = ref<string>();

const showNavbarOptions = ref(false);
const navbarActions = computed(() => [
  {
    name: '收藏',
    callback: () => {
      if (props.photoItem) {
        props.toShelf(props.photoItem);
      }
    },
  },
  {
    name: '下载全集',
    callback: () => {
      props.onDownload?.();
    },
  },
]);

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
    <WNavbar :title="photoItem?.title || '图片详情'">
      <template #right>
        <van-icon name="ellipsis" size="20" @click="showNavbarOptions = true" />
      </template>
    </WNavbar>
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
          @click="
            () => {
              clickedItem = item;
              showClickImageOptions = true;
            }
          "
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
  <van-action-sheet
    v-model:show="showNavbarOptions"
    :actions="navbarActions"
    cancel-text="取消"
    teleport="body"
    @select="showNavbarOptions = false"
  />
  <van-action-sheet
    v-model:show="showClickImageOptions"
    :actions="[
      {
        name: '保存到本地',
        color: '#1989fa',
        callback: async () => {
          if (!clickedItem) return;
          showClickImageOptions = false;
          savePic(clickedItem, photoDetail?.photosHeaders || undefined);
        },
      },
    ]"
    cancel-text="取消"
    teleport="body"
  />
</template>

<style scoped lang="less"></style>
