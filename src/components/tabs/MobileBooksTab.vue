<script setup lang="ts">
import type { BookItem, BookList, BooksList } from '@/extensions/book';
import type { BookSource } from '@/types';
import { debounce } from 'lodash';
import { nanoid } from 'nanoid';
import { ref, watch } from 'vue';
import MobileBookCard from '../card/bookCards/MobileBookCard.vue';
import SimplePagination from '../pagination/SimplePagination.vue';

const { source } = defineProps<{
  source: BookSource;
}>();
const emit = defineEmits<{
  (e: 'onLoad', source: BookSource, type?: string): void;
  (e: 'loadPage', source: BookSource, pageNo?: number, type?: string): void;
  (e: 'onDetail', source: BookSource, item: BookItem): void;
}>();
const active = ref(0);
const tabKey = ref(nanoid()); // 修改此值来重新渲染组件
function load(index: number) {
  if (!source.list)
    return;
  let t: BookList;
  if (Array.isArray(source.list)) {
    t = source.list[index];
  }
  else {
    t = source.list;
  }
  emit('onLoad', source, t.type);
}

function changePage(index: number, pageNo?: number) {
  if (!source.list)
    return;
  let t: BookList;
  if (Array.isArray(source.list)) {
    t = source.list[index];
  }
  else {
    t = source.list;
  }
  emit('loadPage', source, pageNo, t.type);
}

function toDetail(item: BookItem) {
  emit('onDetail', source, item);
}

watch(
  () => source.list,
  debounce((list: BooksList | undefined) => {
    if (list && Array.isArray(list)) {
      tabKey.value = nanoid();
    }
  }, 500),
);
</script>

<template>
  <template v-if="!source.list" />
  <template v-else-if="Array.isArray(source.list)">
    <van-tabs
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
          <SimplePagination
            v-model="item.page"
            :page-count="item.totalPage"
            @change="(page: number) => changePage(index, page)"
          />
        </van-row>
        <van-loading v-if="!item.list.length" class="p-2" />
        <div class="flex flex-col">
          <template v-for="book in item.list" :key="book.id">
            <MobileBookCard :book-item="book" @click="toDetail" />
          </template>
        </div>
      </van-tab>
    </van-tabs>
  </template>
  <template v-else>
    <van-row
      v-if="
        source.list.page && source.list.totalPage && source.list.totalPage > 1
      "
    >
      <SimplePagination
        v-model="source.list.page"
        :page-count="source.list.totalPage"
        @change="(page: number) => changePage(0, page)"
      />
    </van-row>
    <van-loading v-if="!source.list.list.length" class="p-2" />
    <div class="flex flex-col">
      <template v-for="book in source.list.list" :key="book.id">
        <MobileBookCard :book-item="book" @click="toDetail" />
      </template>
    </div>
  </template>
</template>

<style scoped lang="less"></style>
