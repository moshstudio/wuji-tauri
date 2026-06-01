<script setup lang="ts">
import type {
  VideoItem,
  VideoList,
} from '@wuji-tauri/source-extension';
import type { VideoSource } from '@/types';
import { MVideoCard } from '@wuji-tauri/components';
import { storeToRefs } from 'pinia';
import { ref, watch } from 'vue';
import ResponsiveGrid2 from '@/components/grid/ResponsiveGrid2.vue';
import MPagination from '@/components/pagination/MPagination.vue';
import { useDisplayStore } from '@/store';

const props = defineProps<{
  source: VideoSource;
  toPage: (
    source: VideoSource,
    pageNo?: number,
    type?: string,
    showLoading?: boolean,
  ) => Promise<any> | void;
  toDetail: (source: VideoSource, item: VideoItem) => void;
}>();
const displayStore = useDisplayStore();
const { paginationPosition } = storeToRefs(displayStore);

const active = ref(0);

const loadingMap = new Set<number>();
async function load(i: number | string) {
  if (!props.source.list || !Array.isArray(props.source.list))
    return;
  const index = Number(i);
  if (Number.isNaN(index))
    return;

  const t = props.source.list[index];
  if (t.list && t.list.length)
    return;
  if (loadingMap.has(index))
    return;

  loadingMap.add(index);
  try {
    await props.toPage(props.source, 1, t.type);
  }
  finally {
    loadingMap.delete(index);
  }
}

function changePage(index: number, pageNo?: number) {
  if (!props.source.list)
    return;
  let t: VideoList;
  if (Array.isArray(props.source.list)) {
    t = props.source.list[index];
  }
  else {
    t = props.source.list;
  }
  props.toPage(props.source, pageNo, t.type, true);
}

function toDetail(item: VideoItem) {
  props.toDetail(props.source, item);
}

watch(
  () => props.source.list,
  (list) => {
    if (!Array.isArray(list))
      return;
    // 分类变化后，防止 active 指向无效索引导致内容区表现异常
    if (active.value >= list.length) {
      active.value = 0;
    }
    load(active.value);
  },
  { immediate: true },
);
</script>

<template>
  <div v-if="!source.list" />

  <van-tabs
    v-else-if="Array.isArray(source.list)"
    v-model:active="active"
    shrink
    animated
    @change="(n) => load(n)"
  >
    <van-tab
      v-for="(item, index) in source.list"
      :key="source.item.id + index.toString() + item.type"
      :title="item.title || item.type"
    >
      <van-row
        v-if="
          (paginationPosition === 'top' || paginationPosition === 'both')
            && item.page
            && item.totalPage
            && item.totalPage > 1
        "
        class="px-2 py-1"
      >
        <MPagination
          :page-no="item.page"
          :page-count="item.totalPage"
          :to-page="(page: number) => changePage(index, page)"
        />
      </van-row>
      <van-loading v-if="!item.list?.length" class="p-2" size="24px" />
      <ResponsiveGrid2 v-else min-width="80" max-width="100">
        <template
          v-for="(video, videoIndex) in item.list"
          :key="source.item.id + videoIndex.toString() + video.id"
        >
          <MVideoCard :video="video" :click="toDetail" />
        </template>
      </ResponsiveGrid2>
      <van-row
        v-if="
          (paginationPosition === 'bottom' || paginationPosition === 'both')
            && item.page
            && item.totalPage
            && item.totalPage > 1
        "
        class="px-2 py-1"
      >
        <MPagination
          :page-no="item.page"
          :page-count="item.totalPage"
          :to-page="(page: number) => changePage(index, page)"
        />
      </van-row>
    </van-tab>
  </van-tabs>

  <template v-else>
    <van-row
      v-if="
        (paginationPosition === 'top' || paginationPosition === 'both')
          && source.list.page
          && source.list.totalPage
          && source.list.totalPage > 1
      "
    >
      <MPagination
        :page-no="source.list.page"
        :page-count="source.list.totalPage"
        :to-page="(page: number) => changePage(0, page)"
      />
    </van-row>
    <van-loading v-if="!source.list.list?.length" class="p-2" size="24px" />
    <ResponsiveGrid2 v-else min-width="80" max-width="100">
      <template
        v-for="(video, videoIndex) in source.list.list"
        :key="source.item.id + videoIndex.toString() + video.id"
      >
        <MVideoCard :video="video" :click="toDetail" />
      </template>
    </ResponsiveGrid2>
    <van-row
      v-if="
        (paginationPosition === 'bottom' || paginationPosition === 'both')
          && source.list.page
          && source.list.totalPage
          && source.list.totalPage > 1
      "
    >
      <MPagination
        :page-no="source.list.page"
        :page-count="source.list.totalPage"
        :to-page="(page: number) => changePage(0, page)"
      />
    </van-row>
  </template>
</template>

<style scoped lang="less"></style>
