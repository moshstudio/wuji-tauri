<script setup lang="ts">
import { storeToRefs } from 'pinia';
import WinBook from '../windowsView/book/index.vue';
import MobileBook from '../mobileView/book/index.vue';
import PlatformSwitch from '@/components/PlatformSwitch.vue';
import { ref, triggerRef, watch } from 'vue';
import { useDisplayStore, useStore } from '@/store';
import { BookSource } from '@/types';
import { debounce } from 'lodash';
import { createCancellableFunction } from '@/utils/cancelableFunction';
import { router } from '@/router';
import { BookItem } from '@/extensions/book';
import { showLoadingToast } from 'vant';

const store = useStore();
const displayStore = useDisplayStore();
const { bookSources } = storeToRefs(store);

const searchValue = ref('');

const recommend = createCancellableFunction(
  async (signal: AbortSignal, force: boolean = false) => {
    await Promise.all(
      bookSources.value.map(async (source) => {
        if (!source.list || force) {
          if (signal.aborted) return;
          await store.bookRecommendList(source);
        }
      })
    );
  }
);

const search = createCancellableFunction(async (signal: AbortSignal) => {
  const keyword = searchValue.value;
  const t = displayStore.showToast();
  if (!keyword) {
    await recommend(true);
    triggerRef(bookSources);
  } else {
    await Promise.all(
      bookSources.value.map(async (bookSources) => {
        if (signal.aborted) return;
        await store.bookSearch(bookSources, keyword, 1);
      })
    );
  }
  displayStore.closeToast(t);
});
const loadType = async (source: BookSource, type?: string) => {
  await store.bookRecommendList(source, 1, type);
};
const loadPage = debounce(
  createCancellableFunction(
    async (
      signal: AbortSignal,
      source: BookSource,
      pageNo?: number,
      type?: string
    ) => {
      const toast = showLoadingToast({
        message: '加载中',
        duration: 0,
        closeOnClick: true,
        closeOnClickOverlay: false,
      });
      if (!searchValue.value) {
        await store.bookRecommendList(source, pageNo, type);
      } else {
        await store.bookSearch(source, searchValue.value, pageNo);
      }
      toast.close();
    }
  ),
  500
);
const toDetail = (source: BookSource, item: BookItem) => {
  router.push({
    name: 'BookDetail',
    params: {
      bookId: item.id,
      sourceId: source.item.id,
    },
  });
};

const openBaseUrl = async (source: BookSource) => {
  const sc = await store.sourceClass(source.item);
  if (sc && sc.baseUrl) {
    // open(sc.baseUrl);
  }
};
</script>

<template>
  <PlatformSwitch>
    <template #mobile>
      <MobileBook
        v-model:search-value="searchValue"
        @search="search"
        @load-type="loadType"
        @load-page="loadPage"
        @to-detail="toDetail"
        @open-base-url="openBaseUrl"
        @recommend="recommend"
      ></MobileBook>
    </template>
    <template #windows>
      <WinBook
        v-model:search-value="searchValue"
        @search="search"
        @load-type="loadType"
        @load-page="loadPage"
        @to-detail="toDetail"
        @open-base-url="openBaseUrl"
        @recommend="recommend"
      ></WinBook>
    </template>
  </PlatformSwitch>
</template>

<style scoped lang="less"></style>
