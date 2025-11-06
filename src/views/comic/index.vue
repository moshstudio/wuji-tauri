<script setup lang="ts">
import type { ComicItem } from '@wuji-tauri/source-extension';
import type { ComicSource } from '@/types';
import { storeToRefs } from 'pinia';
import { ref, triggerRef } from 'vue';
import PlatformSwitch from '@/components/platform/PlatformSwitch.vue';
import AppComicList from '@/layouts/app/comic/ComicList.vue';
import DesktopComicList from '@/layouts/desktop/comic/ComicList.vue';
import { router } from '@/router';
import { useComicShelfStore, useDisplayStore, useStore } from '@/store';
import { createCancellableFunction } from '@/utils/cancelableFunction';
import { ComicHistory } from '@/types/comic';
import { showConfirmDialog, showLoadingToast, showToast } from 'vant';

const store = useStore();
const displayStore = useDisplayStore();
const comicShelfStore = useComicShelfStore();
const { comicHistory } = storeToRefs(comicShelfStore);
const { comicSources } = storeToRefs(store);

const searchValue = ref('');

const recommend = createCancellableFunction(
  async (signal: AbortSignal, force: boolean = false) => {
    await Promise.all(
      comicSources.value.map(async (source) => {
        if (!source.list || force) {
          if (signal.aborted) return;
          await store.comicRecommendList(source);
        }
      }),
    );
  },
);

const search = createCancellableFunction(async (signal: AbortSignal) => {
  const keyword = searchValue.value;
  const t = displayStore.showToast();
  if (!keyword) {
    await recommend(true);
    triggerRef(comicSources);
  } else {
    await Promise.all(
      comicSources.value.map(async (comicSources) => {
        if (signal.aborted) return;
        await store.comicSearch(comicSources, keyword, 1);
      }),
    );
  }
  displayStore.closeToast(t);
});

const toPage = createCancellableFunction(
  async (
    signal: AbortSignal,
    source: ComicSource,
    pageNo?: number,
    type?: string,
  ) => {
    if (!searchValue.value) {
      await store.comicRecommendList(source, pageNo, type);
    } else {
      await store.comicSearch(source, searchValue.value, pageNo);
    }
  },
);
function toDetail(source: ComicSource, item: ComicItem) {
  router.push({
    name: 'ComicDetail',
    params: {
      comicId: item.id,
      sourceId: source.item.id,
    },
  });
}

async function hisrotyToComic(comic: ComicHistory) {
  const source = store.getComicSource(comic.comic.sourceId);
  if (!source) {
    showToast('源不存在或未启用');
    return;
  }
  if (!comic.comic.chapters?.length) {
    // 章节为空，获取章节
    const t = showLoadingToast({
      message: '正在获取章节',
      duration: 0,
      closeOnClick: true,
      closeOnClickOverlay: false,
    });
    const detail = await store.comicDetail(source, comic.comic);
    t.close();
    if (!detail?.chapters?.length) {
      showToast('章节列表为空');
      return;
    }
    comic.comic = detail;
  }

  const chapterId = comic.lastReadChapter?.id || comic.comic.chapters![0].id;
  router.push({
    name: 'ComicRead',
    params: {
      comicId: comic.comic.id,
      sourceId: comic.comic.sourceId,
      chapterId,
    },
  });
}

function clearHistory() {
  showConfirmDialog({
    title: '提示',
    message: '确定要清空历史记录吗？',
    confirmButtonText: '确定',
    cancelButtonText: '取消',
  }).then((confirm) => {
    if (confirm) {
      comicShelfStore.clearComicHistory();
    }
  });
}

async function openBaseUrl(source: ComicSource) {
  const sc = await store.sourceClass(source.item);
  if (sc && sc.baseUrl) {
    // open(sc.baseUrl);
  }
}
</script>

<template>
  <PlatformSwitch>
    <template #app>
      <AppComicList
        v-model:search-value="searchValue"
        :comic-sources="comicSources"
        :comic-history="comicHistory"
        :recommend="recommend"
        :search="search"
        :to-page="toPage"
        :to-detail="toDetail"
        :history-to-comic="hisrotyToComic"
        :clear-history="clearHistory"
        :open-base-url="openBaseUrl"
      />
    </template>
    <template #desktop>
      <DesktopComicList
        v-model:search-value="searchValue"
        :comic-sources="comicSources"
        :comic-history="comicHistory"
        :recommend="recommend"
        :search="search"
        :to-page="toPage"
        :to-detail="toDetail"
        :history-to-comic="hisrotyToComic"
        :clear-history="clearHistory"
        :open-base-url="openBaseUrl"
      />
    </template>
  </PlatformSwitch>
</template>

<style scoped lang="less"></style>
