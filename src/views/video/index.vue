<script setup lang="ts">
import type { VideoItem } from '@wuji-tauri/source-extension';
import type { VideoSource } from '@/types';
import { storeToRefs } from 'pinia';
import { ref, triggerRef } from 'vue';
import PlatformSwitch from '@/components/platform/PlatformSwitch.vue';
import AppVideoList from '@/layouts/app/video/VideoList.vue';
import DesktopVideoList from '@/layouts/desktop/video/VideoList.vue';
import { router } from '@/router';
import { useVideoShelfStore, useDisplayStore, useStore } from '@/store';
import { createCancellableFunction } from '@/utils/cancelableFunction';
import { VideoHistory } from '@/types/video';
import { showConfirmDialog, showToast } from 'vant';

const store = useStore();
const displayStore = useDisplayStore();
const videoShelfStore = useVideoShelfStore();
const { videoHistory } = storeToRefs(videoShelfStore);
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

async function hisrotyToVideo(video: VideoHistory) {
  const source = store.getVideoSource(video.video.sourceId);
  if (!source) {
    showToast('源不存在或未启用');
    return;
  }
  router.push({
    name: 'VideoDetail',
    params: {
      videoId: video.video.id,
      sourceId: video.video.sourceId,
    },
  });
}

function clearHistory() {
  showConfirmDialog({
    title: '提示',
    message: '确定要清空历史记录吗？',
    confirmButtonText: '确定',
    cancelButtonText: '取消',
  }).then((confirm) => {
    if (confirm) {
      videoShelfStore.clearVideoHistory();
    }
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
        :video-history="videoHistory"
        :recommend="recommend"
        :search="search"
        :to-page="toPage"
        :to-detail="toDetail"
        :history-to-video="hisrotyToVideo"
        :clear-history="clearHistory"
        :open-base-url="openBaseUrl"
      />
    </template>
    <template #desktop>
      <DesktopVideoList
        v-model:search-value="searchValue"
        :video-sources="videoSources"
        :video-history="videoHistory"
        :recommend="recommend"
        :search="search"
        :to-page="toPage"
        :to-detail="toDetail"
        :history-to-video="hisrotyToVideo"
        :clear-history="clearHistory"
        :open-base-url="openBaseUrl"
      />
    </template>
  </PlatformSwitch>
</template>

<style scoped lang="less"></style>
