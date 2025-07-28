<script setup lang="ts">
import type { ComicItem } from '@wuji-tauri/source-extension';
import type { ComicSource } from '@/types';
import MHeader from '@/components2/header/MHeader.vue';
import MComicTab from '@/components2/tab/MComicTab.vue';
import { useDisplayStore } from '@/store';
import { sleep } from '@/utils';
import { ref } from 'vue';
import { router } from '@/router';

const searchValue = defineModel('searchValue', { type: String, default: '' });

const props = defineProps<{
  comicSources: ComicSource[];
  recommend: (force?: boolean) => void;
  search: (keyword: string) => void;
  toPage: (source: ComicSource, pageNo?: number, type?: string) => void;
  toDetail: (source: ComicSource, item: ComicItem) => void;
  openBaseUrl: (item: ComicSource) => void;
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
    <MHeader
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
        <div v-for="(item, index) in comicSources" :key="item.item.id">
          <van-collapse-item
            v-show="
              item.list && !(!Array.isArray(item.list) && !item.list?.list)
            "
            :name="item.item.name"
            :title="item.item.name"
          >
            <MComicTab :source="item" :to-page="toPage" :to-detail="toDetail" />
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
