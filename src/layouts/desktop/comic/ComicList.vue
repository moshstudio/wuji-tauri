<script setup lang="ts">
import type { ComicItem } from '@wuji-tauri/source-extension';
import type { ComicSource } from '@/types';
import { ref } from 'vue';
import WHeader from '@/components/header/WHeader.vue';
import WComicTab from '@/components/tab/WComicTab.vue';
import ResponsiveGrid2 from '@/components/grid/ResponsiveGrid2.vue';
import { WComicCard } from '@wuji-tauri/components/src';
import { router } from '@/router';
import { useDisplayStore } from '@/store';
import { sleep } from '@/utils';
import { ComicHistory } from '@/types/comic';
import { storeToRefs } from 'pinia';

const props = defineProps<{
  comicSources: ComicSource[];
  comicHistory: ComicHistory[];
  recommend: (force?: boolean) => void;
  search: (keyword: string) => void;
  toPage: (source: ComicSource, pageNo?: number, type?: string) => void;
  toDetail: (source: ComicSource, item: ComicItem) => void;
  historyToComic: (comic: ComicHistory) => void;
  clearHistory: () => void;
  openBaseUrl: (item: ComicSource) => void;
}>();

const searchValue = defineModel('searchValue', { type: String, default: '' });

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
      @search="() => search(searchValue)"
      @show-shelf="
        () => {
          router.push({ name: 'ComicShelf' });
        }
      "
    />
    <van-pull-refresh
      v-model="isRefreshing"
      v-remember-scroll
      :head-height="100"
      class="main grow overflow-y-auto overflow-x-hidden"
      @refresh="onRefresh"
    >
      <van-collapse v-model="displayStore.comicCollapse">
        <van-collapse-item
          v-show="showViewHistory && comicHistory.length"
          name="历史记录"
          title="历史记录"
        >
          <div
            class="van-haptics-feedback px-4 text-xs text-gray-500"
            @click="clearHistory"
          >
            清空
          </div>
          <ResponsiveGrid2>
            <WComicCard
              v-for="comic in comicHistory"
              :comic="comic.comic"
              :click="() => historyToComic(comic)"
            />
          </ResponsiveGrid2>
        </van-collapse-item>
        <div v-for="(item, index) in comicSources" :key="item.item.id">
          <van-collapse-item
            v-show="
              item.list && !(!Array.isArray(item.list) && !item.list?.list)
            "
            :name="item.item.name"
            :title="item.item.name"
          >
            <WComicTab :source="item" :to-page="toPage" :to-detail="toDetail" />
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
