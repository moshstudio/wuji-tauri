<script setup lang="ts">
import type { VideoItem, VideoList, VideosList } from '@/extensions/video';
import type { VideoSource } from '@/types';
import { debounce } from 'lodash';
import { nanoid } from 'nanoid';
import { ref, watch } from 'vue';
import MobileVideoCard from '../card/videoCards/MobileVideoCard.vue';
import SimplePagination from '../pagination/SimplePagination.vue';
import ResponsiveGrid from '../ResponsiveGrid.vue';

const { source } = defineProps<{
  source: VideoSource;
}>();
const emit = defineEmits<{
  (e: 'onLoad', source: VideoSource, type?: string): void;
  (e: 'loadPage', source: VideoSource, pageNo?: number, type?: string): void;
  (e: 'onDetail', source: VideoSource, item: VideoItem): void;
}>();
const active = ref(0);
const tabKey = ref(nanoid()); // 修改此值来重新渲染组件
function load(index: number) {
  if (!source.list)
    return;
  let t: VideoList;
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
  let t: VideoList;
  if (Array.isArray(source.list)) {
    t = source.list[index];
  }
  else {
    t = source.list;
  }
  emit('loadPage', source, pageNo, t.type);
}

function toDetail(item: VideoItem) {
  emit('onDetail', source, item);
}

watch(
  () => source.list,
  debounce((list: VideosList | undefined) => {
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
        <van-loading v-if="!item.list?.length" class="p-2" />
        <ResponsiveGrid :base-cols="2" :gap="2">
          <template v-for="video in item.list" :key="video.id">
            <MobileVideoCard :video-item="video" @click="toDetail" />
          </template>
        </ResponsiveGrid>
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
    <van-loading v-if="!source.list.list?.length" class="p-2" />
    <ResponsiveGrid :base-cols="2">
      <template v-for="video in source.list.list" :key="video.id">
        <MobileVideoCard :video-item="video" @click="toDetail" />
      </template>
    </ResponsiveGrid>
  </template>
</template>

<style scoped lang="less"></style>
