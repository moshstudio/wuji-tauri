<script setup lang="ts">
import type { PhotoSource } from '@/types';
import { WPhotoCard } from '@wuji-tauri/components/src';
import WHeader from '@/components/header/WHeader.vue';
import MPagination from '@/components/pagination/MPagination.vue';
import ResponsiveGrid2 from '@/components/grid/ResponsiveGrid2.vue';
import { useDisplayStore } from '@/store';
import { sleep } from '@/utils';
import { ref } from 'vue';
import { router } from '@/router';

const searchValue = defineModel<string>('searchValue', {
  required: true,
});
const props = defineProps<{
  photoSources: PhotoSource[];
  recommend: (force?: boolean) => void;
  search: (keyword: string) => void;
  toPage: (source: PhotoSource, pageNo: number) => void;
  openBaseUrl: (item: PhotoSource) => void;
}>();

const displayStore = useDisplayStore();

const isRefreshing = ref(false);
async function onRefresh() {
  isRefreshing.value = true;
  props.search(searchValue.value);
  await sleep(1000);
  isRefreshing.value = false;
}
</script>

<template>
  <div class="relative flex h-full w-full flex-col">
    <WHeader
      v-model:value="searchValue"
      @search="() => props.search(searchValue)"
      @show-shelf="
        () => {
          router.push({ name: 'PhotoShelf' });
        }
      "
    />
    <van-pull-refresh
      v-model="isRefreshing"
      v-remember-scroll
      :head-height="100"
      class="photo-main-container main flex h-full w-full grow flex-col overflow-y-auto overflow-x-hidden"
      @refresh="onRefresh"
    >
      <van-collapse v-model="displayStore.photoCollapse">
        <div v-for="(item, _) in photoSources" :key="item.item.id">
          <van-collapse-item
            v-show="item.list"
            :name="item.item.name"
            :title="item.item.name"
          >
            <div class="flex flex-nowrap px-2">
              <MPagination
                v-if="item.list && item.list.totalPage"
                :page-no="item.list.page"
                :page-count="item.list.totalPage"
                :to-page="(page) => toPage(item, page)"
              />
            </div>
            <ResponsiveGrid2 min-width="80" max-width="100">
              <p
                v-if="!item.list?.list.length"
                class="m-2 text-xs text-gray-600"
              >
                内容为空
              </p>
              <WPhotoCard
                v-for="photo in item.list?.list"
                :key="photo.id"
                :item="photo"
                @click="
                  (item) => {
                    router.push({
                      name: 'PhotoDetail',
                      params: { id: item.id, sourceId: item.sourceId },
                    });
                  }
                "
              />
            </ResponsiveGrid2>
            <van-divider :style="{ margin: '8px 0px' }" />
          </van-collapse-item>
        </div>
      </van-collapse>
      <van-back-top bottom="60" right="10" target=".photo-main-container" />
    </van-pull-refresh>
  </div>
</template>

<style scoped lang="less">
:deep(.van-sticky--fixed) span {
  background-color: var(--van-background-2);
  opacity: 0.5;
}
</style>
