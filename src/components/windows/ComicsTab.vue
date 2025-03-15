<script setup lang="ts">
import { ComicItem, ComicList, ComicsList } from '@/extensions/comic';
import ComicCard from '@/components/card/comicCards/ComicCard.vue';
import HorizonList from '@/components/HorizonList.vue';
import SimplePagination from '../pagination/SimplePagination.vue';
import { ComicSource } from '@/types';
import { onMounted, ref, watch } from 'vue';
import { debounce } from 'lodash';
import { createCancellableFunction } from '@/utils/cancelableFunction';
import { nanoid } from 'nanoid';
const { source } = defineProps<{
  source: ComicSource;
}>();
const emit = defineEmits<{
  (e: 'onLoad', source: ComicSource, type?: string): void;
  (e: 'loadPage', source: ComicSource, pageNo?: number, type?: string): void;
  (e: 'onDetail', source: ComicSource, item: ComicItem): void;
}>();
const active = ref(0);
const tabKey = ref(nanoid()); // 修改此值来重新渲染组件
const load = (index: number) => {
  if (!source.list) return;
  let t: ComicList;
  if (source.list instanceof Array) {
    t = source.list[index];
  } else {
    t = source.list;
  }
  emit('onLoad', source, t.type);
};

const changePage = (index: number, pageNo?: number) => {
  if (!source.list) return;
  let t: ComicList;
  if (source.list instanceof Array) {
    t = source.list[index];
  } else {
    t = source.list;
  }
  emit('loadPage', source, pageNo, t.type);
};

const toDetail = (item: ComicItem) => {
  emit('onDetail', source, item);
};

onMounted(() => {
  if (source.list && !Array.isArray(source.list)) {
    load(active.value);
  }
});
watch(
  () => source.list,
  debounce((list: ComicsList | undefined) => {
    if (list && Array.isArray(list)) {
      tabKey.value = nanoid();
    }
  }, 500)
);
</script>

<template>
  <template v-if="!source.list"> </template>
  <template v-else-if="Array.isArray(source.list)">
    <van-tabs
      v-model:active="active"
      @rendered="(index) => load(index)"
      shrink
      :key="tabKey"
    >
      <van-tab
        :title="item.type"
        v-for="(item, index) in source.list"
        :key="index"
      >
        <div class="pl-2 pt-1">
          <SimplePagination
            v-model="item.page"
            :page-count="item.totalPage"
            @change="(page: number) => changePage(index, page)"
            v-if="item.page && item.totalPage && item.totalPage > 1"
          ></SimplePagination>
        </div>
        <van-loading class="p-2" v-if="!item.list.length" />
        <HorizonList>
          <template v-for="comic in item.list" :key="comic.id">
            <ComicCard :comic-item="comic" @click="toDetail"> </ComicCard>
          </template>
        </HorizonList>
      </van-tab>
    </van-tabs>
  </template>
  <template v-else>
    <div class="flex pl-2 pt-1">
      <SimplePagination
        v-model="source.list.page"
        :page-count="source.list.totalPage"
        @change="(page: number) => changePage(0, page)"
        v-if="
          source.list.page && source.list.totalPage && source.list.totalPage > 1
        "
      ></SimplePagination>
    </div>
    <HorizonList>
      <template v-for="comic in source.list.list" :key="comic.id">
        <ComicCard :comic-item="comic" @click="toDetail"> </ComicCard>
      </template>
    </HorizonList>
  </template>
</template>

<style scoped lang="less"></style>
