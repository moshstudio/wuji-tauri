<script setup lang="ts">
import type {
  MarketSource,
  PagedMarketSource,
} from '@wuji-tauri/source-extension';

import AppSourceMarket from '@/layouts/app/source/SourceMarket.vue';

defineProps<{
  source?: PagedMarketSource;
  sortType?: 'createdAt' | 'thumbsUp';
  toggleSortType: () => void;
  toPage: (pageNo: number, sortType?: 'createdAt' | 'thumbsUp') => void;
  showDetail: (source: MarketSource) => void;
  isImported: (source: MarketSource) => boolean;
  onImport: (source: MarketSource) => void;
  onLike: (source: MarketSource) => void;
}>();
const searchValue = defineModel<string>('searchValue', { default: '' });
const isFreshing = defineModel<boolean>('isFreshing', { default: false });
</script>

<template>
  <AppSourceMarket
    v-model:search-value="searchValue"
    v-model:is-freshing="isFreshing"
    :source="source"
    :sort-type="sortType"
    :toggle-sort-type="toggleSortType"
    :to-page="toPage"
    :show-detail="showDetail"
    :is-imported="isImported"
    :on-import="onImport"
    :on-like="onLike"
  />
</template>

<style scoped lang="less"></style>
