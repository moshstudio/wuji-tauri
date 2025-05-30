<script setup lang="ts">
import type { VideoItem } from '@/extensions/video';
import type { VideoSource } from '@/types';
import type { ComponentPublicInstance } from 'vue';
import MobileHeader from '@/components/mobile/MobileHeader.vue';
import MobileVideosTab from '@/components/tabs/MobileVideosTab.vue';
import { useDisplayStore, useStore } from '@/store';
import { sleep } from '@/utils';
import VideoShelf from '@/views/video/VideoShelf.vue';
import { storeToRefs } from 'pinia';
import { ref } from 'vue';

const emit = defineEmits<{
  (e: 'recommend', force?: boolean): void;
  (e: 'search'): void;
  (e: 'loadType', source: VideoSource, type?: string): void;
  (e: 'loadPage', source: VideoSource, pageNo?: number, type?: string): void;
  (e: 'toDetail', source: VideoSource, item: VideoItem): void;
  (e: 'openBaseUrl', source: VideoSource): void;
}>();

const searchValue = defineModel('searchValue', { type: String, default: '' });

const store = useStore();
const displayStore = useDisplayStore();
const { videoSources } = storeToRefs(store);

const isRefreshing = ref(false);
async function onRefresh() {
  isRefreshing.value = true;
  emit('search');
  await sleep(1000);
  isRefreshing.value = false;
}
function search() {
  emit('search');
}
</script>

<template>
  <div class="relative w-full h-full flex flex-col">
    <MobileHeader
      v-model:search-value="searchValue"
      @search="search"
      @show-shelf="() => (displayStore.showVideoShelf = true)"
    />
    <van-pull-refresh
      v-model="isRefreshing"
      v-remember-scroll
      class="video-main-container main grow w-full h-full flex flex-col overflow-x-hidden overflow-y-auto"
      @refresh="onRefresh"
    >
      <van-collapse v-model="displayStore.videoCollapse">
        <div v-for="(item, index) in videoSources" :key="item.item.id">
          <van-collapse-item
            v-show="
              item.list && !(!Array.isArray(item.list) && !item.list?.list)
            "
            :name="item.item.name"
            :title="item.item.name"
          >
            <MobileVideosTab
              :source="item"
              @on-load="(source, type) => emit('loadType', source, type)"
              @load-page="
                (source, pageNo, type) => emit('loadPage', source, pageNo, type)
              "
              @on-detail="(source, item) => emit('toDetail', source, item)"
            />
          </van-collapse-item>
        </div>
      </van-collapse>
      <van-back-top bottom="60" right="10" />
    </van-pull-refresh>
    <VideoShelf />
  </div>
</template>

<style scoped lang="less">
:deep(.van-sticky--fixed) span {
  background-color: var(--van-background-2);
  opacity: 0.5;
}
</style>
