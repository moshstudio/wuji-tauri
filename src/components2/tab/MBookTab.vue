<script setup lang="ts">
import type {
  BookItem,
  BookList,
  BooksList,
} from '@wuji-tauri/source-extension';
import type { BookSource } from '@/types';
import { debounce } from 'lodash';
import { nanoid } from 'nanoid';
import { ref, watch } from 'vue';
import { MBookCard } from '@wuji-tauri/components/src';
import MPagination from '@/components2/pagination/MPagination.vue';

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
  <div v-if="!source.list"></div>
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
      :key="index"
      :title="item.type"
    >
      <van-row
        v-if="item.page && item.totalPage && item.totalPage > 1"
        class="px-2 py-1"
      >
        <MPagination
          :page-no="item.page"
          :page-count="item.totalPage"
          :to-page="(page: number) => changePage(index, page)"
        />
      </van-row>
      <van-loading v-if="!item.list.length" class="p-2" />
      <div class="flex flex-col">
        <MBookCard
          v-for="book in item.list"
          :key="book.id"
          :book="book"
          :click="toDetail"
        />
      </div>
    </van-tab>
  </van-tabs>

  <template v-else>
    <van-row
      v-if="
        source.list.page && source.list.totalPage && source.list.totalPage > 1
      "
    >
      <MPagination
        :page-no="source.list.page"
        :page-count="source.list.totalPage"
        :to-page="(page: number) => changePage(0, page)"
      />
    </van-row>
    <van-loading v-if="!source.list.list.length" class="p-2" />
    <div class="flex flex-col">
      <template v-for="book in source.list.list" :key="book.id">
        <MBookCard :book="book" :click="toDetail" />
      </template>
    </div>
  </template>
</template>

<style scoped lang="less"></style>
