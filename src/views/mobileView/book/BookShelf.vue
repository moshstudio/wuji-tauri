<script setup lang="ts">
import type { BookItemInShelf } from '@/extensions/book';
import type { PropType } from 'vue';
import MobileShelfBookCard from '@/components/card/bookCards/MobileShelfBookCard.vue';
import LeftPopup from '@/components/mobile/LeftPopup.vue';
import AddBookShelfDialog from '@/components/windows/dialogs/AddBookShelf.vue';
import DeleteBookShelfDialog from '@/components/windows/dialogs/RemoveBookShelf.vue';
import { useBookShelfStore, useDisplayStore, useStore } from '@/store';
import _ from 'lodash';
import { storeToRefs } from 'pinia';

const emit = defineEmits<{
  (e: 'refreshChapters'): void;
  (e: 'toBook', book: BookItemInShelf, chapterId?: string): void;
  (e: 'removeBookFromShelf', book: BookItemInShelf, shelfId: string): void;
  (e: 'hidePanel'): void;
}>();
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
  <van-floating-panel
    v-remember-scroll="'.van-floating-panel__content'"
    v-model:height="shelfHeight"
    :anchors="shelfAnchors"
    :content-draggable="false"
    class="left-[0px] right-[0px] w-auto rounded-none up-shadow"
    :style="displayStore.showBookShelf ? { height: `${shelfHeight}px` } : {}"
    @height-change="
      (height) => {
        if (height.height === 0) {
          displayStore.showBookShelf = false;
        }
      }
    "
  >
    <template #header>
      <div class="flex justify-between items-center p-2 border-b">
        <div class="flex items-center gap-2">
          <LeftPopup />
          <h2 class="text-lg font-bold">
            <slot name="title">
              <p class="text-[--van-text-color]">书架</p>
            </slot>
          </h2>
        </div>

        <van-button
          icon="arrow-down"
          size="small"
          plain
          round
          @click="
            () => {
              emit('hidePanel');
            }
          "
        />
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
      />
      <van-button
        icon="delete-o"
        size="small"
        round
        @click="() => (displayStore.showRemoveBookShelfDialog = true)"
      />
    </div>

    <van-tabs shrink animated class="pb-[50px]">
      <van-tab v-for="shelf in bookShelf" :key="shelf.id" :title="shelf.name">
        <transition name="list" tag="ul">
          <van-list class="p-2">
            <template
              v-for="item in _.orderBy(
                shelf.books,
                [(book) => book.lastReadTime || 0, (book) => book.createTime],
                ['desc', 'desc'],
              )"
              :key="item.book.id"
            >
              <MobileShelfBookCard
                :shelf-book="item"
                :unread="unreadCount(item)"
                @click="(book, chapterId) => emit('toBook', book, chapterId)"
                @remove="(book) => emit('removeBookFromShelf', book, shelf.id)"
              />
            </template>
          </van-list>
        </transition>
      </van-tab>
    </van-tabs>
  </van-floating-panel>
  <AddBookShelfDialog />
  <DeleteBookShelfDialog />
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
