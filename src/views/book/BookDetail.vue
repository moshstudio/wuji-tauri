<script setup lang="ts">
import WinBookDetail from '../windowsView/book/BookDetail.vue';
import MobileBookDetail from '../mobileView/book/BookDetail.vue';
import PlatformSwitch from '@/components/PlatformSwitch.vue';

import { BookChapter, BookItem } from '@/extensions/book';
import { router } from '@/router';
import { useStore } from '@/store';
import { BookSource } from '@/types';
import { showLoadingToast, showToast } from 'vant';
import _ from 'lodash';
import { ref, triggerRef, watch, onActivated } from 'vue';
import { retryOnFalse, sleep } from '@/utils';

const { bookId, sourceId } = defineProps({
  bookId: String,
  sourceId: String,
});

const store = useStore();
const bookSource = ref<BookSource>();
const book = ref<BookItem>();
const content = ref<HTMLElement>();
const shouldLoad = ref(true);
const isAscending = ref(true);
const showBookShelf = ref(false);
function back() {
  shouldLoad.value = true;
  router.push({ name: 'Book' });
}

const loadData = retryOnFalse({ onFailed: back })(async () => {
  book.value = undefined;
  if (!bookId || !sourceId) {
    return false;
  }

  const source = store.getBookSource(sourceId!);
  if (!source) {
    showToast('源不存在或未启用');
    return false;
  }
  bookSource.value = source;

  const item = await store.getBookItem(source, bookId);
  if (!item) {
    return false;
  }
  book.value = item;

  const toast = showLoadingToast({
    message: '书籍加载中',
    duration: 0,
    closeOnClick: true,
    closeOnClickOverlay: false,
  });
  const detail = await store.bookDetail(source!, book.value!);
  toast.close();
  if (detail) {
    book.value = detail;
  }
  if (!detail?.chapters) {
    showToast('章节列表为空');
  }
  content.value!.scrollTop = 0;
  triggerRef(book);
  return true;
});

function toChapter(chapter: BookChapter) {
  router.push({
    name: 'BookRead',
    params: {
      bookId: bookId,
      sourceId: sourceId,
      chapterId: chapter.id,
    },
  });
}

watch([() => bookId, () => sourceId], () => {
  shouldLoad.value = false; // watch这里优先load
  loadData();
});
onActivated(async () => {
  await sleep(200);
  if (shouldLoad.value) {
    shouldLoad.value = false;
    loadData();
  }
});
</script>

<template>
  <PlatformSwitch>
    <template #mobile>
      <MobileBookDetail
        v-model:book="book"
        v-model:book-source="bookSource"
        v-model:content="content"
        v-model:is-ascending="isAscending"
        v-model:show-book-shelf="showBookShelf"
        @back="back"
        @load-data="loadData"
        @to-chapter="toChapter"
      ></MobileBookDetail>
    </template>
    <template #windows>
      <WinBookDetail
        v-model:book="book"
        v-model:book-source="bookSource"
        v-model:content="content"
        v-model:is-ascending="isAscending"
        v-model:show-book-shelf="showBookShelf"
        @back="back"
        @load-data="loadData"
        @to-chapter="toChapter"
      ></WinBookDetail>
    </template>
  </PlatformSwitch>
</template>

<style scoped lang="less"></style>
