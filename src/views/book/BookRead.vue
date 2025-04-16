<script setup lang="ts">
import type { BookChapter, BookItem, BookList } from '@/extensions/book';
import type { BookSource } from '@/types';
import type { LineData, ReaderResult } from '@/utils/reader/types';
import PlatformSwitch from '@/components/PlatformSwitch.vue';
import { router } from '@/router';
import {
  useBookShelfStore,
  useBookStore,
  useDisplayStore,
  useStore,
  useTTSStore,
} from '@/store';
import { purifyText, retryOnFalse, sleep, useElementResize } from '@/utils';
import { createCancellableFunction } from '@/utils/cancelableFunction';
import Reader from '@/utils/reader/reader-layout';
import _ from 'lodash';
import { get_system_font_scale } from 'tauri-plugin-commands-api';
import { keepScreenOn } from 'tauri-plugin-keep-screen-on-api';
import { showConfirmDialog, showNotify, showToast } from 'vant';
import { nextTick, onActivated, onDeactivated, ref, watch } from 'vue';
import MobileBookRead from '../mobileView/book/BookRead.vue';
import WinBookRead from '../windowsView/book/BookRead.vue';
import { useRoute } from 'vue-router';

const { chapterId, bookId, sourceId, isPrev } = defineProps({
  chapterId: String,
  bookId: String,
  sourceId: String,
  isPrev: {
    type: String,
    default: 'false',
  },
});

const store = useStore();
const displayStore = useDisplayStore();
const bookStore = useBookStore();
const shelfStore = useBookShelfStore();
const ttsStore = useTTSStore();

const bookSource = ref<BookSource>();
const book = ref<BookItem>();
const chapterList = ref<BookChapter[]>([]);
const readingChapter = ref<BookChapter>();
const readingContent = ref<{ content: string; index: number }[]>();
const readingPagedContent = ref<{ isPrev: boolean; content: ReaderResult }>();
const readingChapterPage = ref(0);
const shouldLoad = ref(true);

const showChapters = ref(false);
const showSettingDialog = ref(false);
const showBookShelf = ref(false);
const showNavBar = ref(true);

const route = useRoute();

/**
 * 实现切换源功能
 */
const showSwitchSourceDialog = ref(false);
const allSourceResults = ref<BookItem[]>([]);

const searchAllSources = createCancellableFunction(
  async (signal: AbortSignal, targetBook: BookItem) => {
    allSourceResults.value = [];
    await Promise.all(
      store.bookSources.map(async (bookSource) => {
        await store.bookSearch(bookSource, targetBook.title);
        if (signal.aborted) return;
        if (bookSource.list) {
          for (const b of _.castArray<BookList>(bookSource.list)[0].list) {
            if (b.title === targetBook.title) {
              if (signal.aborted) return;
              const detailedBook = await store.bookDetail(bookSource, b);
              if (detailedBook) {
                allSourceResults.value.push(detailedBook);
                return;
              }
            }
          }
        }
      }),
    );
  },
);

async function switchSource(newBookItem: BookItem) {
  if (!readingChapter.value) {
    showToast('请重新加载章节');
    return;
  }
  if (!newBookItem.chapters) {
    showToast('章节为空');
    return;
  }
  const chapter =
    newBookItem.chapters?.find((chapter) => chapter.id === chapterId) ||
    newBookItem.chapters?.find(
      (chapter) => chapter.title === readingChapter.value?.title,
    ) ||
    newBookItem.chapters?.[
      book.value?.chapters?.findIndex((chapter) => chapter.id === chapterId) ||
        0
    ];
  if (!chapter) {
    showToast('章节不存在');
    return;
  }

  chapter.readingPage = readingChapter.value.readingPage;
  showSwitchSourceDialog.value = false;
  router.push({
    name: 'BookRead',
    params: {
      chapterId: chapter.id,
      bookId: newBookItem.id,
      sourceId: newBookItem.sourceId,
      isPrev: 'false',
    },
  });
}

