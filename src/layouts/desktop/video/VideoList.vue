<script setup lang="ts">
import type { VideoItem } from '@wuji-tauri/source-extension';
import type { VideoSource } from '@/types';
import { ref } from 'vue';
import WHeader from '@/components/header/WHeader.vue';
import WVideoTab from '@/components/tab/WVideoTab.vue';
import ResponsiveGrid2 from '@/components/grid/ResponsiveGrid2.vue';
import { WVideoCard } from '@wuji-tauri/components/src';
import { router } from '@/router';
import { useDisplayStore } from '@/store';
import { sleep } from '@/utils';
import { VideoHistory } from '@/types/video';
import { storeToRefs } from 'pinia';

const props = defineProps<{
  videoSources: VideoSource[];
  videoHistory: VideoHistory[];
  recommend: (force?: boolean) => void;
  search: (keyword: string) => void;
  toPage: (source: VideoSource, pageNo?: number, type?: string) => void;
  toDetail: (source: VideoSource, item: VideoItem) => void;
  historyToVideo: (video: VideoHistory) => void;
  clearHistory: () => void;
  openBaseUrl: (item: VideoSource) => void;
}>();

const searchValue = defineModel<string>('searchValue', { required: true });

const displayStore = useDisplayStore();
const { showViewHistory } = storeToRefs(displayStore);

const isRefreshing = ref(false);
async function onRefresh() {
  isRefreshing.value = true;
  props.search(searchValue.value);
  await sleep(1000);
  isRefreshing.value = false;
}
</script>

<template>
  <div class="relative flex h-full w-full flex-col">
    <WHeader
      v-model:value="searchValue"
      @search="() => props.search(searchValue)"
      @show-shelf="
        () => {
          router.push({ name: 'VideoShelf' });
        }
      "
    />
    <van-pull-refresh
      v-model="isRefreshing"
      v-remember-scroll
      :head-height="100"
      class="video-main-container main flex h-full w-full grow flex-col overflow-y-auto overflow-x-hidden"
      @refresh="onRefresh"
    >
      <van-collapse v-model="displayStore.videoCollapse">
        <van-collapse-item
          v-show="showViewHistory && videoHistory.length"
          name="历史记录"
          title="历史记录"
        >
          <div
            class="van-haptics-feedback px-4 text-xs text-gray-500"
            @click="clearHistory"
          >
            清空
          </div>
          <ResponsiveGrid2 min-width="80" max-width="100">
            <WVideoCard
              v-for="video in videoHistory"
              :video="video.video"
              :click="() => historyToVideo(video)"
            />
          </ResponsiveGrid2>
        </van-collapse-item>
        <div v-for="(item, index) in videoSources" :key="item.item.id">
          <van-collapse-item
            v-show="
              item.list && !(!Array.isArray(item.list) && !item.list?.list)
            "
            :name="item.item.name"
            :title="item.item.name"
          >
            <WVideoTab :source="item" :to-page="toPage" :to-detail="toDetail" />
          </van-collapse-item>
        </div>
      </van-collapse>
      <van-back-top bottom="60" right="10" />
    </van-pull-refresh>
  </div>
</template>

<style scoped lang="less">
:deep(.van-sticky--fixed) span {
  background-color: var(--van-background-2);
  opacity: 0.5;
}
</style>
