<script setup lang="ts">
import type { VideoItem } from '@wuji-tauri/source-extension';
import type { VideoSource } from '@/types';
import type { VideoHistory } from '@/types/video';
import { LiquidGlassContainer } from '@tinymomentum/liquid-glass-vue';
import { MVideoCard } from '@wuji-tauri/components';
import { storeToRefs } from 'pinia';
import { ref } from 'vue';
import ResponsiveGrid2 from '@/components/grid/ResponsiveGrid2.vue';
import MHeader from '@/components/header/MHeader.vue';
import MVideoTab from '@/components/tab/MVideoTab.vue';
import { router } from '@/router';
import { useDisplayStore } from '@/store';
import { sleep } from '@/utils';

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
    <MHeader
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
            <MVideoCard
              v-for="(video, videoHistoryIndex) in videoHistory"
              :key="`${video.video.sourceId}_${video.video.id}_${videoHistoryIndex}`"
              :video="video.video"
              :click="() => historyToVideo(video)"
            />
          </ResponsiveGrid2>
        </van-collapse-item>
        <div
          v-for="(item, sourceIndex) in videoSources"
          :key="`${item.item.id}_${sourceIndex}`"
        >
          <van-collapse-item
            v-show="
              item.list && !(!Array.isArray(item.list) && !item.list?.list)
            "
            :name="sourceIndex + item.item.id"
            :title="item.item.name"
          >
            <MVideoTab :source="item" :to-page="toPage" :to-detail="toDetail" />
          </van-collapse-item>
        </div>
      </van-collapse>
      <van-back-top bottom="60" right="10">
        <LiquidGlassContainer
          :width="40"
          :height="40"
          :border-radius="20"
          glass-tint-color="#000000"
          :glass-tint-opacity="20"
          :frost-blur-radius="1"
        >
          <van-icon name="arrow-up" />
        </LiquidGlassContainer>
      </van-back-top>
    </van-pull-refresh>
  </div>
</template>

<style scoped lang="less">
:deep(.van-sticky--fixed) span {
  background-color: var(--van-background-2);
  opacity: 0.5;
}
</style>