async function back(checkShelf: boolean = false) {
  ttsStore.stop();
  displayStore.showTabBar = true;
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
  readingChapterPage.value = 0;
  readingPagedContent.value = undefined;

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
async function loadChapter(chapter?: BookChapter, refresh = false) {
  if (!book.value) {
    showToast('书籍不存在');
    back();
    return;
  }
  if (!chapter) {
    chapter = book.value.chapters?.find((chapter) => chapter.id === chapterId);
  }
  if (!chapter) {
    showToast('章节不存在');
    back();
    return;
  }
  shelfStore.updateBookReadInfo(book.value, chapter);
  showNavBar.value = true;
  const displayStore = useDisplayStore();
  const t = displayStore.showToast();
  chapterList.value = book.value.chapters || [];
  readingChapter.value = chapter;
  let content =
    (await store.bookRead(bookSource.value!, book.value, chapter, {
      refresh,
    })) || '';
  content = purifyText(content);
  readingContent.value = content
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => !!line)
    .map((line, index) => ({ content: line, index: index }));
  displayStore.closeToast(t);
  if (!readingContent.value) {
    showToast('本章内容为空');
  }
  if (displayStore.isMobileView) {
    await updateReadingElements();
  }
}

async function updateReadingElements() {
  switch (bookStore.readMode) {
    case 'scroll':
      nextTick(() => {
        document
          .querySelector('.scroll-container')
          ?.scrollTo({ top: 0, behavior: 'instant' });
      });

      if (book.value && readingChapter.value) {
        shelfStore.updateBookReadInfo(book.value, readingChapter.value);
      }
      readingPagedContent.value = undefined;
      if (ttsStore.isReading) {
        ttsStore.stop();
        scrollPlayTTS();
      }
      break;
    case 'slide':
      await updateReadingPagedContent();
      if (isPrev === 'true') {
        readingChapterPage.value =
          (readingPagedContent.value?.content.length || 1) - 1;
      } else {
        if (
          readingChapter.value?.readingPage &&
          readingPagedContent.value &&
          readingPagedContent.value.content.length >
            readingChapter.value.readingPage
        ) {
          readingChapterPage.value = readingChapter.value?.readingPage;
        } else {
          readingChapterPage.value = 0;
        }
      }
      if (ttsStore.isReading) {
        ttsStore.stop();
        slidePlayTTS();
      }
      break;
  }
}

async function updateReadingPagedContent() {
  const container = document.querySelector('#read-content');
  const width = container?.clientWidth || document.body.clientWidth;
  const height = container?.clientHeight || document.body.clientHeight;
  let scale = 1;
  try {
    scale = (await get_system_font_scale()) as number;
  } catch (error) {
    console.warn(error);
  }

  const list = Reader(
    readingContent.value?.map((line) => line.content).join('\n') || '',
    {
      platform: 'browser', // 平台
      id: '', // canvas 对象
      splitCode: '\r\n', // 段落分割符
      width: width - bookStore.paddingX * 2, // 容器宽度
      height: height - bookStore.paddingTop - bookStore.paddingBottom, // 容器高度
      fontSize: bookStore.fontSize * scale, // 段落字体大小
      lineHeight: bookStore.lineHeight, // 段落文字行高
      pGap: bookStore.readPGap, // 段落间距
      title: readingChapter.value?.title, // 标题
      titleSize: bookStore.fontSize * 1.3 * scale, // 标题字体大小
      titleHeight: bookStore.lineHeight * 1.3, // 标题文字行高
      titleWeight: 'normal', // 标题文字字重
      titleGap: bookStore.readPGap * 1.3, // 标题距离段落的间距
    },
  );

  readingPagedContent.value = {
    isPrev: isPrev === 'true',
    content: list,
  };
  if (readingChapterPage.value >= list.length) {
    readingChapterPage.value = list.length - 1;
  }
}

function prevChapter(toLast: boolean = false) {
  const index = chapterList.value.findIndex(
    (chapter) => chapter.id === readingChapter.value?.id,
  );
  if (index === -1) {
    return;
  }
  if (index > 0) {
    if (!toLast) {
      chapterList.value[index - 1].readingPage = undefined;
    }
    ttsStore.resetReadingPage();
    router.push({
      name: 'BookRead',
      params: {
        chapterId: chapterList.value[index - 1].id,
        bookId: book.value?.id,
        sourceId: book.value?.sourceId,
        isPrev: toLast ? 'true' : '',
      },
    });
  } else {
    showToast('没有上一章了');
  }
}

