<script setup lang="ts">
import type {
  VideoItem,
  VideoList,
  VideosList,
} from '@wuji-tauri/source-extension';
import type { VideoSource } from '@/types';
import { MVideoCard } from '@wuji-tauri/components/src';
import { debounce } from 'lodash';
import { nanoid } from 'nanoid';
import { ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import ResponsiveGrid2 from '@/components/grid/ResponsiveGrid2.vue';
import MPagination from '@/components/pagination/MPagination.vue';
import { useDisplayStore } from '@/store';

const displayStore = useDisplayStore();
const { paginationPosition } = storeToRefs(displayStore);

const props = defineProps<{
  source: VideoSource;
  toPage: (source: VideoSource, pageNo?: number, type?: string) => void;
  toDetail: (source: VideoSource, item: VideoItem) => void;
}>();

const active = ref(0);
const tabKey = ref(nanoid()); // 修改此值来重新渲染组件

function load(index: number) {
  if (!props.source.list) return;
  let t: VideoList;
  if (Array.isArray(props.source.list)) {
    t = props.source.list[index];
  } else {
    t = props.source.list;
  }
  props.toPage(props.source, 1, t.type);
}

function changePage(index: number, pageNo?: number) {
  if (!props.source.list) return;
  let t: VideoList;
  if (Array.isArray(props.source.list)) {
    t = props.source.list[index];
  } else {
    t = props.source.list;
  }
  props.toPage(props.source, pageNo, t.type);
}

function toDetail(item: VideoItem) {
  props.toDetail(props.source, item);
}

watch(
  () => props.source.list,
  debounce((list: VideosList | undefined) => {
    if (list && Array.isArray(list)) {
      tabKey.value = nanoid();
    }
  }, 500),
);
</script>

<template>
  <div v-if="!source.list" />

  <van-tabs
    v-else-if="Array.isArray(source.list)"
    :key="tabKey"
    v-model:active="active"
    shrink
    animated
    @rendered="(index) => load(index)"
  >
    <van-tab
      v-for="(item, index) in source.list"
      :key="source.item.id + index.toString() + item.type"
      :title="item.type"
    >
      <van-row
        v-if="
          (paginationPosition === 'top' || paginationPosition === 'both') &&
          item.page &&
          item.totalPage &&
          item.totalPage > 1
        "
        class="px-2 py-1"
      >
        <MPagination
          :page-no="item.page"
          :page-count="item.totalPage"
          :to-page="(page: number) => changePage(index, page)"
        />
      </van-row>
      <van-loading v-if="!item.list?.length" class="p-2" />
      <ResponsiveGrid2 min-width="80" max-width="100">
        <template
          v-for="(video, index) in item.list"
          :key="source.item.id + index.toString() + video.id"
        >
          <MVideoCard :video="video" :click="toDetail" />
        </template>
      </ResponsiveGrid2>
      <van-row
        v-if="
          (paginationPosition === 'bottom' || paginationPosition === 'both') &&
          item.page &&
          item.totalPage &&
          item.totalPage > 1
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
        (paginationPosition === 'top' || paginationPosition === 'both') &&
        source.list.page &&
        source.list.totalPage &&
        source.list.totalPage > 1
      "
    >
      <MPagination
        :page-no="source.list.page"
        :page-count="source.list.totalPage"
        :to-page="(page: number) => changePage(0, page)"
      />
    </van-row>
    <van-loading v-if="!source.list.list?.length" class="p-2" />
    <ResponsiveGrid2 min-width="80" max-width="100">
      <template
        v-for="(video, index) in source.list.list"
        :key="source.item.id + index.toString() + video.id"
      >
        <MVideoCard :video="video" :click="toDetail" />
      </template>
    </ResponsiveGrid2>
    <van-row
      v-if="
        (paginationPosition === 'bottom' || paginationPosition === 'both') &&
        source.list.page &&
        source.list.totalPage &&
        source.list.totalPage > 1
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
