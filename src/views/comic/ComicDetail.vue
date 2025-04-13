<script setup lang="ts">
import type { ComicChapter, ComicItem } from '@/extensions/comic';
import type { ComicSource } from '@/types';
import PlatformSwitch from '@/components/PlatformSwitch.vue';

import { router } from '@/router';
import { useStore } from '@/store';
import { retryOnFalse, sleep } from '@/utils';
import { showLoadingToast, showToast } from 'vant';
import { onActivated, ref, triggerRef, watch } from 'vue';
import MobileComicDetail from '../mobileView/comic/ComicDetail.vue';
import WinComicDetail from '../windowsView/comic/ComicDetail.vue';

const { comicId, sourceId } = defineProps({
  comicId: String,
  sourceId: String,
});

const store = useStore();
const comicSource = ref<ComicSource>();
const comic = ref<ComicItem>();
const content = ref<HTMLElement>();
const shouldLoad = ref(true);
const isAscending = ref(true);
function back() {
  shouldLoad.value = true;
  router.push({ name: 'Comic' });
}

const loadData = retryOnFalse({ onFailed: back })(async () => {
  comic.value = undefined;
  if (!comicId || !sourceId) {
    return false;
  }

  const source = store.getComicSource(sourceId!);
  if (!source) {
    showToast('源不存在或未启用');
    return false;
  }
  comicSource.value = source;

  const item = await store.getComicItem(source, comicId);
  if (!item) {
    return false;
  }
  comic.value = item;

  const toast = showLoadingToast({
    message: '漫画加载中',
    duration: 0,
    closeOnClick: true,
    closeOnClickOverlay: false,
  });
  const detail = await store.comicDetail(source!, comic.value!);
  toast.close();
  if (detail) {
    comic.value = detail;
  }
  if (!detail?.chapters) {
    showToast('章节列表为空');
  }
  if (content.value)
    content.value.scrollTop = 0;
  triggerRef(comic);
  return true;
});

function toChapter(chapter: ComicChapter) {
  router.push({
    name: 'ComicRead',
    params: {
      comicId,
      sourceId,
      chapterId: chapter.id,
    },
  });
}

watch([() => comicId, () => sourceId], () => {
  shouldLoad.value = false; // watch这里优先load
  loadData();
});
onActivated(async () => {
  await sleep(200);
  if (shouldLoad.value) {
    shouldLoad.value = false;
    loadData();
  }
});
</script>

<template>
  <PlatformSwitch>
    <template #mobile>
      <MobileComicDetail
        v-model:comic="comic"
        v-model:comic-source="comicSource"
        v-model:content="content"
        v-model:is-ascending="isAscending"
        @back="back"
        @load-data="loadData"
        @to-chapter="toChapter"
      />
    </template>
    <template #windows>
      <WinComicDetail
        v-model:comic="comic"
        v-model:comic-source="comicSource"
        v-model:content="content"
        v-model:is-ascending="isAscending"
        @back="back"
        @load-data="loadData"
        @to-chapter="toChapter"
      />
    </template>
  </PlatformSwitch>
</template>

<style scoped lang="less"></style>
