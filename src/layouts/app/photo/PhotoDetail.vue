<script setup lang="ts">
import type { PhotoDetail, PhotoItem } from '@wuji-tauri/source-extension';
import { LoadImage, MoreOptionsSheet } from '@wuji-tauri/components/src';
import { computed, ref, watch } from 'vue';
import MNavBar from '@/components/header/MNavBar.vue';
import MPagination from '@/components/pagination/MPagination.vue';

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
const bubbleOffset = ref({
  x: document.querySelector('body')!.clientWidth - 130,
  y: document.querySelector('body')!.clientHeight - 100,
});
watch(bubbleOffset, (offset) => {
  const ch = document.querySelector('body')!.clientHeight;
  if (offset.y > ch - 90) {
    offset.y = ch - 90;
  }
});

const showClickImageOptions = ref(false);
const clickedItem = ref<string>();
watch(
  () => props.photoDetail?.photos,
  () => {
    document.querySelector('.photo-detail')?.scrollTo(0, 0);
  },
);
</script>

<template>
  <div class="relative flex h-full flex-col overflow-hidden">
    <MNavBar
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
      v-remember-scroll
      class="photo-detail flex grow select-none flex-col overflow-y-auto bg-[--van-background-3]"
    >
      <template v-if="photoItem && photoDetail">
        <div
          v-for="(item, index) in photoDetail?.photos"
          :key="index"
          class="w-full text-center leading-none"
        >
          <LoadImage
            :src="item"
            :headers="photoDetail?.photosHeaders"
            fit="contain"
            :compress="false"
            @click="
              () => {
                clickedItem = item;
                showClickImageOptions = true;
              }
            "
          />
        </div>
      </template>
      <div v-else class="flex flex-col items-center justify-center">
        <van-loading />
      </div>

      <van-floating-bubble
        v-if="photoDetail?.totalPage && photoDetail?.totalPage > 1"
        v-model:offset="bubbleOffset"
        axis="xy"
        magnetic="x"
        :gap="6"
        teleport=".photo-detail"
      >
        <MPagination
          :page-no="pageNo"
          :page-count="Number(photoDetail.totalPage)"
          :to-page="(pageNo) => toPage(pageNo)"
        />
      </van-floating-bubble>
    </main>
  </div>
  <MoreOptionsSheet
    v-model="showClickImageOptions"
    :actions="[
      {
        name: '保存图片',
        color: '#1989fa',
        callback: async () => {
          if (!clickedItem) return;
          showClickImageOptions = false;
          savePic(clickedItem, photoDetail?.photosHeaders || undefined);
        },
      },
    ]"
  />
</template>

<style scoped lang="less">
:deep(.van-floating-bubble) {
  height: 40px;
  width: 120px;
  border: none;
  border-radius: 4px;
  background-color: rgb(from var(--van-background) r g b / 50%);
}
:deep(.van-floating-bubble:active) {
  opacity: 1;
}
</style>
