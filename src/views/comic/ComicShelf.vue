<script setup lang="ts">
import type { ComicItemInShelf } from '@/extensions/comic';
import { router } from '@/router';
import { useComicShelfStore, useDisplayStore, useStore } from '@/store';
import { storeToRefs } from 'pinia';
import { showLoadingToast, showToast } from 'vant';
import { onMounted, onUnmounted, ref, watch } from 'vue';
import MobileComicShelf from '../mobileView/comic/ComicShelf.vue';
import WinComicShelf from '../windowsView/comic/ComicShelf.vue';

const store = useStore();
const displayStore = useDisplayStore();
const shelfStore = useComicShelfStore();
const { showComicShelf } = storeToRefs(displayStore);

const activeIndex = ref(0);
async function refreshChapters() {
  await shelfStore.comicRefreshChapters();
}

async function toComic(comic: ComicItemInShelf, chapterId?: string) {
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

  chapterId ||= comic.comic.chapters![0].id;
  showComicShelf.value = false;
  router.push({
    name: 'ComicRead',
    params: {
      comicId: comic.comic.id,
      sourceId: comic.comic.sourceId,
      chapterId,
    },
  });
}
function removeComicFromShelf(comic: ComicItemInShelf, shelfId: string) {
  shelfStore.removeComicFromShelf(comic.comic, shelfId);
}
</script>

<template>
  <PlatformSwitch>
    <template #mobile>
      <MobileComicShelf
        v-model:active-index="activeIndex"
        @refresh-chapters="refreshChapters"
        @to-comic="toComic"
        @remove-comic-from-shelf="removeComicFromShelf"
      />
    </template>
    <template #windows>
      <WinComicShelf
        v-model:active-index="activeIndex"
        @refresh-chapters="refreshChapters"
        @to-comic="toComic"
        @remove-comic-from-shelf="removeComicFromShelf"
      />
    </template>
  </PlatformSwitch>
</template>

<style scoped lang="less"></style>
