<script setup lang="ts">
import _ from 'lodash';
import { useDisplayStore, useStore } from '@/store';
import { storeToRefs } from 'pinia';
import ComicShelf from '@/views/comic/ComicShelf.vue';
import MobileHeader from '@/components/mobile/MobileHeader.vue';
import MobileComicsTab from '@/components/tabs/MobileComicsTab.vue';
import { ComicSource } from '@/types';
import { ComicItem } from '@/extensions/comic';
import { ComponentPublicInstance, ref } from 'vue';
import { sleep } from '@/utils';

const searchValue = defineModel('searchValue', { type: String, default: '' });

const emit = defineEmits<{
  (e: 'recommend', force?: boolean): void;
  (e: 'search'): void;
  (e: 'loadType', source: ComicSource, type?: string): void;
  (e: 'loadPage', source: ComicSource, pageNo?: number, type?: string): void;
  (e: 'toDetail', source: ComicSource, item: ComicItem): void;
  (e: 'openBaseUrl', source: ComicSource): void;
}>();

const store = useStore();
const displayStore = useDisplayStore();
const { comicSources } = storeToRefs(store);

const isRefreshing = ref(false);
const onRefresh = async () => {
  isRefreshing.value = true;
  emit('search');
  await sleep(1000);
  isRefreshing.value = false;
};
const search = (value: string) => {
  searchValue.value = value;
  emit('search');
};

const containers = ref<Array<HTMLElement | undefined>>(
  new Array(2000).fill(undefined)
);
const setContainerRef = (
  el: Element | ComponentPublicInstance | null,
  index: number
) => {
  if (el) {
    containers.value[index] = el as HTMLElement;
  }
};
</script>

<template>
  <div class="w-full h-full flex flex-col">
    <MobileHeader
      v-model:search-value="searchValue"
      @search="search"
      @show-shelf="() => (displayStore.showComicShelf = true)"
    ></MobileHeader>
    <van-pull-refresh
      v-remember-scroll
      v-model="isRefreshing"
      @refresh="onRefresh"
      class="main grow overflow-x-hidden overflow-y-auto"
    >
      <van-collapse v-model="displayStore.comicCollapse">
        <div
          v-for="(item, index) in comicSources"
          :key="item.item.id"
          :ref="(el) => setContainerRef(el, index)"
        >
          <van-collapse-item
            :name="item.item.name"
            v-if="item.list && !(!Array.isArray(item.list) && !item.list?.list)"
          >
            <template #title>
              <van-sticky offset-top="50" :container="containers[index]">
                <span class="rounded-br-lg px-2 py-1">
                  {{ item.item.name }}
                </span>
              </van-sticky>
            </template>
            <MobileComicsTab
              :source="item"
              @on-load="(source, type) => emit('loadType', source, type)"
              @load-page="
                (source, pageNo, type) => emit('loadPage', source, pageNo, type)
              "
              @on-detail="(source, item) => emit('toDetail', source, item)"
            ></MobileComicsTab>
          </van-collapse-item>
        </div>
      </van-collapse>
      <van-back-top bottom="60" right="10" />
    </van-pull-refresh>
    <ComicShelf></ComicShelf>
  </div>
</template>

<style scoped lang="less">
:deep(.van-sticky--fixed) span {
  background-color: var(--van-background-2);
  opacity: 0.5;
}
</style>
