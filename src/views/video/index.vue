<script setup lang="ts">
import { storeToRefs } from 'pinia';
import WinVideo from '../windowsView/video/index.vue';
import MobileVideo from '../mobileView/video/index.vue';
import PlatformSwitch from '@/components/PlatformSwitch.vue';
import { ref, toRaw, triggerRef } from 'vue';
import { useDisplayStore, useStore } from '@/store';
import { VideoSource } from '@/types';
import _, { debounce } from 'lodash';
import { createCancellableFunction } from '@/utils/cancelableFunction';
import { router } from '@/router';
import { showLoadingToast } from 'vant';
import { VideoItem } from '@/extensions/video';

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
      })
    );
  }
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
      })
    );
  }
  triggerRef(videoSources);
  displayStore.closeToast(t);
});
const loadType = async (source: VideoSource, type?: string) => {
  await store.videoRecommendList(source, 1, type);
};
const loadPage = debounce(
  createCancellableFunction(
    async (
      signal: AbortSignal,
      source: VideoSource,
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
        await store.videoRecommendList(source, pageNo, type);
      } else {
        await store.videoSearch(source, searchValue.value, pageNo);
      }
      toast.close();
    }
  ),
  500
);
const toDetail = (source: VideoSource, item: VideoItem) => {
  router.push({
    name: 'VideoDetail',
    params: {
      videoId: item.id,
      sourceId: source.item.id,
    },
  });
};

const openBaseUrl = async (source: VideoSource) => {
  const sc = await store.sourceClass(source.item);
  if (sc && sc.baseUrl) {
    // open(sc.baseUrl);
  }
};
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
      ></MobileVideo>
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
      ></WinVideo>
    </template>
  </PlatformSwitch>
</template>

<style scoped lang="less"></style>
