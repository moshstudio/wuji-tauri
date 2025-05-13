<script setup lang="ts">
import type { PhotoSource } from '@/types';
import PlatformSwitch from '@/components/PlatformSwitch.vue';
import { useDisplayStore, useStore } from '@/store';
import { createCancellableFunction } from '@/utils/cancelableFunction';
import MobilePhotoList from '@/views/mobileView/photo/index.vue';
import WinPhotoList from '@/views/windowsView/photo/index.vue';
import { debounce } from 'lodash';
import { storeToRefs } from 'pinia';
import { showLoadingToast } from 'vant';
import { onMounted, ref } from 'vue';
import { router } from '@/router';

const store = useStore();
const displayStore = useDisplayStore();
const { photoSources } = storeToRefs(store);

const searchValue = ref('');

const recommend = createCancellableFunction(
  async (signal: AbortSignal, force: boolean = false) => {
    await Promise.all(
      photoSources.value.map(async (source) => {
        if (!source.list || force) {
          if (signal.aborted) return;
          await store.photoRecommendList(source);
        }
      }),
    );
  },
);

const search = createCancellableFunction(async (signal: AbortSignal) => {
  const keyword = searchValue.value;
  const t = displayStore.showToast();
  if (!keyword) {
    await recommend(true);
  } else {
    await Promise.all(
      photoSources.value.map(async (source) => {
        if (signal.aborted) return;
        await store.photoSearchList(source, keyword, 1);
      }),
    );
  }
  displayStore.closeToast(t);
});

const pageChange = debounce(
  createCancellableFunction(
    async (signal: AbortSignal, source: PhotoSource, pageNo: number) => {
      const toast = showLoadingToast({
        message: '加载中',
        duration: 0,
        closeOnClick: true,
        closeOnClickOverlay: false,
      });
      if (!searchValue.value) {
        await store.photoRecommendList(source, pageNo);
      } else {
        await store.photoSearchList(source, searchValue.value, pageNo);
      }
      toast.close();
    },
  ),
  500,
);
async function openBaseUrl(source: PhotoSource) {
  const sc = await store.sourceClass(source.item);
  if (sc && sc.baseUrl) {
    // open(sc.baseUrl);
  }
}
onMounted(() => {
  displayStore.addBackCallback('Photo', async () => {
    if (displayStore.showPhotoShelf) {
      displayStore.showPhotoShelf = false;
    } else {
      await displayStore.checkExitApp();
    }
  });
});
</script>

<template>
  <PlatformSwitch>
    <template #mobile>
      <MobilePhotoList
        v-model:search-value="searchValue"
        @search="search"
        @page-change="pageChange"
        @open-base-url="openBaseUrl"
        @recommend="recommend"
      />
    </template>
    <template #windows>
      <WinPhotoList
        v-model:search-value="searchValue"
        @search="search"
        @page-change="pageChange"
        @open-base-url="openBaseUrl"
        @recommend="recommend"
      />
    </template>
  </PlatformSwitch>
</template>

<style scoped lang="less"></style>
