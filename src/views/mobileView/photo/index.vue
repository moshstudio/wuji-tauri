<script setup lang="ts">
import { useStore } from '@/store';
import { storeToRefs } from 'pinia';
import PhotoCard from '@/components/card/PhotoCard.vue';
import SimplePagination from '@/components/SimplePagination.vue';
import PhotoShelf from '@/views/photo/PhotoShelf.vue';
import { PhotoSource } from '@/types';
import SearchButton from '@/components/mobile/Search.vue';
import LeftPopup from '@/components/mobile/LeftPopup.vue';
import { ref } from 'vue';
import { sleep } from '@/utils';

const store = useStore();
const { photoSources } = storeToRefs(store);

const searchValue = defineModel('searchValue', { type: String, default: '' });
const showShelf = defineModel('showShelf', { type: Boolean, default: false });

const emit = defineEmits<{
  (e: 'recommend', force?: boolean): void;
  (e: 'search'): void;
  (e: 'pageChange', source: PhotoSource, pageNo: number): void;
  (e: 'openBaseUrl', source: PhotoSource): void;
}>();

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
      <div v-for="item in photoSources" :key="item.item.id">
        <template v-if="item.list">
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
    <van-back-top bottom="60" right="10" />

    <PhotoShelf v-model:show="showShelf"></PhotoShelf>
  </div>
</template>

<style scoped lang="less"></style>
