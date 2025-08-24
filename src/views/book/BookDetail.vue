<script setup lang="ts">
import type { BookChapter, BookItem } from '@wuji-tauri/source-extension';
import type { BookSource } from '@/types';
import PlatformSwitch from '@/components/platform/PlatformSwitch.vue';

import { router } from '@/router';
import { useBookShelfStore, useStore } from '@/store';
import { retryOnFalse } from '@/utils';
import { showLoadingToast, showToast } from 'vant';
import { computed, ref, watch } from 'vue';
import AppBookDetail from '@/layouts/app/book/BookDetail.vue';
import DesktopBookDetail from '@/layouts/desktop/book/BookDetail.vue';
import { useBackStore } from '@/store/backStore';
import { storeToRefs } from 'pinia';

const { bookId, sourceId } = defineProps({
  bookId: String,
  sourceId: String,
});

const store = useStore();
const backStore = useBackStore();
const shelfStore = useBookShelfStore();
const { bookShelf } = storeToRefs(shelfStore);

const book = ref<BookItem>();
const bookSource = ref<BookSource>();
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

const clear = () => {
  book.value = undefined;
  bookSource.value = undefined;
};

const loadData = retryOnFalse({ onFailed: backStore.back })(async () => {
  clear();
  if (!bookId || !sourceId) {
    return false;
  }

  bookSource.value = store.getBookSource(sourceId!);
  if (!bookSource.value) {
    showToast('源不存在或未启用');
    return false;
  }

  book.value = store.getBookItem(bookSource.value, bookId);
  if (!book.value) {
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
  if (detail) {
    book.value = detail;
  }
  if (!detail?.chapters) {
    showToast('章节列表为空');
  }
  return true;
});

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
      />
    </template>
    <template #desktop>
      <DesktopBookDetail
        :book="book"
        :book-source="bookSource"
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
