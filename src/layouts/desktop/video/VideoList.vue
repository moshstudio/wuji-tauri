<script setup lang="ts">
import type { VideoSource } from '@/types';
import WHeader from '@/components/header/WHeader.vue';
import WVideoTab from '@/components/tab/WVideoTab.vue';
import { useDisplayStore } from '@/store';
import { sleep } from '@/utils';
import { ref } from 'vue';
import { router } from '@/router';
import { VideoItem } from '@wuji-tauri/source-extension';

const searchValue = defineModel<string>('searchValue', { required: true });

const props = defineProps<{
  videoSources: VideoSource[];
  recommend: (force?: boolean) => void;
  search: (keyword: string) => void;
  toPage: (source: VideoSource, pageNo?: number, type?: string) => void;
  toDetail: (source: VideoSource, item: VideoItem) => void;
  openBaseUrl: (item: VideoSource) => void;
}>();

const displayStore = useDisplayStore();

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
