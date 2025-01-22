<script setup lang="ts">
import { useStore } from '@/store';
import { storeToRefs } from 'pinia';
import BooksTab from '@/components/windows/BooksTab.vue';
import BookShelf from '@/views/book/BookShelf.vue';
import { BookSource } from '@/types';
import { BookItem } from '@/extensions/book';

const showBookShelf = defineModel('showBookShelf', {
  type: Boolean,
  required: true,
});
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
const { bookSources } = storeToRefs(store);
</script>

<template>
  <div class="w-full h-full overflow-x-hidden overflow-y-auto">
    <van-row justify="center" align="center" class="relative">
      <div
        class="absolute right-6 text-button"
        @click="() => (showBookShelf = !showBookShelf)"
      >
        书架
      </div>
      <van-search
        v-model="searchValue"
        placeholder="请输入搜索关键词"
        left-icon=""
        @click-right-icon="() => emit('search')"
        @search="() => emit('search')"
        @clear="() => emit('search')"
      >
        <template #right-icon>
          <van-icon name="search" class="van-haptics-feedback" />
        </template>
      </van-search>
    </van-row>
    <div v-for="source in bookSources" :key="source.item.id" class="px-4">
      <template v-if="!!source.list">
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
      </template>
    </div>
    <BookShelf v-model:show="showBookShelf"></BookShelf>
  </div>
</template>

<style scoped lang="less"></style>
