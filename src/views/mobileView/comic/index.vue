<script setup lang="ts">
import type { ComicItem } from '@/extensions/comic';
import type { ComicSource } from '@/types';
import type { ComponentPublicInstance } from 'vue';
import MobileHeader from '@/components/mobile/MobileHeader.vue';
import MobileComicsTab from '@/components/tabs/MobileComicsTab.vue';
import { useDisplayStore, useStore } from '@/store';
import { sleep } from '@/utils';
import ComicShelf from '@/views/comic/ComicShelf.vue';
import { storeToRefs } from 'pinia';
import { ref } from 'vue';

const emit = defineEmits<{
  (e: 'recommend', force?: boolean): void;
  (e: 'search'): void;
  (e: 'loadType', source: ComicSource, type?: string): void;
  (e: 'loadPage', source: ComicSource, pageNo?: number, type?: string): void;
  (e: 'toDetail', source: ComicSource, item: ComicItem): void;
  (e: 'openBaseUrl', source: ComicSource): void;
}>();

const searchValue = defineModel('searchValue', { type: String, default: '' });

const store = useStore();
const displayStore = useDisplayStore();
const { comicSources } = storeToRefs(store);

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
  <div class="relative w-full h-full">
    <MobileHeader
      v-model:search-value="searchValue"
      @search="search"
      @show-shelf="() => (displayStore.showComicShelf = true)"
    />
    <van-pull-refresh
      v-model="isRefreshing"
      v-remember-scroll
      class="comic-main-container main grow w-full h-full flex flex-col overflow-x-hidden overflow-y-auto"
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
            <MobileComicsTab
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
      <van-back-top bottom="60" right="10" target=".comic-main-container" />
    </van-pull-refresh>
    <ComicShelf />
  </div>
</template>

<style scoped lang="less">
:deep(.van-sticky--fixed) span {
  background-color: var(--van-background-2);
  opacity: 0.5;
}
</style>
