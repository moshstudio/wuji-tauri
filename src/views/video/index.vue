<script setup lang="ts">
import type { VideoItem } from '@/extensions/video';
import type { VideoSource } from '@/types';
import PlatformSwitch from '@/components/PlatformSwitch.vue';
import { router } from '@/router';
import { useDisplayStore, useStore } from '@/store';
import { createCancellableFunction } from '@/utils/cancelableFunction';
import { debounce } from 'lodash';
import { storeToRefs } from 'pinia';
import { showLoadingToast } from 'vant';
import { onMounted, ref, triggerRef } from 'vue';
import MobileVideo from '../mobileView/video/index.vue';
import WinVideo from '../windowsView/video/index.vue';

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
const loadPage = debounce(
  createCancellableFunction(
    async (
      signal: AbortSignal,
      source: VideoSource,
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
        await store.videoRecommendList(source, pageNo, type);
      } else {
        await store.videoSearch(source, searchValue.value, pageNo);
      }
      toast.close();
    },
  ),
  500,
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
onMounted(() => {
  displayStore.addBackCallback('Video', async () => {
    if (displayStore.showVideoShelf) {
      displayStore.showVideoShelf = false;
    } else {
      await displayStore.checkExitApp();
    }
  });
});
</script>

<template>
  <PlatformSwitch>
    <template #mobile>
      <MobileVideo
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
      <WinVideo
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
