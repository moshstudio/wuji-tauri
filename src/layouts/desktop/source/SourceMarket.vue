<script setup lang="ts">
import { MarketSource, PagedMarketSource } from '@wuji-tauri/source-extension';

import _ from 'lodash';
import AppSourceMarket from '@/layouts/app/source/SourceMarket.vue';

const searchValue = defineModel<string>('searchValue', { default: '' });
const isFreshing = defineModel<boolean>('isFreshing', { default: false });

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
  ></AppSourceMarket>
</template>

<style scoped lang="less"></style>
