<script setup lang="ts">
import type { BookItem } from '@wuji-tauri/source-extension';
import type { BookSource } from '@/types';
import type { BookHistory } from '@/types/book';
import { LiquidGlassContainer } from '@tinymomentum/liquid-glass-vue';
import { WBookCard } from '@wuji-tauri/components';
import { storeToRefs } from 'pinia';
import { ref } from 'vue';
import ResponsiveGrid2 from '@/components/grid/ResponsiveGrid2.vue';
import WHeader from '@/components/header/WHeader.vue';
import WBookTab from '@/components/tab/WBookTab.vue';
import { router } from '@/router';
import { useDisplayStore } from '@/store';
import { sleep } from '@/utils';

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
              v-for="(book, bookIndex) in bookHistory"
              :key="`${book.book.sourceId}_${book.book.id}_${bookIndex}`"
              :book="book.book"
              :click="() => historyToBook(book)"
            />
          </ResponsiveGrid2>
        </van-collapse-item>
        <div
          v-for="(item, sourceIndex) in bookSources"
          :key="`${item.item.id}_${sourceIndex}`"
        >
          <van-collapse-item
            v-show="
              item.list && !(!Array.isArray(item.list) && !item.list?.list)
            "
            :name="sourceIndex + item.item.id"
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
          :border-radius="20"
          glass-tint-color="#000000"
          :glass-tint-opacity="20"
          :frost-blur-radius="1"
        >
          <van-icon name="arrow-up" />
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
