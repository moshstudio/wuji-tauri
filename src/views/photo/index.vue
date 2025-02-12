<script setup lang="ts">
import { storeToRefs } from 'pinia';
import WinPhotoList from '@/views/windowsView/photo/index.vue';
import MobilePhotoList from '@/views/mobileView/photo/index.vue';
import PlatformSwitch from '@/components/PlatformSwitch.vue';
import { ref, onMounted } from 'vue';
import { useDisplayStore, useStore } from '@/store';
import { PhotoSource } from '@/types';
import { showLoadingToast } from 'vant';
import { debounce } from 'lodash';
import { createCancellableFunction } from '@/utils/cancelableFunction';

const store = useStore();
const displayStore = useDisplayStore();
const { photoSources } = storeToRefs(store);

const searchValue = ref('');

const recommend = createCancellableFunction(async (force: boolean = false) => {
  await Promise.all(
    photoSources.value.map(async (source) => {
      if (!source.list || force) {
        await store.photoRecommendList(source);
      }
    })
  );
});

const search = createCancellableFunction(async () => {
  const keyword = searchValue.value;
  const t = displayStore.showToast();
  if (!keyword) {
    await recommend(true);
  } else {
    await Promise.all(
      photoSources.value.map(async (source) => {
        await store.photoSearchList(source, keyword, 1);
      })
    );
  }
  displayStore.closeToast(t);
});

const pageChange = debounce(
  createCancellableFunction(async (source: PhotoSource, pageNo: number) => {
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
  }),
  500
);
const openBaseUrl = async (source: PhotoSource) => {
  const sc = await store.sourceClass(source.item);
  if (sc && sc.baseUrl) {
    // open(sc.baseUrl);
  }
};
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
      ></MobilePhotoList>
    </template>
    <template #windows>
      <WinPhotoList
        v-model:search-value="searchValue"
        @search="search"
        @page-change="pageChange"
        @open-base-url="openBaseUrl"
        @recommend="recommend"
      ></WinPhotoList>
    </template>
  </PlatformSwitch>
</template>

<style scoped lang="less"></style>
