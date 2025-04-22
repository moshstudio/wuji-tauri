<script setup lang="ts">
import type { BookItemInShelf } from '@/extensions/book';
import WinShelfBookCard from '@/components/card/bookCards/WinShelfBookCard.vue';
import ResponsiveGrid2 from '@/components/ResponsiveGrid2.vue';
import AddBookShelfDialog from '@/components/windows/dialogs/AddBookShelf.vue';
import DeleteBookShelfDialog from '@/components/windows/dialogs/RemoveBookShelf.vue';
import { useBookShelfStore, useDisplayStore, useStore } from '@/store';
import _ from 'lodash';
import { storeToRefs } from 'pinia';

const emit = defineEmits<{
  (e: 'refreshChapters'): void;
  (e: 'toBook', book: BookItemInShelf, chapterId?: string): void;
  (e: 'removeBookFromShelf', book: BookItemInShelf, shelfId: string): void;
}>();

const activeIndex = defineModel('activeIndex', {
  type: Number,
  required: true,
});

const displayStore = useDisplayStore();
const shelfStore = useBookShelfStore();
const { bookShelf, bookChapterRefreshing } = storeToRefs(shelfStore);
const { showBookShelf } = storeToRefs(displayStore);

function lastChapter(book: BookItemInShelf) {
  if (!book.book.chapters?.length) return null;
  return book.book.chapters[book.book.chapters.length - 1];
}
// 计算还有多少章没读
function unreadCount(book: BookItemInShelf): number | undefined {
  if (!book.lastReadChapter || !book.book.chapters?.length) return undefined;
  const index = book.book.chapters.findIndex(
    (chapter) => chapter.id === book.lastReadChapter!.id,
  );
  const num = book.book.chapters.length - index - 1;
  if (num <= 0) return undefined;
  return num;
}
function sourceName(book: BookItemInShelf) {
  const store = useStore();
  const source = store.getBookSource(book.book.sourceId);
  return source?.item.name;
}
</script>

<template>
  <van-popup
    v-model:show="showBookShelf"
    position="bottom"
    :z-index="1000"
    class="overflow-hidden sticky left-0 top-0 right-0 bottom-0 w-full h-full"
    :overlay="false"
  >
    <div
      class="shrink-0 w-full flex justify-between items-center px-4 h-[46px] border-b"
    >
      <h2 class="text-lg font-semibold text-[--van-text-color]">书架</h2>
      <van-icon
        name="cross"
        size="24"
        @click="showBookShelf = false"
        class="van-haptics-feedback text-[--van-text-color]"
      />
    </div>
    <div class="shrink-0 w-full flex gap-2 px-4 pt-2 h-[44px]">
      <van-button
        icon="replay"
        size="small"
        type="primary"
        round
        :loading="bookChapterRefreshing"
        @click="() => emit('refreshChapters')"
      >
        刷新章节
      </van-button>
      <van-button
        icon="plus"
        size="small"
        round
        @click="() => (displayStore.showAddBookShelfDialog = true)"
      />
      <van-button
        icon="delete-o"
        size="small"
        round
        @click="() => (displayStore.showRemoveBookShelfDialog = true)"
      />
    </div>

    <van-tabs
      shrink
      animated
      sticky
      :offset-top="90"
      :active="activeIndex"
      class="w-full h-full overflow-y-scroll"
    >
      <van-tab v-for="shelf in bookShelf" :key="shelf.id" :title="shelf.name">
        <ResponsiveGrid2 v-if="shelf.books.length">
          <template
            v-for="item in _.orderBy(
              shelf.books,
              [(book) => book.lastReadTime || 0, (book) => book.createTime],
              ['desc', 'desc'],
            )"
            :key="item.book.id"
          >
            <WinShelfBookCard
              :shelf-book="item"
              :unread="unreadCount(item)"
              @click="(book, chapterId) => emit('toBook', book, chapterId)"
              @remove="(book) => emit('removeBookFromShelf', book, shelf.id)"
            />
          </template>
        </ResponsiveGrid2>
      </van-tab>
    </van-tabs>
  </van-popup>
  <AddBookShelfDialog />
  <DeleteBookShelfDialog />
</template>

<style scoped lang="less">
:deep(.van-card__thumb) {
  width: 80px;
  height: 100px;
}
</style>
