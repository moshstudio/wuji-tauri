<script setup lang="ts">
import { BookItemInShelf } from '@/extensions/book';
import { router } from '@/router';
import { useStore, useBookShelfStore } from '@/store';
import _ from 'lodash';
import { showLoadingToast, showToast } from 'vant';
import { onMounted, onUnmounted, ref, watch } from 'vue';
import WinBookShelf from '../windowsView/book/BookShelf.vue';
import MobileBookShelf from '../mobileView/book/BookShelf.vue';

const show = defineModel('show', { type: Boolean, default: false });

const store = useStore();
const shelfStore = useBookShelfStore();

const refreshChapters = async () => {
  await shelfStore.bookRefreshChapters();
};

const toBook = async (book: BookItemInShelf, chapterId?: string) => {
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
  show.value = false;
  router.push({
    name: 'BookRead',
    params: {
      bookId: book.book.id,
      sourceId: book.book.sourceId,
      chapterId: chapterId,
    },
  });
};
const removeBookFromShelf = (book: BookItemInShelf, shelfId: string) => {
  shelfStore.removeBookFromShelf(book.book, shelfId);
};

// 书架展示相关
const shelfAnchors = ref([0, Math.round(window.innerHeight)]);
const shelfHeight = ref(0);
const hidePanel = () => {
  shelfHeight.value = shelfAnchors.value[0];
  show.value = false;
};
watch(
  show,
  (newValue) => {
    if (newValue) {
      shelfHeight.value = shelfAnchors.value[1];
    } else {
      shelfHeight.value = shelfAnchors.value[0];
    }
  },
  { immediate: true }
);
const updateAnchors = () => {
  shelfAnchors.value[1] = Math.round(window.innerHeight);
  if (show.value) {
    shelfHeight.value = shelfAnchors.value[1];
  }
};
onMounted(() => {
  window.addEventListener('resize', updateAnchors);
});
onUnmounted(() => {
  window.removeEventListener('resize', updateAnchors);
});
</script>

<template>
  <PlatformSwitch>
    <template #mobile>
      <MobileBookShelf
        v-model:show="show"
        v-model:shelf-anchors="shelfAnchors"
        v-model:shelf-height="shelfHeight"
        @refresh-chapters="refreshChapters"
        @to-book="toBook"
        @remove-book-from-shelf="removeBookFromShelf"
        @hide-panel="hidePanel"
      ></MobileBookShelf>
    </template>
    <template #windows>
      <WinBookShelf
        v-model:show="show"
        v-model:shelf-anchors="shelfAnchors"
        v-model:shelf-height="shelfHeight"
        @refresh-chapters="refreshChapters"
        @to-book="toBook"
        @remove-book-from-shelf="removeBookFromShelf"
        @hide-panel="hidePanel"
      ></WinBookShelf>
    </template>
  </PlatformSwitch>
</template>

<style scoped lang="less"></style>
