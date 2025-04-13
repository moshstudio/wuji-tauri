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

// 书架展示相关
const shelfAnchors = ref([0, Math.round(window.innerHeight)]);
const shelfHeight = ref(0);
function hidePanel() {
  shelfHeight.value = shelfAnchors.value[0];
  showComicShelf.value = false;
}
watch(
  showComicShelf,
  (newValue) => {
    if (newValue) {
      shelfHeight.value = shelfAnchors.value[1];
    }
    else {
      shelfHeight.value = shelfAnchors.value[0];
    }
  },
  { immediate: true },
);
function updateAnchors() {
  shelfAnchors.value[1] = Math.round(window.innerHeight);
  if (showComicShelf.value) {
    shelfHeight.value = shelfAnchors.value[1];
  }
}
onMounted(() => {
  window.addEventListener('resize', updateAnchors);
});
onUnmounted(() => {
  window.removeEventListener('resize', updateAnchors);
});
</script>

<template>
  <PlatformSwitch>
    <template #mobile>
      <MobileComicShelf
        v-model:shelf-anchors="shelfAnchors"
        v-model:shelf-height="shelfHeight"
        @refresh-chapters="refreshChapters"
        @to-comic="toComic"
        @remove-comic-from-shelf="removeComicFromShelf"
        @hide-panel="hidePanel"
      />
    </template>
    <template #windows>
      <WinComicShelf
        v-model:shelf-anchors="shelfAnchors"
        v-model:shelf-height="shelfHeight"
        @refresh-chapters="refreshChapters"
        @to-comic="toComic"
        @remove-comic-from-shelf="removeComicFromShelf"
        @hide-panel="hidePanel"
      />
    </template>
  </PlatformSwitch>
</template>

<style scoped lang="less"></style>
