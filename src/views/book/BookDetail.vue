<script setup lang="ts">
import type { BookChapter, BookItem } from '@wuji-tauri/source-extension';
import type { BookSource } from '@/types';
import { storeToRefs } from 'pinia';

import { showLoadingToast, showToast, showFailToast } from 'vant';
import { computed, onActivated, ref, watch } from 'vue';
import PlatformSwitch from '@/components/platform/PlatformSwitch.vue';
import AppBookDetail from '@/layouts/app/book/BookDetail.vue';
import DesktopBookDetail from '@/layouts/desktop/book/BookDetail.vue';
import { router } from '@/router';
import { useBookShelfStore, useStore, useDownloadStore } from '@/store';
import { usePageDataLoader } from '@/hooks/usePageDataLoader';

const downloadStore = useDownloadStore();

const { bookId, sourceId } = defineProps({
  bookId: String,
  sourceId: String,
});

const store = useStore();
const shelfStore = useBookShelfStore();
const { bookShelf } = storeToRefs(shelfStore);

const book = ref<BookItem>();
const bookSource = ref<BookSource>();
const shouldReload = ref(false);
const inShelf = computed(() => {
  for (const shelf of bookShelf.value) {
    if (shelf.books.some((book) => book.book.id === bookId)) {
      return true;
    }
  }
  return false;
});
const showAddShelfSheet = ref(false);
const addShelfActions = computed(() => {
  return bookShelf.value.map((shelf) => ({
    name: shelf.name,
    subname: `共 ${shelf.books.length || 0} 本书`,
    callback: () => {
      if (book.value) {
        shelfStore.addToBookSelf(book.value, shelf.id);
      }
      showAddShelfSheet.value = false;
    },
  }));
});

const { run: loadPage } = usePageDataLoader({
  onFailed: () => showFailToast('书籍详情加载失败，请重试'),
});

function clear() {
  book.value = undefined;
  bookSource.value = undefined;
  shouldReload.value = false;
}

async function loadData() {
  await loadPage(async (signal) => {
    clear();
    if (!bookId || !sourceId) {
      shouldReload.value = true;
      return false;
    }

    bookSource.value = store.getBookSource(sourceId!);
    if (!bookSource.value) {
      shouldReload.value = true;
      return false;
    }

    book.value = store.getBookItem(bookSource.value, bookId);
    if (!book.value) {
      shouldReload.value = true;
      return false;
    }

    const toast = showLoadingToast({
      message: '书籍加载中',
      duration: 0,
      closeOnClick: true,
      closeOnClickOverlay: false,
    });
    const detail = await store.bookDetail(bookSource.value, book.value);
    toast.close();

    if (signal.aborted) return true;

    if (detail) {
      book.value = detail;
    }
    if (!detail?.chapters?.length) {
      showToast('章节列表为空');
    }

    shouldReload.value = !detail || !detail.chapters?.length;
    return !!detail;
  });
}



function toChapter(_book: BookItem, chapter: BookChapter) {
  router.push({
    name: 'BookRead',
    params: {
      bookId,
      sourceId,
      chapterId: chapter.id,
    },
  });
}

watch(
  [() => bookId, () => sourceId],
  () => {
    loadData();
  },
  { immediate: true },
);

async function onDownload() {
  if (book.value && bookSource.value) {
    if (!book.value.chapters?.length) {
      showToast('章节列表加载中，请稍后');
      return;
    }
    await downloadStore.startBookDownload(book.value, bookSource.value);
    showToast('已加入下载队列');
  }
}

onActivated(() => {
  if (shouldReload.value) {
    loadData();
  }
});
</script>

<template>
  <PlatformSwitch>
    <template #app>
      <AppBookDetail
        :book="book"
        :book-source="bookSource"
        :in-shelf="inShelf"
        :add-to-shelf="() => (showAddShelfSheet = true)"
        :to-chapter="toChapter"
        :on-download="onDownload"
      />
    </template>
    <template #desktop>
      <DesktopBookDetail
        :book="book"
        :book-source="bookSource"
        :in-shelf="inShelf"
        :add-to-shelf="() => (showAddShelfSheet = true)"
        :to-chapter="toChapter"
        :on-download="onDownload"
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
