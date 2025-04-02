<script setup lang="ts">
import { ref, reactive, watch, PropType } from 'vue';
import { BookChapter, BookItem } from '@/extensions/book';
import { useBookShelfStore, useDisplayStore } from '@/store';
import { storeToRefs } from 'pinia';

const { book, readingChapter, mode } = defineProps({
  book: {
    type: Object as PropType<BookItem>,
    required: false,
  },
  readingChapter: {
    type: Object as PropType<BookChapter>,
    required: false,
  },
  mode: {
    type: String as PropType<'square' | 'rectangle'>,
    default: 'rectangle',
  },
});

const displayStore = useDisplayStore();
const shelfStore = useBookShelfStore();
const { bookShelf } = storeToRefs(shelfStore);
const numInShelf = ref(0);
const pickShelfDialog = ref(false);

const calcNumInShelf = () => {
  if (!book) return;
  // 在几个书架中
  let count = 0;
  for (const shelf of bookShelf.value) {
    for (const b of shelf.books) {
      if (b.book.id === book.id) {
        count++;
      }
    }
  }
  numInShelf.value = count;
};

const addToShelf = () => {
  if (!book) return;
  if (bookShelf.value.length === 1) {
    shelfStore.addToBookSelf(book);
    if (readingChapter) {
      shelfStore.updateBookReadInfo(book, readingChapter);
    }
  } else {
    pickShelfDialog.value = true;
  }
};
const selectAddToShelf = (item: { name: string; id: string }) => {
  if (!book) return;
  shelfStore.addToBookSelf(book, item.id);
  if (readingChapter) {
    shelfStore.updateBookReadInfo(book, readingChapter);
  }
  pickShelfDialog.value = false;
};

watch(
  [bookShelf, () => book],
  () => {
    calcNumInShelf();
  },
  { immediate: true, deep: true }
);
</script>

<template>
  <div v-if="!book"></div>
  <div v-else>
    <div v-if="mode === 'rectangle'">
      <van-badge v-if="numInShelf > 0">
        <template #content>
          <p @click="() => (displayStore.showBookShelf = true)">
            {{ numInShelf }}
          </p>
        </template>
        <van-button plain type="primary" size="small" @click="addToShelf">
          <span class="truncate"> 加入书架 </span>
        </van-button>
      </van-badge>
      <van-button plain type="primary" size="small" @click="addToShelf" v-else>
        <span class="truncate"> 加入书架 </span>
      </van-button>
    </div>
    <div v-else>
      <van-button
        icon="plus"
        square
        size="small"
        class="w-[46px] h-[46px] opacity-50 hover:opacity-100"
        @click="addToShelf"
        v-if="numInShelf === 0"
      >
        <span>书架</span>
      </van-button>
      <van-button
        square
        size="small"
        class="w-[46px] h-[46px] opacity-50 hover:opacity-100"
        @click="() => (displayStore.showBookShelf = true)"
        v-else
      >
        <span>已加书架</span>
      </van-button>
    </div>
  </div>
  <van-dialog
    v-model:show="pickShelfDialog"
    show-cancel-button
    :showConfirmButton="false"
    title="选择书架"
  >
    <van-cell-group inset>
      <van-cell
        v-for="item in bookShelf"
        :key="item.id"
        :title="item.name"
        center
        clickable
        title-class="text-center"
        value-class="hidden"
        @click="() => selectAddToShelf({ name: item.name, id: item.id })"
      >
      </van-cell>
    </van-cell-group>
  </van-dialog>
</template>

<style scoped lang="less"></style>
