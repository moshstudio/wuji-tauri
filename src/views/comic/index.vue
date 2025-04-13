<script setup lang="ts">
import type { ComicItem } from '@/extensions/comic';
import type { ComicSource } from '@/types';
import PlatformSwitch from '@/components/PlatformSwitch.vue';
import { router } from '@/router';
import { useDisplayStore, useStore } from '@/store';
import { createCancellableFunction } from '@/utils/cancelableFunction';
import { debounce } from 'lodash';
import { storeToRefs } from 'pinia';
import { showLoadingToast } from 'vant';
import { ref, triggerRef } from 'vue';
import MobileComic from '../mobileView/comic/index.vue';
import WinComic from '../windowsView/comic/index.vue';

const store = useStore();
const displayStore = useDisplayStore();
const { comicSources } = storeToRefs(store);

const searchValue = ref('');

const recommend = createCancellableFunction(
  async (signal: AbortSignal, force: boolean = false) => {
    await Promise.all(
      comicSources.value.map(async (source) => {
        if (!source.list || force) {
          if (signal.aborted)
            return;
          await store.comicRecommendList(source);
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
    triggerRef(comicSources);
  }
  else {
    await Promise.all(
      comicSources.value.map(async (comicSources) => {
        if (signal.aborted)
          return;
        await store.comicSearch(comicSources, keyword, 1);
      }),
    );
  }
  displayStore.closeToast(t);
});
async function loadType(source: ComicSource, type?: string) {
  await store.comicRecommendList(source, 1, type);
}
const loadPage = debounce(
  createCancellableFunction(
    async (
      signal: AbortSignal,
      source: ComicSource,
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
        await store.comicRecommendList(source, pageNo, type);
      }
      else {
        await store.comicSearch(source, searchValue.value, pageNo);
      }
      toast.close();
    },
  ),
  500,
);
function toDetail(source: ComicSource, item: ComicItem) {
  router.push({
    name: 'ComicDetail',
    params: {
      comicId: item.id,
      sourceId: source.item.id,
    },
  });
}

async function openBaseUrl(source: ComicSource) {
  const sc = await store.sourceClass(source.item);
  if (sc && sc.baseUrl) {
    // open(sc.baseUrl);
  }
}
</script>

<template>
  <PlatformSwitch>
    <template #mobile>
      <MobileComic
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
      <WinComic
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
