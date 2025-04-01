<script setup lang="ts">
import { useDisplayStore, useStore } from '@/store';
import { storeToRefs } from 'pinia';
import WinPhotoCard from '@/components/card/photoCards/WinPhotoCard.vue';
import HorizonList from '@/components/HorizonList.vue';
import SimplePagination from '@/components/pagination/SimplePagination.vue';
import PhotoShelf from '@/views/photo/PhotoShelf.vue';
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
    <van-row justify="center" align="center" class="relative">
      <div
        class="absolute right-6 text-button"
        @click="displayStore.showPhotoShelf = true"
      >
        收藏
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
    <div v-for="item in photoSources" :key="item.item.id" class="px-4">
      <template v-if="item.list">
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
      </template>
    </div>
    <PhotoShelf></PhotoShelf>
  </div>
</template>

<style scoped lang="less"></style>
