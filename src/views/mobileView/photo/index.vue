<script setup lang="ts">
import { useDisplayStore, useStore } from '@/store';
import { storeToRefs } from 'pinia';
import MobilePhotoCard from '@/components/card/photoCards/MobilePhotoCard.vue';
import SimplePagination from '@/components/pagination/SimplePagination.vue';
import PhotoShelf from '@/views/photo/PhotoShelf.vue';
import { PhotoSource } from '@/types';
import MobileHeader from '@/components/mobile/MobileHeader.vue';
import ResponsiveGrid from '@/components/ResponsiveGrid.vue';
import { ComponentPublicInstance, onBeforeUpdate, ref, watch } from 'vue';
import { sleep } from '@/utils';

const store = useStore();
const displayStore = useDisplayStore();
const { photoSources } = storeToRefs(store);

const searchValue = defineModel('searchValue', {
  type: String,
  required: true,
});

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

const containers = ref<Array<HTMLElement | undefined>>(
  new Array(2000).fill(undefined)
);
const setContainerRef = (
  el: Element | ComponentPublicInstance | null,
  index: number
) => {
  if (el) {
    containers.value[index] = el as HTMLElement;
  }
};
</script>

<template>
  <div class="w-full h-full flex flex-col">
    <MobileHeader
      v-model:search-value="searchValue"
      @search="search"
      @show-shelf="() => (displayStore.showPhotoShelf = true)"
    ></MobileHeader>
    <van-pull-refresh
      v-remember-scroll
      v-model="isRefreshing"
      @refresh="onRefresh"
      class="main grow overflow-x-hidden overflow-y-auto"
    >
      <van-collapse v-model="displayStore.photoCollapse">
        <div
          v-for="(item, index) in photoSources"
          :key="item.item.id"
          :ref="(el) => setContainerRef(el, index)"
        >
          <van-collapse-item :name="item.item.name" v-if="item.list">
            <template #title>
              <van-sticky offset-top="50" :container="containers[index]">
                <span class="rounded-br-lg px-2 py-1">
                  {{ item.item.name }}
                </span>
              </van-sticky>
            </template>
            <div class="flex flex-nowrap px-2">
              <SimplePagination
                v-model="item.list.page"
                :page-count="item.list.totalPage"
                @change="(page) => emit('pageChange', item, page)"
                v-if="item.list && item.list.totalPage"
              />
            </div>
            <p v-if="!item.list?.list.length" class="m-2 text-xs text-gray-600">
              内容为空
            </p>
            <ResponsiveGrid :base-cols="2" :gap="2" v-else>
              <template v-for="photo in item.list?.list" :key="photo">
                <MobilePhotoCard :item="photo"></MobilePhotoCard>
              </template>
            </ResponsiveGrid>
          </van-collapse-item>
        </div>
      </van-collapse>
      <van-back-top bottom="60" right="10" />
    </van-pull-refresh>

    <PhotoShelf></PhotoShelf>
  </div>
</template>

<style scoped lang="less">
:deep(.van-sticky--fixed) span {
  background-color: var(--van-background-2);
  opacity: 0.5;
}
</style>
