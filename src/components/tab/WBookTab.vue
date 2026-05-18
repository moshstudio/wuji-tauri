<script setup lang="ts">
import type {
  BookItem,
  BookList,
} from '@wuji-tauri/source-extension';
import type { BookSource } from '@/types';
import { WBookCard } from '@wuji-tauri/components';
import { storeToRefs } from 'pinia';
import { ref, watch } from 'vue';
import MPagination from '@/components/pagination/MPagination.vue';
import { useDisplayStore } from '@/store';
import ResponsiveGrid2 from '../grid/ResponsiveGrid2.vue';

const props = defineProps<{
  source: BookSource;
  toPage: (
    source: BookSource,
    pageNo?: number,
    type?: string,
  ) => Promise<any> | void;
  toDetail: (source: BookSource, item: BookItem) => void;
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
  let t: BookList;
  if (Array.isArray(props.source.list)) {
    t = props.source.list[index];
  }
  else {
    t = props.source.list;
  }
  props.toPage(props.source, pageNo, t.type);
}

function toDetail(item: BookItem) {
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
      :title="item.type"
    >
      <div
        v-if="
          (paginationPosition === 'top' || paginationPosition === 'both')
            && item.page
            && item.totalPage
            && item.totalPage > 1
        "
        class="pl-2 pt-1"
      >
        <MPagination
          :page-no="item.page"
          :page-count="item.totalPage"
          :to-page="(page: number) => changePage(index, page)"
        />
      </div>

      <van-loading v-if="item.list.length === 0" class="p-2" size="24px" />
      <ResponsiveGrid2 v-else>
        <template
          v-for="(book, bookIndex) in item.list"
          :key="source.item.id + bookIndex.toString() + book.id"
        >
          <WBookCard :book="book" :click="toDetail" />
        </template>
      </ResponsiveGrid2>

      <div
        v-if="
          (paginationPosition === 'bottom' || paginationPosition === 'both')
            && item.page
            && item.totalPage
            && item.totalPage > 1
        "
        class="pb-1 pl-2"
      >
        <MPagination
          :page-no="item.page"
          :page-count="item.totalPage"
          :to-page="(page: number) => changePage(index, page)"
        />
      </div>
    </van-tab>
  </van-tabs>

  <template v-else>
    <div
      v-if="
        (paginationPosition === 'top' || paginationPosition === 'both')
          && source.list.page
          && source.list.totalPage
          && source.list.totalPage > 1
      "
      class="flex pl-2 pt-1"
    >
      <MPagination
        :page-no="source.list.page"
        :page-count="source.list.totalPage"
        :to-page="(page: number) => changePage(0, page)"
      />
    </div>
    <ResponsiveGrid2>
      <template
        v-for="(book, bookIndex) in source.list.list"
        :key="source.item.id + bookIndex.toString() + book.id"
      >
        <WBookCard :book="book" :click="toDetail" />
      </template>
    </ResponsiveGrid2>
    <div
      v-if="
        (paginationPosition === 'bottom' || paginationPosition === 'both')
          && source.list.page
          && source.list.totalPage
          && source.list.totalPage > 1
      "
      class="flex pb-1 pl-2"
    >
      <MPagination
        :page-no="source.list.page"
        :page-count="source.list.totalPage"
        :to-page="(page: number) => changePage(0, page)"
      />
    </div>
  </template>
</template>

<style scoped lang="less"></style>
