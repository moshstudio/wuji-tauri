<script setup lang="ts">
import type { BookItem } from '@/extensions/book';
import type { BookSource } from '@/types';
import PlatformSwitch from '@/components/PlatformSwitch.vue';
import { router } from '@/router';
import { useDisplayStore, useStore } from '@/store';
import { createCancellableFunction } from '@/utils/cancelableFunction';
import { debounce } from 'lodash';
import { storeToRefs } from 'pinia';
import { showLoadingToast } from 'vant';
import { ref, triggerRef } from 'vue';
import MobileBook from '../mobileView/book/index.vue';
import WinBook from '../windowsView/book/index.vue';

const store = useStore();
const displayStore = useDisplayStore();
const { bookSources } = storeToRefs(store);

const searchValue = ref('');

const recommend = createCancellableFunction(
  async (signal: AbortSignal, force: boolean = false) => {
    await Promise.all(
      bookSources.value.map(async (source) => {
        if (!source.list || force) {
          if (signal.aborted)
            return;
          await store.bookRecommendList(source);
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
    triggerRef(bookSources);
  }
  else {
    await Promise.all(
      bookSources.value.map(async (bookSources) => {
        if (signal.aborted)
          return;
        await store.bookSearch(bookSources, keyword, 1);
      }),
    );
  }
  displayStore.closeToast(t);
});
async function loadType(source: BookSource, type?: string) {
  await store.bookRecommendList(source, 1, type);
}
const loadPage = debounce(
  createCancellableFunction(
    async (
      signal: AbortSignal,
      source: BookSource,
      pageNo?: number,
      type?: string,
    ) => {
      const toast = showLoadingToast({
        message: '加载中',
        duration: 0,
        closeOnClick: true,
        closeOnClickOverlay: false,
      });
      if (!searchValue.value) {
        await store.bookRecommendList(source, pageNo, type);
      }
      else {
        await store.bookSearch(source, searchValue.value, pageNo);
      }
      toast.close();
    },
  ),
  500,
);
function toDetail(source: BookSource, item: BookItem) {
  router.push({
    name: 'BookDetail',
    params: {
      bookId: item.id,
      sourceId: source.item.id,
    },
  });
}

async function openBaseUrl(source: BookSource) {
  const sc = await store.sourceClass(source.item);
  if (sc && sc.baseUrl) {
    // open(sc.baseUrl);
  }
}
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
      />
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
      />
    </template>
  </PlatformSwitch>
</template>

<style scoped lang="less"></style>
