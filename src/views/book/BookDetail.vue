<script setup lang="ts">
import type { BookChapter, BookItem } from '@wuji-tauri/source-extension';
import type { BookSource } from '@/types';
import { storeToRefs } from 'pinia';

import { showFailToast, showLoadingToast, showToast } from 'vant';
import { computed, onActivated, ref, watch } from 'vue';
import BookSwitchSourceDialog from '@/components/dialog/BookSwitchSource.vue';
import PlatformSwitch from '@/components/platform/PlatformSwitch.vue';
import { useBookSwitchSource } from '@/hooks/useBookSwitchSource';
import { usePageDataLoader } from '@/hooks/usePageDataLoader';
import AppBookDetail from '@/layouts/app/book/BookDetail.vue';
import DesktopBookDetail from '@/layouts/desktop/book/BookDetail.vue';
import { router } from '@/router';
import {
  useBookShelfStore,
  useDownloadStore,
  useStore,
  useSubscribeSourceStore,
} from '@/store';
import {
  confirmSwitchSource,
  ensureBookSource,
  findBookItemById,
} from '@/utils/bookSourceAccess';

const { bookId, sourceId } = defineProps({
  bookId: String,
  sourceId: String,
});

const downloadStore = useDownloadStore();

const store = useStore();
const shelfStore = useBookShelfStore();
const subscribeStore = useSubscribeSourceStore();
const { bookShelf } = storeToRefs(shelfStore);

const book = ref<BookItem>();
const bookSource = ref<BookSource>();
const shouldReload = ref(false);
const inShelf = computed(() => {
  for (const shelf of bookShelf.value) {
    if (shelf.books.some(book => book.book.id === bookId)) {
      return true;
    }
  }
  return false;
});
const showAddShelfSheet = ref(false);
const addShelfActions = computed(() => {
  return bookShelf.value.map(shelf => ({
    name: shelf.name,
    subname: `共 ${shelf.books.length || 0} 本书`,
    callback: () => {
      if (book.value) {
        shelfStore.addToBookShelf(book.value, shelf.id);
      }
      showAddShelfSheet.value = false;
    },
  }));
});

const {
  showSwitchSourceDialog,
  allSourceResults,
  switchTargetBook,
  searchAllSources,
  openSwitchSource,
  isSearching,
  searchProgress,
} = useBookSwitchSource();

const { run: loadPage } = usePageDataLoader({
  onFailed: () => showFailToast('加载失败，请检查网络或订阅源状态'),
});

function clear() {
  book.value = undefined;
  bookSource.value = undefined;
  shouldReload.value = false;
}

async function loadData() {
  await loadPage(async (signal) => {
    clear();
    if (!bookId || !sourceId) {
      showFailToast('跳转参数错误');
      shouldReload.value = true;
      return true;
    }

    const loaded = await subscribeStore.waitForLoaded();
    if (signal.aborted)
      return true;
    if (!loaded) {
      showFailToast('订阅源加载超时，请稍后重试');
      shouldReload.value = true;
      return true;
    }

    const ensured = await ensureBookSource(sourceId!);
    if (!ensured.ok) {
      book.value = findBookItemById(bookId);
      if (ensured.action === 'switch') {
        if (book.value)
          openSwitchSource(book.value);
        else
          showToast('无法换源：找不到书籍信息');
      }
      shouldReload.value = true;
      return true;
    }
    bookSource.value = ensured.source;

    book.value = store.getBookItem(bookSource.value, bookId);
    if (!book.value) {
      shouldReload.value = true;
      return false;
    }

    const toast = showLoadingToast({
      message: '书籍加载中',
      duration: 0,
      closeOnClick: true,
      closeOnClickOverlay: false,
    });
    const detail = await store.bookDetail(bookSource.value, book.value, {
      silent: true,
    });
    toast.close();

    if (signal.aborted)
      return true;

    if (detail) {
      book.value = detail;
    }
    if (!detail?.chapters?.length) {
      if (await confirmSwitchSource('获取章节列表失败，是否换源搜索？'))
        openSwitchSource(book.value);
      else
        showToast('章节列表为空');
    }

    shouldReload.value = !detail || !detail.chapters?.length;
    return !!detail;
  });
}

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

async function onSelectSwitchSource(newBookItem: BookItem) {
  if (!newBookItem.chapters?.length) {
    showToast('章节为空');
    return;
  }
  showSwitchSourceDialog.value = false;
  router.push({
    name: 'BookDetail',
    params: {
      bookId: newBookItem.id,
      sourceId: newBookItem.sourceId,
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

async function onDownload() {
  if (book.value && bookSource.value) {
    if (!book.value.chapters?.length) {
      showToast('章节列表加载中，请稍后');
      return;
    }
    await downloadStore.startBookDownload(book.value, bookSource.value);
  }
}

onActivated(() => {
  if (shouldReload.value) {
    loadData();
  }
});
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
        :on-download="onDownload"
      />
    </template>
    <template #desktop>
      <DesktopBookDetail
        :book="book"
        :book-source="bookSource"
        :in-shelf="inShelf"
        :add-to-shelf="() => (showAddShelfSheet = true)"
        :to-chapter="toChapter"
        :on-download="onDownload"
      />
    </template>
    <van-action-sheet
      v-model:show="showAddShelfSheet"
      title="添加到书架"
      :actions="addShelfActions"
    />
    <BookSwitchSourceDialog
      v-model:show="showSwitchSourceDialog"
      :book="switchTargetBook || book"
      :search-result="allSourceResults"
      :searching="isSearching"
      :search-progress="searchProgress"
      :current-chapter="book?.chapters?.[0]"
      :search="searchAllSources"
      :select="onSelectSwitchSource"
    />
  </PlatformSwitch>
</template>

<style scoped lang="less"></style>
