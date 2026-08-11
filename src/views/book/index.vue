<script setup lang="ts">
import type { BookChapter, BookItem } from '@wuji-tauri/source-extension';
import type { BookSource } from '@/types';
import type { BookHistory } from '@/types/book';
import { onMountedOrActivated } from '@vant/use';
import { storeToRefs } from 'pinia';
import { showConfirmDialog, showLoadingToast, showToast } from 'vant';
import { ref, triggerRef } from 'vue';
import BookSwitchSourceDialog from '@/components/dialog/BookSwitchSource.vue';
import PlatformSwitch from '@/components/platform/PlatformSwitch.vue';
import { useBookSwitchSource } from '@/hooks/useBookSwitchSource';
import AppBookList from '@/layouts/app/book/BookList.vue';
import DesktopBookList from '@/layouts/desktop/book/BookList.vue';
import { router } from '@/router';
import {
  useBookShelfStore,
  useDisplayStore,
  useStore,
  useSubscribeSourceStore,
} from '@/store';
import {
  confirmSwitchSource,
  ensureBookSource,
} from '@/utils/bookSourceAccess';
import { createCancellableFunction } from '@/utils/cancelableFunction';

const store = useStore();
const displayStore = useDisplayStore();
const bookShelfStore = useBookShelfStore();
const subscribeStore = useSubscribeSourceStore();
const { bookSources } = storeToRefs(store);
const { bookHistory } = storeToRefs(bookShelfStore);

const searchValue = ref('');
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

function rememberPendingChapter(book: BookHistory) {
  pendingChapterId.value
    = book.lastReadChapter?.id || book.book.chapters?.[0]?.id;
  pendingChapter.value
    = book.lastReadChapter
      || book.book.chapters?.find(c => c.id === pendingChapterId.value)
      || (pendingChapterId.value
        ? ({ id: pendingChapterId.value, title: '' } as BookChapter)
        : undefined);
}

const recommend = createCancellableFunction(
  async (signal: AbortSignal, force: boolean = false) => {
    await Promise.all(
      bookSources.value.map(async (source) => {
        if (!source.list || force) {
          if (signal.aborted)
            return;
          await store.bookRecommendList(source);
        }
      }),
    );
  },
);

// 首次进入本页，或启用源后首次返回时：仅加载尚无内容的源
onMountedOrActivated(async () => {
  await subscribeStore.waitForLoaded(10000, false);
  void recommend();
});

const search = createCancellableFunction(async (signal: AbortSignal) => {
  const keyword = searchValue.value;
  const t = displayStore.showToast();
  if (!keyword) {
    await recommend(true);
    triggerRef(bookSources);
  }
  else {
    await Promise.all(
      bookSources.value.map(async (bookSources) => {
        if (signal.aborted)
          return;
        await store.bookSearch(bookSources, keyword, 1);
      }),
    );
  }
  displayStore.closeToast(t);
});

const toPage = createCancellableFunction(
  async (
    signal: AbortSignal,
    source: BookSource,
    pageNo?: number,
    type?: string,
    showLoading = false,
  ) => {
    const toast = showLoading
      ? showLoadingToast({
          message: '加载中',
          duration: 0,
          closeOnClick: true,
          closeOnClickOverlay: false,
        })
      : null;
    try {
      if (!searchValue.value) {
        await store.bookRecommendList(source, pageNo, type);
      }
      else {
        await store.bookSearch(source, searchValue.value, pageNo);
      }
    }
    finally {
      toast?.close();
    }
  },
);
function toDetail(source: BookSource, item: BookItem) {
  router.push({
    name: 'BookDetail',
    params: {
      bookId: item.id,
      sourceId: source.item.id,
    },
  });
}

async function continueHistoryToBook(
  source: BookSource,
  book: BookHistory,
) {
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
      rememberPendingChapter(book);
      if (await confirmSwitchSource('获取章节列表失败，是否换源搜索？'))
        openSwitchSource(book.book);
      return;
    }
    book.book = detail;
  }

  const chapterId = book.lastReadChapter?.id || book.book.chapters![0].id;
  router.push({
    name: 'BookRead',
    params: {
      bookId: book.book.id,
      sourceId: book.book.sourceId,
      chapterId,
    },
  });
}

async function hisrotyToBook(book: BookHistory) {
  const loaded = await subscribeStore.waitForLoaded();
  if (!loaded) {
    showToast('订阅源加载超时，请稍后重试');
    return;
  }

  const ensured = await ensureBookSource(book.book.sourceId);
  if (!ensured.ok) {
    if (ensured.action === 'switch') {
      rememberPendingChapter(book);
      openSwitchSource(book.book);
    }
    return;
  }

  await continueHistoryToBook(ensured.source, book);
}

async function onSelectSwitchSource(newBookItem: BookItem) {
  await switchSource(newBookItem, {
    chapterId: pendingChapterId.value,
    readingChapter: pendingChapter.value,
    originalChapters: switchTargetBook.value?.chapters,
  });
}

function clearHistory() {
  showConfirmDialog({
    title: '提示',
    message: '确定要清空历史记录吗？',
    confirmButtonText: '确定',
    cancelButtonText: '取消',
  }).then((confirm) => {
    if (confirm === 'confirm') {
      bookShelfStore.clearBookHistory();
    }
  });
}

async function openBaseUrl(source: BookSource) {
  const sc = await store.sourceClass(source.item);
  if (sc && sc.baseUrl) {
    // open(sc.baseUrl);
  }
}
</script>

<template>
  <PlatformSwitch>
    <template #app>
      <AppBookList
        v-model:search-value="searchValue"
        :book-sources="bookSources"
        :book-history="bookHistory"
        :recommend="recommend"
        :search="search"
        :to-page="toPage"
        :to-detail="toDetail"
        :history-to-book="hisrotyToBook"
        :clear-history="clearHistory"
        :open-base-url="openBaseUrl"
      />
    </template>
    <template #desktop>
      <DesktopBookList
        v-model:search-value="searchValue"
        :book-sources="bookSources"
        :book-history="bookHistory"
        :recommend="recommend"
        :search="search"
        :to-page="toPage"
        :to-detail="toDetail"
        :history-to-book="hisrotyToBook"
        :clear-history="clearHistory"
        :open-base-url="openBaseUrl"
      />
    </template>
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
