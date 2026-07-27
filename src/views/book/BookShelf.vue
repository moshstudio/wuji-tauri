<script setup lang="ts">
import type { BookChapter, BookItem, BookItemInShelf, BookSource } from '@wuji-tauri/source-extension';
import { storeToRefs } from 'pinia';
import { showLoadingToast, showToast } from 'vant';
import { computed, ref } from 'vue';
import BookSwitchSourceDialog from '@/components/dialog/BookSwitchSource.vue';
import PlatformSwitch from '@/components/platform/PlatformSwitch.vue';
import { useBookSwitchSource } from '@/hooks/useBookSwitchSource';
import AppBookShelf from '@/layouts/app/book/BookShelf.vue';
import DesktopBookShelf from '@/layouts/desktop/book/BookShelf.vue';
import { router } from '@/router';
import { useBookShelfStore, useStore, useSubscribeSourceStore } from '@/store';
import {
  confirmSwitchSource,
  ensureBookSource,
} from '@/utils/bookSourceAccess';

const store = useStore();
const shelfStore = useBookShelfStore();
const subscribeStore = useSubscribeSourceStore();
const { bookShelf, tabIndex } = storeToRefs(shelfStore);

const isChapterRefreshing = ref(false);
const showRemoveShelfSheet = ref(false);
const pendingChapterId = ref<string>();
const pendingChapter = ref<BookChapter>();

const {
  showSwitchSourceDialog,
  allSourceResults,
  switchTargetBook,
  searchAllSources,
  openSwitchSource,
  switchSource,
  isSearching,
  searchProgress,
} = useBookSwitchSource();

function rememberPendingChapter(
  book: BookItemInShelf,
  chapterId?: string,
) {
  pendingChapterId.value
    = chapterId || book.lastReadChapter?.id || book.book.chapters?.[0]?.id;
  pendingChapter.value
    = book.lastReadChapter
      || book.book.chapters?.find(c => c.id === pendingChapterId.value)
      || (pendingChapterId.value
        ? ({ id: pendingChapterId.value, title: '' } as BookChapter)
        : undefined);
}
const removeShelfSheetActions = computed(() => {
  return shelfStore.bookShelf.map((shelf) => {
    return {
      name: shelf.name,
      subname: `共 ${shelf.books.length || 0} 本书`,
      color: '#E74C3C',
      callback: () => {
        shelfStore.removeBookShelf(shelf.id);
        showRemoveShelfSheet.value = false;
      },
    };
  });
});
async function refreshChapters() {
  isChapterRefreshing.value = true;
  await shelfStore.bookRefreshChapters();
  isChapterRefreshing.value = false;
}

async function continueToBook(source: BookSource, book: BookItemInShelf, chapterId?: string) {
  if (!book.book.chapters?.length) {
    const t = showLoadingToast({
      message: '正在获取章节',
      duration: 0,
      closeOnClick: true,
      closeOnClickOverlay: false,
    });
    const detail = await store.bookDetail(source, book.book, { silent: true });
    t.close();
    if (!detail?.chapters?.length) {
      rememberPendingChapter(book, chapterId);
      if (await confirmSwitchSource('获取章节列表失败，是否换源搜索？'))
        openSwitchSource(book.book);
      return;
    }
    book.book = detail;
  }

  chapterId ||= book.lastReadChapter?.id || book.book.chapters![0].id;
  router.push({
    name: 'BookRead',
    params: {
      bookId: book.book.id,
      sourceId: book.book.sourceId,
      chapterId,
    },
  });
}

async function toBook(book: BookItemInShelf, chapterId?: string) {
  const loaded = await subscribeStore.waitForLoaded();
  if (!loaded) {
    showToast('订阅源加载超时，请稍后重试');
    return;
  }

  const ensured = await ensureBookSource(book.book.sourceId);
  if (!ensured.ok) {
    if (ensured.action === 'switch') {
      rememberPendingChapter(book, chapterId);
      openSwitchSource(book.book);
    }
    return;
  }

  await continueToBook(ensured.source, book, chapterId);
}

async function onSelectSwitchSource(newBookItem: BookItem) {
  await switchSource(newBookItem, {
    chapterId: pendingChapterId.value,
    readingChapter: pendingChapter.value,
    originalChapters: switchTargetBook.value?.chapters,
  });
}

function unreadCount(book: BookItemInShelf): number | undefined {
  if (!book.lastReadChapter || !book.book.chapters?.length)
    return undefined;
  const index = book.book.chapters.findIndex(
    chapter => chapter.id === book.lastReadChapter!.id,
  );
  const num = book.book.chapters.length - index - 1;
  if (num <= 0)
    return undefined;
  return num;
}

function getSource(book: BookItemInShelf): BookSource | undefined {
  const source = store.getBookSource(book.book.sourceId);
  return source;
}
function createShelf(name: string) {
  shelfStore.createBookShelf(name);
}
function removeShelf() {
  showRemoveShelfSheet.value = true;
}

function removeBookFromShelf(book: BookItemInShelf, shelfId: string) {
  shelfStore.removeBookFromShelf(book.book, shelfId);
}
</script>

<template>
  <PlatformSwitch>
    <template #app>
      <AppBookShelf
        v-model:active-index="tabIndex"
        :book-shelfs="bookShelf"
        :is-chapter-refreshing="isChapterRefreshing"
        :refresh-chapters="refreshChapters"
        :unread-count="unreadCount"
        :get-source="getSource"
        :to-book="toBook"
        :create-shelf="createShelf"
        :remove-shelf="removeShelf"
        :remove-book-from-shelf="removeBookFromShelf"
      />
    </template>
    <template #desktop>
      <DesktopBookShelf
        v-model:active-index="tabIndex"
        :book-shelfs="bookShelf"
        :is-chapter-refreshing="isChapterRefreshing"
        :refresh-chapters="refreshChapters"
        :unread-count="unreadCount"
        :get-source="getSource"
        :to-book="toBook"
        :create-shelf="createShelf"
        :remove-shelf="removeShelf"
        :remove-book-from-shelf="removeBookFromShelf"
      />
    </template>
    <van-action-sheet
      v-model:show="showRemoveShelfSheet"
      title="删除书架"
      :actions="removeShelfSheetActions"
      teleport="body"
    />
    <BookSwitchSourceDialog
      v-model:show="showSwitchSourceDialog"
      :book="switchTargetBook"
      :search-result="allSourceResults"
      :searching="isSearching"
      :search-progress="searchProgress"
      :current-chapter="pendingChapter"
      :search="searchAllSources"
      :select="onSelectSwitchSource"
    />
  </PlatformSwitch>
</template>

<style scoped lang="less"></style>
