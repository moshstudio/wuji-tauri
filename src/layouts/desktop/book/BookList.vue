<script setup lang="ts">
import type { BookItem } from '@wuji-tauri/source-extension';
import type { BookSource } from '@/types';
import { ref } from 'vue';
import { LiquidGlassContainer } from '@tinymomentum/liquid-glass-vue';
import WHeader from '@/components/header/WHeader.vue';
import WBookTab from '@/components/tab/WBookTab.vue';
import ResponsiveGrid2 from '@/components/grid/ResponsiveGrid2.vue';
import { WBookCard } from '@wuji-tauri/components/src';
import { router } from '@/router';
import { useDisplayStore } from '@/store';
import { sleep } from '@/utils';
import { BookHistory } from '@/types/book';
import { storeToRefs } from 'pinia';

const props = defineProps<{
  bookSources: BookSource[];
  bookHistory: BookHistory[];
  recommend: (force?: boolean) => void;
  search: (keyword: string) => void;
  toPage: (source: BookSource, pageNo?: number, type?: string) => void;
  toDetail: (source: BookSource, item: BookItem) => void;
  historyToBook: (book: BookHistory) => void;
  clearHistory: () => void;
  openBaseUrl: (item: BookSource) => void;
}>();

const searchValue = defineModel<string>('searchValue', { required: true });

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
          router.push({ name: 'BookShelf' });
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
      <van-collapse v-model="displayStore.bookCollapse">
        <van-collapse-item
          v-show="showViewHistory && bookHistory.length"
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
            <WBookCard
              v-for="book in bookHistory"
              :book="book.book"
              :click="() => historyToBook(book)"
            />
          </ResponsiveGrid2>
        </van-collapse-item>
        <div v-for="(item, index) in bookSources" :key="item.item.id">
          <van-collapse-item
            v-show="
              item.list && !(!Array.isArray(item.list) && !item.list?.list)
            "
            :name="item.item.name"
            :title="item.item.name"
          >
            <WBookTab :source="item" :to-page="toPage" :to-detail="toDetail" />
          </van-collapse-item>
        </div>
      </van-collapse>
      <van-back-top bottom="60" right="10">
        <LiquidGlassContainer
          :width="40"
          :height="40"
          :borderRadius="20"
          :glassTintColor="'#000000'"
          :glassTintOpacity="20"
          :frostBlurRadius="1"
        >
          <van-icon name="arrow-up"></van-icon>
        </LiquidGlassContainer>
      </van-back-top>
    </van-pull-refresh>
  </div>
</template>

<style scoped lang="less">
:deep(.van-sticky--fixed) span {
  background-color: var(--van-background-2);
  opacity: 0.5;
}
</style>
