<script setup lang="ts">
import type { VideoItem } from '@wuji-tauri/source-extension';
import type { VideoSource } from '@/types';
import PlatformSwitch from '@/components2/platform/PlatformSwitch.vue';
import { router } from '@/router';
import { useDisplayStore, useStore } from '@/store';
import { createCancellableFunction } from '@/utils/cancelableFunction';
import { storeToRefs } from 'pinia';
import { ref, triggerRef } from 'vue';
import AppVideoList from '@/layouts/app/video/VideoList.vue';
import DesktopVideoList from '@/layouts/desktop/video/VideoList.vue';

const store = useStore();
const displayStore = useDisplayStore();
const { videoSources } = storeToRefs(store);

const searchValue = ref('');

const recommend = createCancellableFunction(
  async (signal: AbortSignal, force: boolean = false) => {
    await Promise.all(
      videoSources.value.map(async (source) => {
        if (!source.list || force) {
          if (signal.aborted) return;
          await store.videoRecommendList(source);
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
      videoSources.value.map(async (source) => {
        if (signal.aborted) return;
        await store.videoSearch(source, keyword, 1);
      }),
    );
  }
  triggerRef(videoSources);
  displayStore.closeToast(t);
});
async function loadType(source: VideoSource, type?: string) {
  await store.videoRecommendList(source, 1, type);
}
const toPage = createCancellableFunction(
  async (
    signal: AbortSignal,
    source: VideoSource,
    pageNo?: number,
    type?: string,
  ) => {
    if (!searchValue.value) {
      await store.videoRecommendList(source, pageNo, type);
    } else {
      await store.videoSearch(source, searchValue.value, pageNo);
    }
  },
);
function toDetail(source: VideoSource, item: VideoItem) {
  router.push({
    name: 'VideoDetail',
    params: {
      videoId: item.id,
      sourceId: source.item.id,
    },
  });
}

async function openBaseUrl(source: VideoSource) {
  const sc = await store.sourceClass(source.item);
  if (sc && sc.baseUrl) {
    // open(sc.baseUrl);
  }
}
</script>

<template>
  <PlatformSwitch>
    <template #app>
      <AppVideoList
        v-model:search-value="searchValue"
        :video-sources="videoSources"
        :recommend="recommend"
        :search="search"
        :to-page="toPage"
        :to-detail="toDetail"
        :open-base-url="openBaseUrl"
      />
    </template>
    <template #desktop>
      <DesktopVideoList
        v-model:search-value="searchValue"
        :video-sources="videoSources"
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
