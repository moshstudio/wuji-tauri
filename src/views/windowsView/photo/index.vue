<script setup lang="ts">
import { useDisplayStore, useStore } from '@/store';
import { storeToRefs } from 'pinia';
import WinPhotoCard from '@/components/card/photoCards/WinPhotoCard.vue';
import HorizonList from '@/components/HorizonList.vue';
import SimplePagination from '@/components/pagination/SimplePagination.vue';
import PhotoShelf from '@/views/photo/PhotoShelf.vue';
import WinSearch from '@/components/windows/WinSearch.vue';
import { PhotoSource } from '@/types';

const store = useStore();
const displayStore = useDisplayStore();
const { photoSources } = storeToRefs(store);

const searchValue = defineModel('searchValue', { type: String, default: '' });

const emit = defineEmits<{
  (e: 'recommend', force?: boolean): void;
  (e: 'search'): void;
  (e: 'pageChange', source: PhotoSource, pageNo: number): void;
  (e: 'openBaseUrl', source: PhotoSource): void;
}>();
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
        @click="displayStore.showPhotoShelf = true"
      >
        收藏
      </div>
    </div>
    <div v-for="item in photoSources" :key="item.item.id" class="px-4">
      <div v-show="item.list">
        <van-row justify="space-between">
          <van-button
            :plain="true"
            size="small"
            @click="() => emit('openBaseUrl', item)"
          >
            {{ item.item.name }}
          </van-button>
          <SimplePagination
            v-model="item.list.page"
            :page-count="item.list.totalPage"
            @change="(page) => emit('pageChange', item, page)"
            v-if="item.list && item.list.totalPage"
          />
        </van-row>
        <HorizonList>
          <p v-if="!item.list?.list.length" class="m-2 text-xs text-gray-600">
            内容为空
          </p>
          <template v-for="photo in item.list?.list" :key="photo" v-else>
            <WinPhotoCard :item="photo"></WinPhotoCard>
          </template>
        </HorizonList>
        <van-divider :style="{ margin: '8px 0px' }" />
      </div>
    </div>
    <PhotoShelf></PhotoShelf>
  </div>
</template>

<style scoped lang="less"></style>
