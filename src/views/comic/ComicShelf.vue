<script setup lang="ts">
import type {
  ComicItemInShelf,
  ComicSource,
} from '@wuji-tauri/source-extension';
import { storeToRefs } from 'pinia';
import { showLoadingToast, showToast } from 'vant';
import { computed, ref } from 'vue';
import PlatformSwitch from '@/components/platform/PlatformSwitch.vue';
import AppComicShelf from '@/layouts/app/comic/ComicShelf.vue';
import DesktopComicShelf from '@/layouts/desktop/comic/ComicShelf.vue';
import { router } from '@/router';
import { useComicShelfStore, useStore } from '@/store';

const store = useStore();
const shelfStore = useComicShelfStore();
const { comicShelf } = storeToRefs(shelfStore);

const activeIndex = ref(0);
const isChapterRefreshing = ref(false);
const showRemoveShelfSheet = ref(false);

const removeShelfSheetActions = computed(() => {
  return shelfStore.comicShelf.map((shelf) => {
    return {
      name: shelf.name,
      subname: `共 ${shelf.comics.length || 0} 本漫画`,
      color: '#E74C3C',
      callback: () => {
        shelfStore.removeComicShelf(shelf.id);
        showRemoveShelfSheet.value = false;
      },
    };
  });
});
async function refreshChapters() {
  isChapterRefreshing.value = true;
  await shelfStore.comicRefreshChapters();
  isChapterRefreshing.value = false;
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
  router.push({
    name: 'ComicRead',
    params: {
      comicId: comic.comic.id,
      sourceId: comic.comic.sourceId,
      chapterId,
    },
  });
}

function unreadCount(comic: ComicItemInShelf): number | undefined {
  if (!comic.lastReadChapter || !comic.comic.chapters?.length) return undefined;
  const index = comic.comic.chapters.findIndex(
    (chapter) => chapter.id === comic.lastReadChapter!.id,
  );
  const num = comic.comic.chapters.length - index - 1;
  if (num <= 0) return undefined;
  return num;
}

function getSource(comic: ComicItemInShelf): ComicSource | undefined {
  const source = store.getComicSource(comic.comic.sourceId);
  return source;
}
function createShelf(name: string) {
  shelfStore.createComicShelf(name);
}
function removeShelf() {
  showRemoveShelfSheet.value = true;
}

function removeComicFromShelf(comic: ComicItemInShelf, shelfId: string) {
  shelfStore.removeComicFromShelf(comic.comic, shelfId);
}
</script>

<template>
  <PlatformSwitch>
    <template #app>
      <AppComicShelf
        v-model:active-index="activeIndex"
        :comic-shelfs="comicShelf"
        :is-chapter-refreshing="isChapterRefreshing"
        :refresh-chapters="refreshChapters"
        :unread-count="unreadCount"
        :get-source="getSource"
        :to-comic="toComic"
        :create-shelf="createShelf"
        :remove-shelf="removeShelf"
        :remove-comic-from-shelf="removeComicFromShelf"
      />
    </template>
    <template #desktop>
      <DesktopComicShelf
        v-model:active-index="activeIndex"
        :comic-shelfs="comicShelf"
        :is-chapter-refreshing="isChapterRefreshing"
        :refresh-chapters="refreshChapters"
        :unread-count="unreadCount"
        :get-source="getSource"
        :to-comic="toComic"
        :create-shelf="createShelf"
        :remove-shelf="removeShelf"
        :remove-comic-from-shelf="removeComicFromShelf"
      />
    </template>
    <van-action-sheet
      v-model:show="showRemoveShelfSheet"
      title="删除书架"
      :actions="removeShelfSheetActions"
      teleport="body"
    />
  </PlatformSwitch>
</template>

<style scoped lang="less"></style>
