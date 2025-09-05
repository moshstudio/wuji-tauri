<script setup lang="ts">
import type { MarketSource } from '@wuji-tauri/source-extension';
import { storeToRefs } from 'pinia';
import { onMounted, ref } from 'vue';
import MarketSourceDetail from '@/components/dialog/MarketSourceDetail.vue';
import PlatformSwitch from '@/components/platform/PlatformSwitch.vue';
import AppSourceMarket from '@/layouts/app/source/SourceMarket.vue';
import DesktopSourceMarket from '@/layouts/desktop/source/SourceMarket.vue';
import { router } from '@/router';
import { useServerStore, useStore, useSubscribeSourceStore } from '@/store';

const store = useStore();
const serverStore = useServerStore();
const subscribeStore = useSubscribeSourceStore();

const { marketSource } = storeToRefs(serverStore);
const sortType = ref<'createdAt' | 'thumbsUp'>('createdAt');
const searchValue = ref('');
const isFreshing = ref(false);

const showSelectSort = ref(false);
const selectSortActions = [
  {
    name: '时间',
    callback: () => {
      sortType.value = 'createdAt';
      showSelectSort.value = false;
      toPage();
    },
  },
  {
    name: '点赞',
    callback: () => {
      sortType.value = 'thumbsUp';
      showSelectSort.value = false;
      toPage();
    },
  },
];

const showDetailSheet = ref(false);
const showDetailSource = ref<MarketSource>();
async function toPage(page = 1, _sortType?: 'createdAt' | 'thumbsUp') {
  isFreshing.value = true;
  await serverStore.getMarketSource(page, sortType.value);
  isFreshing.value = false;
}

function toggleSortType() {
  showSelectSort.value = true;
}

function isImported(source: MarketSource) {
  return !!subscribeStore.subscribeSources.find(
    (s) => s.detail.id === source._id,
  );
}

async function onImport(source: MarketSource) {
  if (isImported(source)) {
    router.push({ name: 'SourceManage' });
  } else {
    await store.addMarketSource(source);
  }
}

async function onLike(source: MarketSource) {
  await serverStore.likeMarketSource(source);
}

function onShowDetail(source: MarketSource) {
  showDetailSource.value = source;
  showDetailSheet.value = true;
}

onMounted(() => {
  toPage();
});
</script>

<template>
  <PlatformSwitch>
    <template #app>
      <AppSourceMarket
        v-model:is-freshing="isFreshing"
        v-model:search-value="searchValue"
        :source="marketSource"
        :sort-type="sortType"
        :toggle-sort-type="toggleSortType"
        :to-page="toPage"
        :is-imported="isImported"
        :on-import="onImport"
        :on-like="onLike"
        :show-detail="onShowDetail"
      />
    </template>
    <template #desktop>
      <DesktopSourceMarket
        v-model:is-freshing="isFreshing"
        v-model:search-value="searchValue"
        :source="marketSource"
        :sort-type="sortType"
        :toggle-sort-type="toggleSortType"
        :to-page="toPage"
        :is-imported="isImported"
        :on-import="onImport"
        :on-like="onLike"
        :show-detail="onShowDetail"
      />
    </template>
    <van-action-sheet
      v-model:show="showSelectSort"
      :actions="selectSortActions"
      title="选择排序方式"
      cancel-text="取消"
      teleport="body"
    />
    <MarketSourceDetail
      v-model:show="showDetailSheet"
      :source="showDetailSource"
    />
  </PlatformSwitch>
</template>

<style scoped lang="less"></style>
