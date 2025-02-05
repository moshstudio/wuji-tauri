<script setup lang="ts">
import _ from 'lodash';
import { useDisplayStore, useStore } from '@/store';
import { storeToRefs } from 'pinia';
import BooksTab from '@/components/windows/BooksTab.vue';
import BookShelf from '@/views/book/BookShelf.vue';
import SearchButton from '@/components/mobile/Search.vue';
import MobileBooksTab from '@/components/tabs/MobileBooksTab.vue';
import { BookSource } from '@/types';
import { BookItem } from '@/extensions/book';
import { ref } from 'vue';
import { sleep } from '@/utils';

const searchValue = defineModel('searchValue', { type: String, default: '' });
const showShelf = defineModel('showShelf', { type: Boolean, default: false });

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

const isRefreshing = ref(false);
const onRefresh = async () => {
  isRefreshing.value = true;
  emit('search');
  await sleep(1000);
  isRefreshing.value = false;
};
const search = (value: string) => {
  searchValue.value = value;
  emit('search');
};
</script>

<template>
  <div class="w-full h-full flex flex-col overflow-hidden">
    <header class="px-4 h-[50px] flex justify-between items-center">
      <LeftPopup></LeftPopup>
      <div class="flex gap-2 items-center h-[50px]">
        <SearchButton v-model="searchValue" @search="search"></SearchButton>
        <van-icon
          name="star-o"
          class="text-button-2"
          @click="() => (showShelf = true)"
        />
      </div>
    </header>
    <main v-remember-scroll class="main grow overflow-x-hidden overflow-y-auto">
      <van-pull-refresh v-model="isRefreshing" @refresh="onRefresh">
        <van-collapse v-model="displayStore.bookCollapse">
          <template v-for="item in bookSources" :key="item.item.id">
            <van-collapse-item
              :title="item.item.name"
              :name="item.item.name"
              v-if="item.list"
            >
              <MobileBooksTab
                :source="item"
                @on-load="(source, type) => emit('loadType', source, type)"
                @load-page="
                  (source, pageNo, type) =>
                    emit('loadPage', source, pageNo, type)
                "
                @on-detail="(source, item) => emit('toDetail', source, item)"
              ></MobileBooksTab>
            </van-collapse-item>
          </template>
        </van-collapse>
      </van-pull-refresh>
    </main>
    <BookShelf v-model:show="showShelf"></BookShelf>
  </div>
</template>

<style scoped lang="less"></style>
