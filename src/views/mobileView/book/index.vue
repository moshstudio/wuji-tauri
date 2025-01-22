<script setup lang="ts">
import _ from 'lodash';
import { useStore } from '@/store';
import { storeToRefs } from 'pinia';
import BooksTab from '@/components/windows/BooksTab.vue';
import BookShelf from '@/views/book/BookShelf.vue';
import SearchButton from '@/components/mobile/Search.vue';
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
  <div
    v-remember-scroll
    class="w-full h-full overflow-x-hidden overflow-y-auto"
  >
    <div class="px-2 h-[50px] flex justify-between items-center">
      <LeftPopup></LeftPopup>
      <div class="flex gap-2 items-center h-[50px]">
        <SearchButton v-model="searchValue" @search="search"></SearchButton>
        <van-icon
          name="star-o"
          class="text-button-2"
          @click="() => (showShelf = true)"
        />
      </div>
    </div>
    <van-pull-refresh v-model="isRefreshing" @refresh="onRefresh">
      <div v-for="item in bookSources" :key="item.item.id">
        <template v-if="item.list">
          <template v-if="_.isArray(item.list)">
            <van-tab> </van-tab>
          </template>
          <template v-else>

          </template>

          <van-row justify="space-between" class="flex-nowrap px-2">
            <van-button
              :plain="true"
              size="small"
              @click="() => emit('openBaseUrl', item)"
            >
              <div class="truncate max-w-[100px] text-[--van-text-color]">
                {{ item.item.name }}
              </div>
            </van-button>
            <SimplePagination
              v-model="item.list.page"
              :page-count="item.list.totalPage"
              @change="(page) => emit('pageChange', item, page)"
              v-if="item.list && item.list.totalPage"
            />
          </van-row>
          <div class="grid grid-cols-2 gap-1">
            <p v-if="!item.list?.list.length" class="m-2 text-xs text-gray-600">
              内容为空
            </p>
            <template v-for="photo in item.list?.list" :key="photo" v-else>
              <PhotoCard :item="photo"></PhotoCard>
            </template>
          </div>
          <van-divider :style="{ margin: '8px 0px' }" />
        </template>
      </div>
    </van-pull-refresh>
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
    <BookShelf v-model:show="showShelf"></BookShelf>
  </div>
</template>

<style scoped lang="less"></style>
