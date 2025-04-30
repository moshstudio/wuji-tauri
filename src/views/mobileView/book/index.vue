<script setup lang="ts">
import type { BookItem } from '@/extensions/book';
import type { BookSource } from '@/types';
import type { ComponentPublicInstance } from 'vue';
import MobileHeader from '@/components/mobile/MobileHeader.vue';
import MobileBooksTab from '@/components/tabs/MobileBooksTab.vue';
import { useDisplayStore, useStore } from '@/store';
import { sleep } from '@/utils';
import BookShelf from '@/views/book/BookShelf.vue';
import { storeToRefs } from 'pinia';
import { ref } from 'vue';

const emit = defineEmits<{
  (e: 'recommend', force?: boolean): void;
  (e: 'search'): void;
  (e: 'loadType', source: BookSource, type?: string): void;
  (e: 'loadPage', source: BookSource, pageNo?: number, type?: string): void;
  (e: 'toDetail', source: BookSource, item: BookItem): void;
  (e: 'openBaseUrl', source: BookSource): void;
}>();

const searchValue = defineModel('searchValue', { type: String, default: '' });

const store = useStore();
const displayStore = useDisplayStore();
const { bookSources } = storeToRefs(store);

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
  <div class="relative w-full h-full flex flex-col">
    <MobileHeader
      v-model:search-value="searchValue"
      @search="search"
      @show-shelf="() => (displayStore.showBookShelf = true)"
    />
    <van-pull-refresh
      v-model="isRefreshing"
      v-remember-scroll
      class="main grow overflow-x-hidden overflow-y-auto"
      @refresh="onRefresh"
    >
      <van-collapse v-model="displayStore.bookCollapse">
        <div v-for="(item, index) in bookSources" :key="item.item.id">
          <van-collapse-item
            v-show="
              item.list && !(!Array.isArray(item.list) && !item.list?.list)
            "
            :name="item.item.name"
            :title="item.item.name"
          >
            <MobileBooksTab
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
      <van-back-top bottom="60" right="10" />
    </van-pull-refresh>
    <BookShelf />
  </div>
</template>

<style scoped lang="less">
:deep(.van-sticky--fixed) span {
  background-color: var(--van-background-2);
  opacity: 0.5;
}
</style>
