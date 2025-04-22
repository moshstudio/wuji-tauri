<script setup lang="ts">
import type { BookItem } from '@/extensions/book';
import type { BookSource } from '@/types';
import BooksTab from '@/components/windows/BooksTab.vue';
import WinSearch from '@/components/windows/WinSearch.vue';
import { useDisplayStore, useStore } from '@/store';
import BookShelf from '@/views/book/BookShelf.vue';
import { storeToRefs } from 'pinia';

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
</script>

<template>
  <div
    v-remember-scroll
    class="relative w-full h-full overflow-x-hidden overflow-y-auto"
    :class="
      displayStore.showBookShelf ? 'overflow-y-hidden' : 'overflow-y-auto'
    "
  >
    <div class="flex items-center justify-between px-4 py-2">
      <div class="placeholder" />
      <WinSearch
        v-model:search-value="searchValue"
        @search="() => emit('search')"
      />
      <div
        class="text-button text-nowrap"
        @click="displayStore.showBookShelf = true"
      >
        书架
      </div>
    </div>
    <div v-for="source in bookSources" :key="source.item.id" class="px-4">
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
        <BooksTab
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
    <BookShelf />
  </div>
</template>

<style scoped lang="less"></style>
