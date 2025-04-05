<script setup lang="ts">
import { useDisplayStore, useStore } from '@/store';
import { storeToRefs } from 'pinia';
import BooksTab from '@/components/windows/BooksTab.vue';
import BookShelf from '@/views/book/BookShelf.vue';
import WinSearch from '@/components/windows/WinSearch.vue';
import { BookSource } from '@/types';
import { BookItem } from '@/extensions/book';

const searchValue = defineModel('searchValue', { type: String, default: '' });

const emit = defineEmits<{
  (e: 'recommend', force?: boolean): void;
  (e: 'search'): void;
  (e: 'loadType', source: BookSource, type?: string): void;
  (e: 'loadPage', source: BookSource, pageNo?: number, type?: string): void;
  (e: 'toDetail', source: BookSource, item: BookItem): void;
  (e: 'openBaseUrl', source: BookSource): void;
}>();

const store = useStore();
const displayStore = useDisplayStore();
const { bookSources } = storeToRefs(store);
</script>

<template>
  <div
    v-remember-scroll
    class="w-full h-full overflow-x-hidden overflow-y-auto"
  >
    <div class="flex items-center justify-between px-4 py-2">
      <div class="placeholder"></div>
      <WinSearch
        v-model:search-value="searchValue"
        @search="() => emit('search')"
      ></WinSearch>
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
        >
        </BooksTab>
        <van-divider :style="{ margin: '8px 0px' }" />
      </div>
    </div>
    <BookShelf></BookShelf>
  </div>
</template>

<style scoped lang="less"></style>
