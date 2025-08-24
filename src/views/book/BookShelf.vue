<script setup lang="ts">
import type { BookItemInShelf, BookSource } from '@wuji-tauri/source-extension';
import { router } from '@/router';
import { useBookShelfStore, useStore } from '@/store';
import { storeToRefs } from 'pinia';
import { showLoadingToast, showToast } from 'vant';
import { computed, ref } from 'vue';
import PlatformSwitch from '@/components/platform/PlatformSwitch.vue';
import AppBookShelf from '@/layouts/app/book/BookShelf.vue';
import DesktopBookShelf from '@/layouts/desktop/book/BookShelf.vue';

const store = useStore();
const shelfStore = useBookShelfStore();
const { bookShelf } = storeToRefs(shelfStore);

const activeIndex = ref(0);
const isChapterRefreshing = ref(false);
const showRemoveShelfSheet = ref(false);

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
  router.push({
    name: 'BookRead',
    params: {
      bookId: book.book.id,
      sourceId: book.book.sourceId,
      chapterId,
    },
  });
}

function unreadCount(book: BookItemInShelf): number | undefined {
  if (!book.lastReadChapter || !book.book.chapters?.length) return undefined;
  const index = book.book.chapters.findIndex(
    (chapter) => chapter.id === book.lastReadChapter!.id,
  );
  const num = book.book.chapters.length - index - 1;
  if (num <= 0) return undefined;
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
        v-model:active-index="activeIndex"
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
        v-model:active-index="activeIndex"
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
      title="删除书架"
      v-model:show="showRemoveShelfSheet"
      :actions="removeShelfSheetActions"
      teleport="body"
    ></van-action-sheet>
  </PlatformSwitch>
</template>

<style scoped lang="less"></style>
