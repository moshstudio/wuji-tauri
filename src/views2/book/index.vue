<script setup lang="ts">
import type { BookItem } from '@wuji-tauri/source-extension';
import type { BookSource } from '@/types';
import PlatformSwitch from '@/components2/platform/PlatformSwitch.vue';
import { router } from '@/router';
import { useDisplayStore, useStore } from '@/store';
import { createCancellableFunction } from '@/utils/cancelableFunction';
import { storeToRefs } from 'pinia';
import { ref, triggerRef } from 'vue';
import AppBookList from '@/layouts/app/book/BookList.vue';
import DesktopBookList from '@/layouts/desktop/book/BookList.vue';

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
  } else {
    await Promise.all(
      bookSources.value.map(async (bookSources) => {
        if (signal.aborted) return;
        await store.bookSearch(bookSources, keyword, 1);
      }),
    );
  }
  displayStore.closeToast(t);
});

const toPage = createCancellableFunction(
  async (
    signal: AbortSignal,
    source: BookSource,
    pageNo?: number,
    type?: string,
  ) => {
    if (!searchValue.value) {
      await store.bookRecommendList(source, pageNo, type);
    } else {
      await store.bookSearch(source, searchValue.value, pageNo);
    }
  },
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
    <template #app>
      <AppBookList
        v-model:search-value="searchValue"
        :book-sources="bookSources"
        :recommend="recommend"
        :search="search"
        :to-page="toPage"
        :to-detail="toDetail"
        :open-base-url="openBaseUrl"
      />
    </template>
    <template #desktop>
      <DesktopBookList
        v-model:search-value="searchValue"
        :book-sources="bookSources"
        :recommend="recommend"
        :search="search"
        :to-page="toPage"
        :to-detail="toDetail"
        :open-base-url="openBaseUrl"
      />
    </template>
  </PlatformSwitch>
</template>

<style scoped lang="less"></style>
