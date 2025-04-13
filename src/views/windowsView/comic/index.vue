<script setup lang="ts">
import type { ComicItem } from '@/extensions/comic';
import type { ComicSource } from '@/types';
import ComicsTab from '@/components/windows/ComicsTab.vue';
import WinSearch from '@/components/windows/WinSearch.vue';
import { useDisplayStore, useStore } from '@/store';
import ComicShelf from '@/views/comic/ComicShelf.vue';
import { storeToRefs } from 'pinia';

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
</script>

<template>
  <div
    v-remember-scroll
    class="w-full h-full overflow-x-hidden overflow-y-auto"
  >
    <div class="flex items-center justify-between px-4 py-2">
      <div class="placeholder" />
      <WinSearch
        v-model:search-value="searchValue"
        @search="() => emit('search')"
      />
      <div
        class="text-button text-nowrap"
        @click="displayStore.showComicShelf = true"
      >
        书架
      </div>
    </div>
    <div v-for="source in comicSources" :key="source.item.id" class="px-4">
      <div v-show="!!source.list">
        <van-row justify="space-between">
          <van-button
            :plain="true"
            size="small"
            @click="() => emit('openBaseUrl', source)"
          >
            {{ source.item.name }}
          </van-button>
        </van-row>
        <ComicsTab
          :source="source"
          @on-load="(source, type) => emit('loadType', source, type)"
          @load-page="
            (source, pageNo, type) => emit('loadPage', source, pageNo, type)
          "
          @on-detail="(source, item) => emit('toDetail', source, item)"
        />
        <van-divider :style="{ margin: '8px 0px' }" />
      </div>
    </div>
    <ComicShelf />
  </div>
</template>

<style scoped lang="less"></style>
