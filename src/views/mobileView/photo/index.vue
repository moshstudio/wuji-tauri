<script setup lang="ts">
import type { PhotoSource } from '@/types';
import type { ComponentPublicInstance } from 'vue';
import MobilePhotoCard from '@/components/card/photoCards/MobilePhotoCard.vue';
import MobileHeader from '@/components/mobile/MobileHeader.vue';
import SimplePagination from '@/components/pagination/SimplePagination.vue';
import ResponsiveGrid from '@/components/ResponsiveGrid.vue';
import { useDisplayStore, useStore } from '@/store';
import { sleep } from '@/utils';
import PhotoShelf from '@/views/photo/PhotoShelf.vue';
import { storeToRefs } from 'pinia';
import { ref } from 'vue';

const emit = defineEmits<{
  (e: 'recommend', force?: boolean): void;
  (e: 'search'): void;
  (e: 'pageChange', source: PhotoSource, pageNo: number): void;
  (e: 'openBaseUrl', source: PhotoSource): void;
}>();
const store = useStore();
const displayStore = useDisplayStore();
const { photoSources } = storeToRefs(store);

const searchValue = defineModel('searchValue', {
  type: String,
  required: true,
});

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

const containers = ref<Array<HTMLElement | undefined>>(
  Array.from({ length: 2000 }).fill(undefined),
);
function setContainerRef(el: Element | ComponentPublicInstance | null, index: number) {
  if (el) {
    containers.value[index] = el as HTMLElement;
  }
}
</script>

<template>
  <div class="w-full h-full flex flex-col">
    <MobileHeader
      v-model:search-value="searchValue"
      @search="search"
      @show-shelf="() => (displayStore.showPhotoShelf = true)"
    />
    <van-pull-refresh
      v-model="isRefreshing"
      v-remember-scroll
      class="main grow overflow-x-hidden overflow-y-auto"
      @refresh="onRefresh"
    >
      <van-collapse v-model="displayStore.photoCollapse">
        <div
          v-for="(item, index) in photoSources"
          :key="item.item.id"
          :ref="(el) => setContainerRef(el, index)"
        >
          <van-collapse-item v-show="item.list" :name="item.item.name">
            <template #title>
              <van-sticky offset-top="50" :container="containers[index]">
                <span class="rounded-br-lg px-2 py-1">
                  {{ item.item.name }}
                </span>
              </van-sticky>
            </template>
            <div class="flex flex-nowrap px-2">
              <SimplePagination
                v-if="item.list && item.list.totalPage"
                v-model="item.list.page"
                :page-count="item.list.totalPage"
                @change="(page) => emit('pageChange', item, page)"
              />
            </div>
            <p v-if="!item.list?.list.length" class="m-2 text-xs text-gray-600">
              内容为空
            </p>
            <ResponsiveGrid v-else :base-cols="2" :gap="2">
              <template v-for="photo in item.list?.list" :key="photo">
                <MobilePhotoCard :item="photo" />
              </template>
            </ResponsiveGrid>
          </van-collapse-item>
        </div>
      </van-collapse>
      <van-back-top bottom="60" right="10" />
    </van-pull-refresh>

    <PhotoShelf />
  </div>
</template>

<style scoped lang="less">
:deep(.van-sticky--fixed) span {
  background-color: var(--van-background-2);
  opacity: 0.5;
}
</style>