function nextChapter() {
  const index = chapterList.value.findIndex(
    (chapter) => chapter.id === readingChapter.value?.id,
  );
  if (index === -1) {
    return;
  }
  if (index < chapterList.value.length - 1) {
    ttsStore.resetReadingPage();
    chapterList.value[index + 1].readingPage = undefined;
    if (route.name?.toString().includes('BookRead')) {
      router.push({
        name: 'BookRead',
        params: {
          chapterId: chapterList.value[index + 1].id,
          bookId: book.value?.id,
          sourceId: book.value?.sourceId,
          isPrev: 'false',
        },
      });
    } else {
      const currPath = route.path;
      router
        .push({
          name: 'BookRead',
          params: {
            chapterId: chapterList.value[index + 1].id,
            bookId: book.value?.id,
            sourceId: book.value?.sourceId,
            isPrev: 'false',
          },
        })
        .then(() => {
          router.replace(currPath);
        });
    }
  } else {
    showToast('没有下一章了');
  }
}

async function resfreshChapter() {
  await loadChapter(undefined, true);
}
function toChapter(chapter: BookChapter) {
  chapter.readingPage = undefined;

  router.push({
    name: 'BookRead',
    params: {
      chapterId: chapter.id,
      bookId: book.value?.id,
      sourceId: book.value?.sourceId,
    },
  });
}
function openChapterPopup() {
  showChapters.value = true;
  nextTick(() => {
    document
      .querySelector('.reading-chapter')
      ?.scrollIntoView({ block: 'center', behavior: 'instant' });
  });
}

const scrollPlayTTS = () => {
  if (!readingContent.value?.length) {
    return;
  }

  let target = readingContent.value[0];
  const playing = ttsStore.scrollReadingContent;
  if (playing) {
    const index = readingContent.value.findIndex(
      (item) =>
        item.index === playing.index && item.content === playing.content,
    );
    if (index === readingContent.value.length - 1) {
      // 直接阅读下一章
      nextChapter();
      return;
    } else {
      target = readingContent.value[index + 1];
    }
  }
  ttsStore.playVoice(
    target,
    ttsStore.selectedVoice,
    ttsStore.playbackRate,
    (event) => {
      if (ttsStore.isReading) {
        scrollPlayTTS();
      }
    },
  );
  document
    .querySelector(`#read-content .index-${target.index}`)
    ?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  const index = readingContent.value.findIndex(
    (item) => item.index === target.index && item.content === target.content,
  );
  if (index < readingContent.value.length - 1) {
    ttsStore.generateVoice(
      readingContent.value[index + 1],
      ttsStore.selectedVoice,
      ttsStore.playbackRate,
    );
  }
  if (index < readingContent.value.length - 2) {
    ttsStore.generateVoice(
      readingContent.value[index + 2],
      ttsStore.selectedVoice,
      ttsStore.playbackRate,
    );
  }
};

const slidePlayTTS = () => {
  if (!readingPagedContent.value?.content.length) {
    return;
  }
  const toNext = () => {
    if (
      readingChapterPage.value ==
      readingPagedContent.value!.content.length - 1
    ) {
      // 去下一章
      nextChapter();
      return;
    } else {
      // 去下一页
      readingChapterPage.value += 1;
      slidePlayTTS();
      return;
    }
  };
  const playing = ttsStore.slideReadingContent;
  const currPageLines =
    readingPagedContent.value.content[readingChapterPage.value];
  if (!currPageLines.length) {
    // 当前页面为空，去下一页或下一章
    toNext();
    return;
  }
  let target: LineData[];
  if (!playing?.length) {
    // 没有历史记录，从头开始阅读
    target = _.flatten(readingPagedContent.value.content).filter(
      (line) => line.pIndex === currPageLines[0].pIndex,
    );
  } else {
    const currPIndex = playing[0].pIndex;
    if (
      currPIndex < currPageLines[0].pIndex ||
      currPIndex > currPageLines[currPageLines.length - 1].pIndex
    ) {
      // 从头开始读
      target = _.flatten(readingPagedContent.value.content).filter(
        (line) => line.pIndex === currPageLines[0].pIndex,
      );
    } else if (currPIndex < currPageLines[currPageLines.length - 1].pIndex) {
      // 还在当前页面中
      target = _.flatten(readingPagedContent.value.content).filter(
        (line) => line.pIndex === playing[0].pIndex + 1,
      );
    } else {
      // 需要去下一页或下一章
      toNext();
      return;
    }
  }
  if (!target?.length) {
    toNext();
    return;
  }
  ttsStore.playVoice(
    target,
    ttsStore.selectedVoice,
    ttsStore.playbackRate,
    (event) => {
      if (ttsStore.isReading) {
        slidePlayTTS();
      }
    },
  );
  // 缓存后两段内容
  const forward1 = _.flatten(readingPagedContent.value.content).filter(
    (line) => line.pIndex === target[0].pIndex + 1,
  );
  if (forward1.length) {
    ttsStore.generateVoice(
      forward1,
      ttsStore.selectedVoice,
      ttsStore.playbackRate,
    );
  }
  const forward2 = _.flatten(readingPagedContent.value.content).filter(
    (line) => line.pIndex === target[0].pIndex + 2,
  );
  if (forward2.length) {
    ttsStore.generateVoice(
      forward2,
      ttsStore.selectedVoice,
      ttsStore.playbackRate,
    );
  }
};

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

