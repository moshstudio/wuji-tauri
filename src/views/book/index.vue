<script setup lang="ts">
import type { BookItem } from '@wuji-tauri/source-extension';
import type { BookSource } from '@/types';
import { storeToRefs } from 'pinia';
import { ref, triggerRef } from 'vue';
import PlatformSwitch from '@/components/platform/PlatformSwitch.vue';
import AppBookList from '@/layouts/app/book/BookList.vue';
import DesktopBookList from '@/layouts/desktop/book/BookList.vue';
import { router } from '@/router';
import { useBookShelfStore, useDisplayStore, useStore } from '@/store';
import { createCancellableFunction } from '@/utils/cancelableFunction';
import { BookHistory } from '@/types/book';
import { showConfirmDialog, showLoadingToast, showToast } from 'vant';

const store = useStore();
const displayStore = useDisplayStore();
const bookShelfStore = useBookShelfStore();
const { bookSources } = storeToRefs(store);
const { bookHistory } = storeToRefs(bookShelfStore);

const searchValue = ref('');

const recommend = createCancellableFunction(
  async (signal: AbortSignal, force: boolean = false) => {
    await Promise.all(
      bookSources.value.map(async (source) => {
        if (!source.list || force) {
          if (signal.aborted) return;
          await store.bookRecommendList(source);
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
    triggerRef(bookSources);
  } else {
    await Promise.all(
      bookSources.value.map(async (bookSources) => {
        if (signal.aborted) return;
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
  ) => {
    if (!searchValue.value) {
      await store.bookRecommendList(source, pageNo, type);
    } else {
      await store.bookSearch(source, searchValue.value, pageNo);
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

async function hisrotyToBook(book: BookHistory) {
  const source = store.getBookSource(book.book.sourceId);
  if (!source) {
    showToast('源不存在或未启用');
    return;
  }
  if (!book.book.chapters?.length) {
    // 章节为空，获取章节
    const t = showLoadingToast({
      message: '正在获取章节',
      duration: 0,
      closeOnClick: true,
      closeOnClickOverlay: false,
    });
    const detail = await store.bookDetail(source, book.book);
    t.close();
    if (!detail?.chapters?.length) {
      showToast('章节列表为空');
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

function clearHistory() {
  showConfirmDialog({
    title: '提示',
    message: '确定要清空历史记录吗？',
    confirmButtonText: '确定',
    cancelButtonText: '取消',
  }).then((confirm) => {
    if (confirm) {
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
  </PlatformSwitch>
</template>

<style scoped lang="less"></style>
