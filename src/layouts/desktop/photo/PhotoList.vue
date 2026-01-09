<script setup lang="ts">
import type { PhotoSource } from '@/types';
import { WPhotoCard } from '@wuji-tauri/components/src';
import { ref } from 'vue';
import { storeToRefs } from 'pinia';
import { LiquidGlassContainer } from '@tinymomentum/liquid-glass-vue';
import ResponsiveGrid2 from '@/components/grid/ResponsiveGrid2.vue';
import WHeader from '@/components/header/WHeader.vue';
import MPagination from '@/components/pagination/MPagination.vue';
import { router } from '@/router';
import { useDisplayStore } from '@/store';
import { sleep } from '@/utils';

const props = defineProps<{
  photoSources: PhotoSource[];
  recommend: (force?: boolean) => void;
  search: (keyword: string) => void;
  toPage: (source: PhotoSource, pageNo: number) => void;
  openBaseUrl: (item: PhotoSource) => void;
}>();
const searchValue = defineModel<string>('searchValue', {
  required: true,
});
const displayStore = useDisplayStore();
const { paginationPosition } = storeToRefs(displayStore);

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
        <div v-for="(item, index) in photoSources" :key="item.item.id">
          <van-collapse-item
            v-if="!!item.list?.list.length"
            v-show="item.list"
            :name="index + item.item.id"
            :title="item.item.name"
          >
            <div
              v-if="
                (paginationPosition === 'top' ||
                  paginationPosition === 'both') &&
                item.list &&
                item.list.totalPage
              "
              class="flex flex-nowrap px-2"
            >
              <MPagination
                :page-no="item.list.page"
                :page-count="item.list.totalPage"
                :to-page="(page) => toPage(item, page)"
              />
            </div>
            <ResponsiveGrid2 min-width="80" max-width="100">
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
            <div
              v-if="
                (paginationPosition === 'bottom' ||
                  paginationPosition === 'both') &&
                item.list &&
                item.list.totalPage
              "
              class="flex flex-nowrap px-2"
            >
              <MPagination
                :page-no="item.list.page"
                :page-count="item.list.totalPage"
                :to-page="(page) => toPage(item, page)"
              />
            </div>
            <van-divider :style="{ margin: '8px 0px' }" />
          </van-collapse-item>
        </div>
      </van-collapse>
      <van-back-top bottom="60" right="10">
        <LiquidGlassContainer
          :width="40"
          :height="40"
          :borderRadius="20"
          :glassTintColor="'#000000'"
          :glassTintOpacity="20"
          :frostBlurRadius="1"
        >
          <van-icon name="arrow-up"></van-icon>
        </LiquidGlassContainer>
      </van-back-top>
    </van-pull-refresh>
  </div>
</template>

<style scoped lang="less">
:deep(.van-sticky--fixed) span {
  background-color: var(--van-background-2);
  opacity: 0.5;
}
</style>
