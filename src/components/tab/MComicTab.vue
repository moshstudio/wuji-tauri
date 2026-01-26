<script setup lang="ts">
import type {
  ComicItem,
  ComicList,
  ComicsList,
} from '@wuji-tauri/source-extension';
import type { ComicSource } from '@/types';
import MComicCard from '@wuji-tauri/components/src/components/cards/comic/MComicCard.vue';
import { debounce } from 'lodash';
import { nanoid } from 'nanoid';
import { ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import MPagination from '@/components/pagination/MPagination.vue';
import { useDisplayStore } from '@/store';

const displayStore = useDisplayStore();
const { paginationPosition } = storeToRefs(displayStore);

const props = defineProps<{
  source: ComicSource;
  toPage: (
    source: ComicSource,
    pageNo?: number,
    type?: string,
  ) => Promise<any> | void;
  toDetail: (source: ComicSource, item: ComicItem) => void;
}>();

const active = ref(0);
const tabKey = ref(nanoid()); // 修改此值来重新渲染组件
const loadingMap = new Set<number>();
async function load(i: number | string) {
  if (!props.source.list || !Array.isArray(props.source.list)) return;
  const index = Number(i);
  if (isNaN(index)) return;

  const t = props.source.list[index];
  if (t.list && t.list.length) return;
  if (loadingMap.has(index)) return;

  loadingMap.add(index);
  try {
    await props.toPage(props.source, 1, t.type);
  } finally {
    loadingMap.delete(index);
  }
}

function changePage(index: number, pageNo?: number) {
  if (!props.source.list) return;
  let t: ComicList;
  if (Array.isArray(props.source.list)) {
    t = props.source.list[index];
  } else {
    t = props.source.list;
  }
  props.toPage(props.source, pageNo, t.type);
}

function toDetail(item: ComicItem) {
  props.toDetail(props.source, item);
}

watch(
  () => props.source.list,
  debounce((list: ComicsList | undefined) => {
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
    @rendered="(n) => load(n)"
    @change="(n) => load(n)"
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
      <van-loading v-if="!item.list.length" class="p-2" size="24px" />
      <div v-else class="flex flex-col">
        <MComicCard
          v-for="(comic, index) in item.list"
          :key="source.item.id + index.toString() + comic.id"
          :comic="comic"
          :click="toDetail"
        />
      </div>
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
    <van-loading v-if="!source.list.list.length" class="p-2" size="24px" />
    <div v-else class="flex flex-col">
      <template
        v-for="(comic, index) in source.list.list"
        :key="source.item.id + index.toString() + comic.id"
      >
        <MComicCard :comic="comic" :click="toDetail" />
      </template>
    </div>
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
