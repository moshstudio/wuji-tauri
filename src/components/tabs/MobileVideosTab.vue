<script setup lang="ts">
import _ from 'lodash';
import { VideoItem, VideoList, VideosList } from '@/extensions/video';
import MobileVideoCard from '../card/videoCards/MobileVideoCard.vue';
import SimplePagination from '../pagination/SimplePagination.vue';
import ResponsiveGrid from '../ResponsiveGrid.vue';
import { VideoSource } from '@/types';
import { onMounted, ref, watch } from 'vue';
import { debounce } from 'lodash';
import { nanoid } from 'nanoid';
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
const load = (index: number) => {
  if (!source.list) return;
  let t: VideoList;
  if (source.list instanceof Array) {
    t = source.list[index];
  } else {
    t = source.list;
  }
  emit('onLoad', source, t.type);
};

const changePage = (index: number, pageNo?: number) => {
  if (!source.list) return;
  let t: VideoList;
  if (source.list instanceof Array) {
    t = source.list[index];
  } else {
    t = source.list;
  }
  emit('loadPage', source, pageNo, t.type);
};

const toDetail = (item: VideoItem) => {
  emit('onDetail', source, item);
};

watch(
  () => source.list,
  debounce((list: VideosList | undefined) => {
    if (list && Array.isArray(list)) {
      tabKey.value = nanoid();
    }
  }, 500)
);
</script>

<template>
  <template v-if="!source.list"></template>
  <template v-else-if="Array.isArray(source.list)">
    <van-tabs
      v-model:active="active"
      @rendered="(index) => load(index)"
      shrink
      animated
      :key="tabKey"
    >
      <van-tab
        :title="item.type"
        v-for="(item, index) in source.list"
        :key="index"
      >
        <van-row
          v-if="item.page && item.totalPage && item.totalPage > 1"
          class="px-2 py-1"
        >
          <SimplePagination
            v-model="item.page"
            :page-count="item.totalPage"
            @change="(page: number) => changePage(index, page)"
          ></SimplePagination>
        </van-row>
        <van-loading class="p-2" v-if="!item.list?.length" />
        <ResponsiveGrid :base-cols="2" :gap="2">
          <template v-for="video in item.list" :key="video.id">
            <MobileVideoCard :video-item="video" @click="toDetail">
            </MobileVideoCard>
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
      ></SimplePagination>
    </van-row>
    <van-loading class="p-2" v-if="!source.list.list?.length" />
    <ResponsiveGrid :base-cols="2">
      <template v-for="video in source.list.list" :key="video.id">
        <MobileVideoCard :video-item="video" @click="toDetail">
        </MobileVideoCard>
      </template>
    </ResponsiveGrid>
  </template>
</template>

<style scoped lang="less"></style>
