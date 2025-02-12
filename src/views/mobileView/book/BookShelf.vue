<script setup lang="ts">
import { BookChapter, BookItemInShelf } from '@/extensions/book';
import { useBookShelfStore, useDisplayStore, useStore } from '@/store';
import _ from 'lodash';
import { storeToRefs } from 'pinia';
import { computed, PropType } from 'vue';
import AddBookShelfDialog from '@/components/windows/dialogs/AddBookShelf.vue';
import DeleteBookShelfDialog from '@/components/windows/dialogs/RemoveBookShelf.vue';
import MobileShelfBookCard from '@/components/card/bookCards/MobileShelfBookCard.vue';

const shelfAnchors = defineModel('shelfAnchors', {
  type: Array as PropType<number[]>,
  required: true,
});
const shelfHeight = defineModel('shelfHeight', {
  type: Number,
  required: true,
});

const displayStore = useDisplayStore();
const shelfStore = useBookShelfStore();
const { bookShelf, bookChapterRefreshing } = storeToRefs(shelfStore);

const emit = defineEmits<{
  (e: 'refreshChapters'): void;
  (e: 'toBook', book: BookItemInShelf, chapterId?: string): void;
  (e: 'removeBookFromShelf', book: BookItemInShelf, shelfId: string): void;
  (e: 'hidePanel'): void;
}>();

// 计算还有多少章没读
const unreadCount = (book: BookItemInShelf): number | undefined => {
  if (!book.lastReadChapter || !book.book.chapters?.length) return undefined;
  const index = book.book.chapters.findIndex(
    (chapter) => chapter.id === book.lastReadChapter!.id
  );
  const num = book.book.chapters.length - index - 1;
  if (num <= 0) return undefined;
  return num;
};
const sourceName = (book: BookItemInShelf) => {
  const store = useStore();
  const source = store.getBookSource(book.book.sourceId);
  return source?.item.name;
};
</script>

<template>
  <van-floating-panel
    v-model:height="shelfHeight"
    :anchors="shelfAnchors"
    :content-draggable="false"
    @height-change="
      (height) => {
        if (height.height === 0) {
          displayStore.showBookShelf = false;
        }
      }
    "
    class="left-[0px] right-[0px] w-auto rounded-none up-shadow"
    :style="displayStore.showBookShelf ? { height: `${shelfHeight}px` } : {}"
  >
    <template #header>
      <div class="flex justify-between items-center p-4 border-b">
        <h2 class="text-lg font-semibold">
          <slot name="title">
            <p class="text-[--van-text-color]">书架</p>
          </slot>
        </h2>
        <van-button
          icon="cross"
          size="small"
          plain
          round
          @click="
            () => {
              emit('hidePanel');
            }
          "
        >
        </van-button>
      </div>
    </template>
    <div class="flex gap-2 m-2 p-1 shrink">
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
      ></van-button>
      <van-button
        icon="delete-o"
        size="small"
        round
        @click="() => (displayStore.showRemoveBookShelfDialog = true)"
      ></van-button>
    </div>

    <van-tabs shrink class="pb-[50px]">
      <van-tab :title="shelf.name" v-for="shelf in bookShelf" :key="shelf.id">
        <transition name="list" tag="ul">
          <van-list class="p-2">
            <ul
              v-for="item in _.orderBy(
                shelf.books,
                [(book) => book.lastReadTime || 0, (book) => book.createTime],
                ['desc', 'desc']
              )"
              :key="item.book.id"
            >
              <MobileShelfBookCard
                :shelf-book="item"
                :unread="unreadCount(item)"
                @click="(book, chapterId) => emit('toBook', book, chapterId)"
                @remove="(book) => emit('removeBookFromShelf', book, shelf.id)"
              ></MobileShelfBookCard>
            </ul>
          </van-list>
        </transition>
      </van-tab>
    </van-tabs>
  </van-floating-panel>
  <AddBookShelfDialog></AddBookShelfDialog>
  <DeleteBookShelfDialog></DeleteBookShelfDialog>
</template>

<style scoped lang="less">
:deep(.van-card__thumb) {
  width: 80px;
  height: 100px;
}
.list-move, /* 对移动中的元素应用的过渡 */
.list-enter-active,
.list-leave-active {
  transition: all 0.5s ease;
}

.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateX(30px);
}

/* 确保将离开的元素从布局流中删除
  以便能够正确地计算移动的动画。 */
.list-leave-active {
  position: absolute;
}
</style>
