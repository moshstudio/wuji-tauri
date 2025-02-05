<script setup lang="ts">
import { BookChapter, BookItemInShelf } from '@/extensions/book';
import { useBookShelfStore, useDisplayStore, useStore } from '@/store';
import _ from 'lodash';
import { storeToRefs } from 'pinia';
import { Icon } from '@iconify/vue';
import { computed, PropType } from 'vue';
import AddBookShelfDialog from '@/components/windows/dialogs/AddBookShelf.vue';
import DeleteBookShelfDialog from '@/components/windows/dialogs/RemoveBookShelf.vue';

const show = defineModel('show', { type: Boolean, default: false });
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

const lastChapter = (book: BookItemInShelf) => {
  if (!book.book.chapters?.length) return null;
  return book.book.chapters[book.book.chapters.length - 1];
};
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
          show = false;
        }
      }
    "
    class="left-[0px] right-[0px] w-auto rounded-none up-shadow"
    :style="show ? { height: `${shelfHeight}px` } : {}"
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

    <van-tabs shrink>
      <van-tab :title="shelf.name" v-for="shelf in bookShelf" :key="shelf.id">
        <van-list class="p-2">
          <van-card
            :desc="item.book.intro"
            centered
            lazy-load
            v-for="item in _.orderBy(
              shelf.books,
              [(book) => book.lastReadTime || 0, (book) => book.createTime],
              ['desc', 'desc']
            )"
            :key="item.book.id"
          >
            <template #thumb>
              <van-image width="80px" height="100px" :src="item.book.cover">
                <template #loading>
                  <Icon icon="codicon:book" width="48" height="48" />
                </template>
                <template #error>
                  <Icon icon="codicon:book" width="48" height="48" />
                </template>
              </van-image>
            </template>
            <template #title>
              <van-row align="center" class="gap-4">
                <h1
                  class="text-button-2 text-base font-bold"
                  @click="() => emit('toBook', item)"
                >
                  {{ item.book.title }}
                </h1>
                <span class="text-gray-400">{{ sourceName(item) }}</span>
              </van-row>
            </template>
            <template #tags>
              <p
                class="text-button-2 text-[var(--van-card-desc-color)] font-normal pt-1"
                @click="() => emit('toBook', item, lastChapter(item)?.id)"
              >
                {{
                  item.book.chapters?.length
                    ? '最新章节:' + lastChapter(item)?.title
                    : ''
                }}
              </p>
            </template>
            <template #price>
              <van-badge
                :content="unreadCount(item)"
                color="#1989fa"
                :offset="[18, 13.8]"
              >
                <p
                  class="text-button-2 text-[var(--van-card-desc-color)] pt-1"
                  @click="() => emit('toBook', item, item.lastReadChapter?.id)"
                >
                  {{
                    item.lastReadChapter
                      ? '最近阅读:' + item.lastReadChapter.title
                      : undefined
                  }}
                </p>
              </van-badge>
            </template>
            <template #footer>
              <van-button
                size="mini"
                @click="() => emit('removeBookFromShelf', item, shelf.id)"
              >
                移除
              </van-button>
            </template>
          </van-card>
        </van-list>
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
</style>
