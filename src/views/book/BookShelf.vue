<script setup lang="ts">
import type { BookItemInShelf } from '@/extensions/book';
import { router } from '@/router';
import { useBookShelfStore, useDisplayStore, useStore } from '@/store';
import { storeToRefs } from 'pinia';
import { showLoadingToast, showToast } from 'vant';
import { onMounted, onUnmounted, ref, watch } from 'vue';
import MobileBookShelf from '../mobileView/book/BookShelf.vue';
import WinBookShelf from '../windowsView/book/BookShelf.vue';

const store = useStore();
const displayStore = useDisplayStore();
const shelfStore = useBookShelfStore();
const { showBookShelf } = storeToRefs(displayStore);

const activeIndex = ref(0);
async function refreshChapters() {
  await shelfStore.bookRefreshChapters();
}

async function toBook(book: BookItemInShelf, chapterId?: string) {
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

  chapterId ||= book.book.chapters![0].id;
  if (!displayStore.isAndroid) {
    showBookShelf.value = false;
  }
  router.push({
    name: 'BookRead',
    params: {
      bookId: book.book.id,
      sourceId: book.book.sourceId,
      chapterId,
    },
  });
}
function removeBookFromShelf(book: BookItemInShelf, shelfId: string) {
  shelfStore.removeBookFromShelf(book.book, shelfId);
}
</script>

<template>
  <PlatformSwitch>
    <template #mobile>
      <MobileBookShelf
        v-model:active-index="activeIndex"
        @refresh-chapters="refreshChapters"
        @to-book="toBook"
        @remove-book-from-shelf="removeBookFromShelf"
      />
    </template>
    <template #windows>
      <WinBookShelf
        v-model:active-index="activeIndex"
        @refresh-chapters="refreshChapters"
        @to-book="toBook"
        @remove-book-from-shelf="removeBookFromShelf"
      />
    </template>
  </PlatformSwitch>
</template>

<style scoped lang="less"></style>
