<script setup lang="ts">
import type { ComicChapter, ComicItem } from '@wuji-tauri/source-extension';
import type { ComicSource } from '@/types';
import PlatformSwitch from '@/components/platform/PlatformSwitch.vue';
import AppComicDetail from '@/layouts/app/comic/ComicDetail.vue';
import DesktopComicDetail from '@/layouts/desktop/comic/ComicDetail.vue';
import { router } from '@/router';
import { useComicShelfStore, useDisplayStore, useStore } from '@/store';
import { retryOnFalse, sleep } from '@/utils';
import { showLoadingToast, showToast } from 'vant';
import { computed, onActivated, onMounted, ref, triggerRef, watch } from 'vue';
import { useBackStore } from '@/store/backStore';
import { storeToRefs } from 'pinia';

const { comicId, sourceId } = defineProps({
  comicId: String,
  sourceId: String,
});

const store = useStore();
const backStore = useBackStore();
const shelfStore = useComicShelfStore();
const { comicShelf } = storeToRefs(shelfStore);

const comic = ref<ComicItem>();
const comicSource = ref<ComicSource>();
const inShelf = computed(() => {
  for (const shelf of comicShelf.value) {
    if (shelf.comics.some((comic) => comic.comic.id === comicId)) {
      return true;
    }
  }
  return false;
});
const showAddShelfSheet = ref(false);
const addShelfActions = computed(() => {
  return comicShelf.value.map((shelf) => ({
    name: shelf.name,
    subname: `共 ${shelf.comics.length || 0} 本漫画`,
    callback: () => {
      if (comic.value) {
        shelfStore.addToComicSelf(comic.value, shelf.id);
      }
      showAddShelfSheet.value = false;
    },
  }));
});

const loadData = retryOnFalse({ onFailed: backStore.back })(async () => {
  comic.value = undefined;
  comicSource.value = undefined;
  if (!comicId || !sourceId) {
    return false;
  }

  comicSource.value = store.getComicSource(sourceId);
  if (!comicSource.value) {
    showToast('源不存在或未启用');
    return false;
  }

  comic.value = store.getComicItem(comicSource.value, comicId);
  if (!comic.value) {
    return false;
  }

  const toast = showLoadingToast({
    message: '漫画加载中',
    duration: 0,
    closeOnClick: true,
    closeOnClickOverlay: false,
  });
  const detail = await store.comicDetail(comicSource.value, comic.value);
  console.log(detail);

  toast.close();
  if (detail) {
    comic.value = detail;
  }
  if (!detail?.chapters) {
    showToast('章节列表为空');
  }
  return true;
});

function toChapter(_comic: ComicItem, chapter: ComicChapter) {
  router.push({
    name: 'ComicRead',
    params: {
      comicId,
      sourceId,
      chapterId: chapter.id,
    },
  });
}

watch(
  [() => comicId, () => sourceId],
  () => {
    loadData();
  },
  { immediate: true },
);
</script>

<template>
  <PlatformSwitch>
    <template #app>
      <AppComicDetail
        :comic="comic"
        :comic-source="comicSource"
        :in-shelf="inShelf"
        :add-to-shelf="() => (showAddShelfSheet = true)"
        :to-chapter="toChapter"
      />
    </template>
    <template #desktop>
      <DesktopComicDetail
        :comic="comic"
        :comic-source="comicSource"
        :in-shelf="inShelf"
        :add-to-shelf="() => (showAddShelfSheet = true)"
        :to-chapter="toChapter"
      />
    </template>
    <van-action-sheet
      title="添加到书架"
      v-model:show="showAddShelfSheet"
      :actions="addShelfActions"
    ></van-action-sheet>
  </PlatformSwitch>
</template>

<style scoped lang="less"></style>