watch(
  book,
  (b) => {
    bookStore.readingBook = b;
    allSourceResults.value = [];
  },
  { immediate: true },
);
watch(readingChapter, (c) => (bookStore.readingChapter = c), {
  immediate: true,
});
watch(readingChapterPage, (page) => {
  if (readingChapter.value) {
    readingChapter.value.readingPage = page;
  }
});

useElementResize('#read-content', _.debounce(updateReadingElements, 500));
watch(
  [
    () => bookStore.fontSize,
    () => bookStore.lineHeight,
    () => bookStore.readPGap,
    () => bookStore.readMode,
    () => bookStore.paddingX,
    () => bookStore.paddingTop,
    () => bookStore.paddingBottom,
  ],
  _.debounce(updateReadingElements, 500),
);

onActivated(() => {
  if (displayStore.isAndroid && displayStore.bookKeepScreenOn) {
    keepScreenOn(true);
  }
  if (ttsStore.isReading) {
    if (!displayStore.isMobileView && ttsStore.scrollReadingContent) {
      document
        .querySelector(
          `#read-content .index-${ttsStore.scrollReadingContent.index}`,
        )
        ?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  }
});
onDeactivated(() => {
  if (displayStore.isAndroid && displayStore.bookKeepScreenOn) {
    keepScreenOn(false);
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
        v-model:reading-paged-content="readingPagedContent"
        v-model:chapter-page="readingChapterPage"
        v-model:show-chapters="showChapters"
        v-model:show-setting-dialog="showSettingDialog"
        v-model:show-book-shelf="showBookShelf"
        v-model:show-nav-bar="showNavBar"
        v-model:all-source-results="allSourceResults"
        v-model:show-switch-source-dialog="showSwitchSourceDialog"
        @back="back"
        @load-data="loadData"
        @to-chapter="toChapter"
        @next-chapter="nextChapter"
        @refresh-chapter="resfreshChapter"
        @open-chapter-popup="openChapterPopup"
        @prev-chapter="prevChapter"
        @search-all-sources="searchAllSources"
        @switch-source="switchSource"
        @play-tts="slidePlayTTS"
      />
    </template>
    <template #windows>
      <WinBookRead
        v-model:book="book"
        v-model:book-source="bookSource"
        v-model:chapter-list="chapterList"
        v-model:reading-chapter="readingChapter"
        v-model:reading-content="readingContent"
        v-model:reading-paged-content="readingPagedContent"
        v-model:show-chapters="showChapters"
        v-model:show-setting-dialog="showSettingDialog"
        v-model:show-book-shelf="showBookShelf"
        v-model:show-nav-bar="showNavBar"
        v-model:all-source-results="allSourceResults"
        v-model:show-switch-source-dialog="showSwitchSourceDialog"
        @back="back"
        @load-data="loadData"
        @to-chapter="toChapter"
        @next-chapter="nextChapter"
        @refresh-chapter="resfreshChapter"
        @open-chapter-popup="openChapterPopup"
        @prev-chapter="prevChapter"
        @search-all-sources="searchAllSources"
        @switch-source="switchSource"
        @play-tts="scrollPlayTTS"
      />
    </template>
  </PlatformSwitch>
</template>

<style scoped lang="less"></style>
