<script setup lang="ts">
import type { ComicItem } from '@wuji-tauri/source-extension';
import type { ComicSource } from '@/types';
import { storeToRefs } from 'pinia';
import { ref, triggerRef } from 'vue';
import PlatformSwitch from '@/components/platform/PlatformSwitch.vue';
import AppComicList from '@/layouts/app/comic/ComicList.vue';
import DesktopComicList from '@/layouts/desktop/comic/ComicList.vue';
import { router } from '@/router';
import { useDisplayStore, useStore } from '@/store';
import { createCancellableFunction } from '@/utils/cancelableFunction';

const store = useStore();
const displayStore = useDisplayStore();
const { comicSources } = storeToRefs(store);

const searchValue = ref('');

const recommend = createCancellableFunction(
  async (signal: AbortSignal, force: boolean = false) => {
    await Promise.all(
      comicSources.value.map(async (source) => {
        if (!source.list || force) {
          if (signal.aborted) return;
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
  } else {
    await Promise.all(
      comicSources.value.map(async (comicSources) => {
        if (signal.aborted) return;
        await store.comicSearch(comicSources, keyword, 1);
      }),
    );
  }
  displayStore.closeToast(t);
});

const toPage = createCancellableFunction(
  async (
    signal: AbortSignal,
    source: ComicSource,
    pageNo?: number,
    type?: string,
  ) => {
    if (!searchValue.value) {
      await store.comicRecommendList(source, pageNo, type);
    } else {
      await store.comicSearch(source, searchValue.value, pageNo);
    }
  },
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
    <template #app>
      <AppComicList
        v-model:search-value="searchValue"
        :comic-sources="comicSources"
        :recommend="recommend"
        :search="search"
        :to-page="toPage"
        :to-detail="toDetail"
        :open-base-url="openBaseUrl"
      />
    </template>
    <template #desktop>
      <DesktopComicList
        v-model:search-value="searchValue"
        :comic-sources="comicSources"
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
