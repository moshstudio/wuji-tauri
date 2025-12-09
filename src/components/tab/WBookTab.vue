<script setup lang="ts">
import type {
  BookItem,
  BookList,
  BooksList,
} from '@wuji-tauri/source-extension';
import type { BookSource } from '@/types';
import { WBookCard } from '@wuji-tauri/components/src';
import { debounce } from 'lodash';
import { nanoid } from 'nanoid';
import { ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import MPagination from '@/components/pagination/MPagination.vue';
import ResponsiveGrid2 from '../grid/ResponsiveGrid2.vue';
import { useDisplayStore } from '@/store';

const displayStore = useDisplayStore();
const { paginationPosition } = storeToRefs(displayStore);

const props = defineProps<{
  source: BookSource;
  toPage: (source: BookSource, pageNo?: number, type?: string) => void;
  toDetail: (source: BookSource, item: BookItem) => void;
}>();

const active = ref(0);
const tabKey = ref(nanoid()); // 修改此值来重新渲染组件
function load(index: number) {
  if (!props.source.list) return;
  let t: BookList;
  if (Array.isArray(props.source.list)) {
    t = props.source.list[index];
  } else {
    t = props.source.list;
  }
  props.toPage(props.source, 1, t.type);
}

function changePage(index: number, pageNo?: number) {
  if (!props.source.list) return;
  let t: BookList;
  if (Array.isArray(props.source.list)) {
    t = props.source.list[index];
  } else {
    t = props.source.list;
  }
  props.toPage(props.source, pageNo, t.type);
}

function toDetail(item: BookItem) {
  props.toDetail(props.source, item);
}

watch(
  () => props.source.list,
  debounce((list: BooksList | undefined) => {
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
      <div
        v-if="
          (paginationPosition === 'top' || paginationPosition === 'both') &&
          item.page &&
          item.totalPage &&
          item.totalPage > 1
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
          v-for="(book, index) in item.list"
          :key="source.item.id + index.toString() + book.id"
        >
          <WBookCard :book="book" :click="toDetail" />
        </template>
      </ResponsiveGrid2>

      <div
        v-if="
          (paginationPosition === 'bottom' || paginationPosition === 'both') &&
          item.page &&
          item.totalPage &&
          item.totalPage > 1
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
        (paginationPosition === 'top' || paginationPosition === 'both') &&
        source.list.page &&
        source.list.totalPage &&
        source.list.totalPage > 1
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
        v-for="(book, index) in source.list.list"
        :key="source.item.id + index.toString() + book.id"
      >
        <WBookCard :book="book" :click="toDetail" />
      </template>
    </ResponsiveGrid2>
    <div
      v-if="
        (paginationPosition === 'bottom' || paginationPosition === 'both') &&
        source.list.page &&
        source.list.totalPage &&
        source.list.totalPage > 1
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
