<script setup lang="ts">
import type { ComicChapter, ComicItem } from '@wuji-tauri/source-extension';
import type { ComicSource } from '@/types';
import { storeToRefs } from 'pinia';
import { showLoadingToast, showToast } from 'vant';
import { computed, onActivated, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import PlatformSwitch from '@/components/platform/PlatformSwitch.vue';
import AppComicDetail from '@/layouts/app/comic/ComicDetail.vue';
import DesktopComicDetail from '@/layouts/desktop/comic/ComicDetail.vue';
import { router } from '@/router';
import { useComicShelfStore, useStore } from '@/store';
import { useBackStore } from '@/store/backStore';
import { retryOnFalse } from '@/utils';

const { comicId, sourceId } = defineProps({
  comicId: String,
  sourceId: String,
});

const route = useRoute();
const store = useStore();
const backStore = useBackStore();
const shelfStore = useComicShelfStore();
const { comicShelf } = storeToRefs(shelfStore);

const comic = ref<ComicItem>();
const comicSource = ref<ComicSource>();
const shouldReload = ref(false);
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

const loadData = retryOnFalse({
  onFailed: () => {
    if (route.name === 'ComicDetail') {
      backStore.back();
    }
  },
})(async () => {
  comic.value = undefined;
  comicSource.value = undefined;
  shouldReload.value = false;

  if (!comicId || !sourceId) {
    shouldReload.value = true;
    return false;
  }

  comicSource.value = store.getComicSource(sourceId);
  if (!comicSource.value) {
    showToast('源不存在或未启用');
    shouldReload.value = true;
    return false;
  }

  comic.value = store.getComicItem(comicSource.value, comicId);
  if (!comic.value) {
    shouldReload.value = true;
    return false;
  }

  const toast = showLoadingToast({
    message: '漫画加载中',
    duration: 0,
    closeOnClick: true,
    closeOnClickOverlay: false,
  });
  const detail = await store.comicDetail(comicSource.value, comic.value);
  toast.close();

  if (detail) {
    comic.value = detail;
  }
  if (!detail?.chapters?.length) {
    showToast('章节列表为空');
  }

  shouldReload.value = !detail || !detail.chapters?.length;
  return !!detail;
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

onActivated(() => {
  if (shouldReload.value) {
    loadData();
  }
});
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
      v-model:show="showAddShelfSheet"
      title="添加到书架"
      :actions="addShelfActions"
    />
  </PlatformSwitch>
</template>

<style scoped lang="less"></style>
