<script setup lang="ts">
import { router } from '@/router';
import SearchField from '@/components/search/SearchField.vue';
import WNavbar from '@/components/header/WNavbar.vue';
import MPagination from '@/components/pagination/MPagination.vue';
import ResponsiveGrid2 from '@/components/grid/ResponsiveGrid2.vue';
import { MarketSourceCard } from '@wuji-tauri/components/src';
import { MarketSource, PagedMarketSource } from '@wuji-tauri/source-extension';
import { permissionText, permissionStyle } from '@/utils/marketSource';
import _ from 'lodash';

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
  <div class="relative flex h-full w-full flex-col">
    <WNavbar
      title="订阅源市场"
      right-text="我的"
      :click-right="
        () => {
          router.push({ name: 'SourceMy' });
        }
      "
    ></WNavbar>
    <van-pull-refresh
      v-model="isFreshing"
      v-remember-scroll
      :head-height="100"
      class="flex w-full flex-grow flex-col overflow-y-auto bg-[--van-background-2] p-2"
      @refresh="() => toPage(1, sortType)"
    >
      <div class="hidden w-full items-center justify-center">
        <SearchField
          v-model:value="searchValue"
          :search="() => {}"
          :search-histories="[]"
        ></SearchField>
      </div>
      <div class="flex w-full items-center justify-start gap-2">
        <MPagination
          :page-no="source?.page"
          :page-count="source?.totalPages || 1"
          :to-page="(page: number) => toPage(page, sortType)"
        ></MPagination>
        <van-button
          size="small"
          type="primary"
          plain
          icon="sort"
          @click="toggleSortType"
        >
          {{ sortType === 'thumbsUp' ? '点赞' : '时间' }}
        </van-button>
      </div>
      <ResponsiveGrid2>
        <MarketSourceCard
          v-for="s in source?.data"
          :key="s._id"
          :source="s"
          :is-imported="isImported(s)"
          :on-import="onImport"
          :click="() => showDetail(s)"
          :permission-text="permissionText"
          :permission-style="permissionStyle"
          :on-like="onLike"
        ></MarketSourceCard>
      </ResponsiveGrid2>
    </van-pull-refresh>
  </div>
</template>

<style scoped lang="less"></style>
