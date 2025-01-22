<script setup lang="ts">
import WinBookRead from '../windowsView/book/BookRead.vue';
import MobileBookRead from '../mobileView/book/BookRead.vue';
import PlatformSwitch from '@/components/PlatformSwitch.vue';
import { BookChapter, BookItem } from '@/extensions/book';
import { router } from '@/router';
import { useStore, useDisplayStore, useBookShelfStore } from '@/store';
import { BookSource } from '@/types';
import { purifyText, retryOnFalse, sleep } from '@/utils';
import { storeToRefs } from 'pinia';
import { showConfirmDialog, showToast } from 'vant';
import {
  ref,
  reactive,
  watch,
  onActivated,
  nextTick,
  toRaw,
  onMounted,
  onDeactivated,
} from 'vue';
import PositionBackTop from '@/components/PositionBackTop.vue';
import BookShelfButton from '@/components/BookShelfButton.vue';
import BookShelf from './BookShelf.vue';
import NavBar from '@/components/NavBar.vue';
import { useScroll } from '@vueuse/core';

const { chapterId, bookId, sourceId } = defineProps({
  chapterId: String,
  bookId: String,
  sourceId: String,
});

const store = useStore();
const displayStore = useDisplayStore();
const shelfStore = useBookShelfStore();

const bookSource = ref<BookSource>();
const book = ref<BookItem>();
const chapterList = ref<BookChapter[]>([]);
const readingChapter = ref<BookChapter>();
const readingContent = ref<string>();
const shouldLoad = ref(true);

const showChapters = ref(false);
const showSettingDialog = ref(false);
const showBookShelf = ref(false);
const showNavBar = ref(true);

let savedScrollPosition = 0;

async function back(checkShelf: boolean = false) {
  if (checkShelf && book.value) {
    if (!shelfStore.isBookInShelf(book.value)) {
      try {
        const d = await showConfirmDialog({
          title: '放入书架',
          message: `是否将《${book.value.title}》放入书架？`,
        });
        if (d == 'confirm') {
          shelfStore.addToBookSelf(book.value);
          if (book.value && readingChapter.value) {
            shelfStore.updateBookReadInfo(book.value, readingChapter.value);
          }
        }
      } catch (error) {}
    }
  }
  shouldLoad.value = true;
  router.push({ name: 'Book' });
}

const loadData = retryOnFalse({ onFailed: back })(async () => {
  book.value = undefined;
  chapterList.value = [];
  readingChapter.value = undefined;
  readingContent.value = undefined;

  if (!bookId || !sourceId || !chapterId) {
    return false;
  }

  const source = store.getBookSource(sourceId!);
  if (!source) {
    showToast('源不存在或未启用');
    return false;
  }
  bookSource.value = source;
  const item = store.getBookItem(source, bookId);

  if (!item) {
    return false;
  }
  book.value = item;

  return true;
});
async function loadChapter(chapter?: BookChapter) {
  if (!chapter) {
    chapter = book.value?.chapters?.find((chapter) => chapter.id === chapterId);
  }
  if (!chapter) {
    showToast('章节不存在');
    return;
  }
  showNavBar.value = true;
  const displayStore = useDisplayStore();
  const t = displayStore.showToast();
  chapterList.value = book.value?.chapters || [];
  readingChapter.value = chapter;
  readingContent.value =
    (await store.bookRead(bookSource.value!, book.value!, chapter)) || '';

  readingContent.value = purifyText(readingContent.value);
  displayStore.closeToast(t);
  if (!readingContent.value) {
    showToast('本章内容为空');
  }

  nextTick(() => {
    const content = document.querySelector('#content');
    if (content) {
      content.innerHTML = '';
      readingContent.value?.split('\n').forEach((line) => {
        // 创建 <p> 元素
        const p = document.createElement('p');
        // p.style.marginTop = "0.8em";
        // 设置 <p> 的内容
        p.textContent = line;
        // 将 <p> 插入到目标 div 中
        content.appendChild(p);
      });
      document
        .querySelector('.scroll-container')
        ?.scrollTo({ top: 0, behavior: 'instant' });
      if (book.value && readingChapter.value) {
        shelfStore.updateBookReadInfo(book.value, readingChapter.value);
      }
    }
  });
}

function prevChapter() {
  const index = chapterList.value.findIndex(
    (chapter) => chapter.id === readingChapter.value?.id
  );
  if (index === -1) {
    return;
  }
  if (index > 0) {
    router.push({
      name: 'BookRead',
      params: {
        chapterId: chapterList.value[index - 1].id,
        bookId: book.value?.id,
        sourceId: book.value?.sourceId,
      },
    });
  } else {
    showToast('没有上一章了');
  }
}

function nextChapter() {
  const index = chapterList.value.findIndex(
    (chapter) => chapter.id === readingChapter.value?.id
  );
  if (index === -1) {
    return;
  }
  if (index < chapterList.value.length - 1) {
    router.push({
      name: 'BookRead',
      params: {
        chapterId: chapterList.value[index + 1].id,
        bookId: book.value?.id,
        sourceId: book.value?.sourceId,
      },
    });
  } else {
    showToast('没有下一章了');
  }
}
function openChapterPopup() {
  showChapters.value = true;
  nextTick(() => {
    document
      .querySelector('.reading-chapter')
      ?.scrollIntoView({ block: 'center', behavior: 'instant' });
  });
}

watch([() => chapterId, () => bookId, () => sourceId], async () => {
  shouldLoad.value = false; // watch这里优先load
  await loadData();
  await loadChapter();
});
onActivated(async () => {
  await sleep(200);
  if (shouldLoad.value) {
    shouldLoad.value = false;
    await loadData();
    await loadChapter();
  }
});
onMounted(() => {
  const el: HTMLElement | null = document.querySelector(`.scroll-container`);
  if (el) {
    const { y } = useScroll(el);
    // 组件停用时保存滚动位置
    onDeactivated(() => {
      savedScrollPosition = y.value;
    });

    // 组件激活时恢复滚动位置
    onActivated(() => {
      el.scrollTo({
        top: savedScrollPosition,
        behavior: 'instant',
      });
    });
  }
});
</script>

<template>
  <PlatformSwitch>
    <template #mobile>
      <MobileBookRead
        v-model:book="book"
        v-model:book-source="bookSource"
        v-model:chapter-list="chapterList"
        v-model:reading-chapter="readingChapter"
        v-model:reading-content="readingContent"
        v-model:show-chapters="showChapters"
        v-model:show-setting-dialog="showSettingDialog"
        v-model:show-book-shelf="showBookShelf"
        v-model:show-nav-bar="showNavBar"
        @back="back"
        @load-data="loadData"
        @load-chapter="loadChapter"
        @next-chapter="nextChapter"
        @open-chapter-popup="openChapterPopup"
        @prev-chapter="prevChapter"
      ></MobileBookRead>
    </template>
    <template #windows>
      <WinBookRead
        v-model:book="book"
        v-model:book-source="bookSource"
        v-model:chapter-list="chapterList"
        v-model:reading-chapter="readingChapter"
        v-model:reading-content="readingContent"
        v-model:show-chapters="showChapters"
        v-model:show-setting-dialog="showSettingDialog"
        v-model:show-book-shelf="showBookShelf"
        v-model:show-nav-bar="showNavBar"
        @back="back"
        @load-data="loadData"
        @load-chapter="loadChapter"
        @next-chapter="nextChapter"
        @open-chapter-popup="openChapterPopup"
        @prev-chapter="prevChapter"
      ></WinBookRead>
    </template>
  </PlatformSwitch>
</template>

<style scoped lang="less"></style>
