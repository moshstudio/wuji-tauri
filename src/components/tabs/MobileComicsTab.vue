<script setup lang="ts">
import type { ComicItem, ComicList, ComicsList } from '@/extensions/comic';
import type { ComicSource } from '@/types';
import { debounce } from 'lodash';
import { nanoid } from 'nanoid';
import { ref, watch } from 'vue';
import MobileComicCard from '../card/comicCards/MobileComicCard.vue';
import SimplePagination from '../pagination/SimplePagination.vue';

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
function load(index: number) {
  if (!source.list)
    return;
  let t: ComicList;
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
  let t: ComicList;
  if (Array.isArray(source.list)) {
    t = source.list[index];
  }
  else {
    t = source.list;
  }
  emit('loadPage', source, pageNo, t.type);
}

function toDetail(item: ComicItem) {
  emit('onDetail', source, item);
}

watch(
  () => source.list,
  debounce((list: ComicsList | undefined) => {
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
          class="px-4 py-1"
        >
          <SimplePagination
            v-model="item.page"
            :page-count="item.totalPage"
            @change="(page: number) => changePage(index, page)"
          />
        </van-row>
        <van-loading v-if="!item.list.length" class="p-2" />
        <div class="flex flex-col">
          <template v-for="comic in item.list" :key="comic.id">
            <MobileComicCard :comic-item="comic" @click="toDetail" />
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
      <template v-for="comic in source.list.list" :key="comic.id">
        <MobileComicCard :comic-item="comic" @click="toDetail" />
      </template>
    </div>
  </template>
</template>

<style scoped lang="less"></style>
