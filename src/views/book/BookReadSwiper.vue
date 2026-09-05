<script setup lang="ts">
import type {
  BookChapter,
  BookItem,
  BookChapterList as ChapterList,
} from '@wuji-tauri/source-extension';
import type { BookSource } from '@/types';
import type { LineData, ReaderResult } from '@/utils/reader/types';
import { onMountedOrActivated } from '@vant/use';

import _ from 'lodash';
import { storeToRefs } from 'pinia';

import { get_system_font_scale } from 'tauri-plugin-commands-api';
import { showToast } from 'vant';
import {
  computed,
  nextTick,
  onDeactivated,
  onUnmounted,
  ref,
  watch,
} from 'vue';

import PlatformSwitch from '@/components/platform/PlatformSwitch.vue';
import AppBookReadSwipe from '@/layouts/app/book/BookReadSwipe.vue';
import DesktopBookReadSwipe from '@/layouts/desktop/book/BookReadSwipe.vue';
import { useBookStore, useDisplayStore, useTTSStore } from '@/store';
import { useElementResize } from '@/utils';
import { getChapterIndex } from '@/utils/bookSourceAccess';
import Reader from '@/utils/reader/reader-layout';

const props = withDefaults(
  defineProps<{
    book?: BookItem;
    bookSource?: BookSource;
    chapterList?: ChapterList;
    isPrev?: boolean;
    chapter?: BookChapter;
    chapterContent?: string;
    prevChapterContent?: string;
    nextChapterContent?: string;
    allSourceResults?: BookItem[];
    fullScreenClickToNext: boolean;
    inShelf: boolean;
    addToShelf: () => void;
    showViewSetting: () => void;
    showSetting: () => void;
    showSwitchSource: () => void;
    toChapter: (chapter: BookChapter) => void;
    prevChapter: (toLast?: boolean) => void;
    nextChapter: () => void;
    refreshChapter: () => Promise<void>;
    refreshChapters: () => Promise<void>;
    onDownload: () => void;
  }>(),
  {
    isPrev: false,
  },
);

const emit = defineEmits<{
  (e: 'update:reading-page', page: number): void;
}>();

const displayStore = useDisplayStore();
const bookStore = useBookStore();
const ttsStore = useTTSStore();
const { showTabBar } = storeToRefs(displayStore);

const instance = ref<
  | InstanceType<typeof AppBookReadSwipe>
  | InstanceType<typeof DesktopBookReadSwipe>
>();
const checkIsPrev = ref(false);
const checkTTS = ref(false);
const isNewOpen = ref(true);

const size = ref({
  width: document.body.clientWidth,
  height: document.body.clientHeight,
});
const fontScale = ref(1);

const chapterPagedIndex = ref(0);
const chapterIndex = computed(() =>
  getChapterIndex(props.chapterList, props.chapter),
);
const chapterPagedContent = computed<ReaderResult>(() => {
  if (!props.chapterContent)
    return [];
  return getPagedContent(props.chapterContent, props.chapter?.title);
});

// 新增 watch 来处理副作用逻辑
watch(chapterPagedContent, (newContent) => {
  // 越界检查：前进切章时回到首页，避免旧章大页码被钳到新章末页并写入 readingPage
  if (newContent.length > 0) {
    if (chapterPagedIndex.value >= newContent.length) {
      chapterPagedIndex.value
        = (checkIsPrev.value || checkTTS.value) && !props.isPrev
          ? 0
          : newContent.length - 1;
    }
    else if (chapterPagedIndex.value < 0) {
      chapterPagedIndex.value = 0;
    }
  }

  const restartTTS = checkTTS.value && newContent.length > 0 && ttsStore.isReading;
  if (checkTTS.value && newContent.length > 0)
    checkTTS.value = false;

  if (checkIsPrev.value && newContent.length > 0) {
    checkIsPrev.value = false;
    nextTick(() => {
      if (props.isPrev) {
        chapterPagedIndex.value = newContent.length - 1;
      }
      else if (restartTTS) {
        // 听书自动切章：始终从本章首页开始，避免沿用被污染的 readingPage
        chapterPagedIndex.value = 0;
      }
      else if (isNewOpen.value) {
        chapterPagedIndex.value = props.chapter?.readingPage || 0;
      }
      else {
        chapterPagedIndex.value = 0;
      }
      isNewOpen.value = false;
      if (restartTTS)
        seekTTS();
    });
    return;
  }

  if (restartTTS)
    nextTick(() => seekTTS());
});

const prevChapterPagedContent = computed<ReaderResult>(() => {
  if (!props.prevChapterContent)
    return [];
  const res = getPagedContent(
    props.prevChapterContent,
    chapterIndex.value > 0
      ? props.chapterList?.[chapterIndex.value - 1]?.title
      : undefined,
  );
  return res;
});

const nextChapterPagedContent = computed<ReaderResult>(() => {
  if (!props.nextChapterContent)
    return [];
  return getPagedContent(
    props.nextChapterContent,
    chapterIndex.value >= 0
      ? props.chapterList?.[chapterIndex.value + 1]?.title
      : undefined,
  );
});

function getPagedContent(content: string, title?: string) {
  return Reader(content, {
    platform: 'browser', // 平台
    id: '', // canvas 对象
    splitCode: '\r\n', // 段落分割符
    width: size.value.width - bookStore.paddingX * 2, // 容器宽度
    height:
      size.value.height - bookStore.paddingTop - bookStore.paddingBottom - 18, // 容器高度 // 18是底部栏的高度
    fontFamily: bookStore.fontFamily, // 字体
    fontSize: bookStore.fontSize * fontScale.value, // 段落字体大小
    lineHeight: bookStore.lineHeight, // 段落文字行高
    pGap: bookStore.readPGap, // 段落间距
    pIndent: 2,
    title, // 标题
    titleSize: bookStore.fontSize * 1.3 * fontScale.value, // 标题字体大小
    titleHeight: bookStore.lineHeight * 1.3, // 标题文字行高
    titleWeight: 'normal', // 标题文字字重
    titleGap: bookStore.readPGap * 1.3, // 标题距离段落的间距
  });
}

function prevChapter(toLast = false) {
  props.prevChapter(toLast);
}
function nextChapter() {
  const list = props.chapterList;
  const idx = chapterIndex.value;
  // 目录未就绪或对不上时交给父级补目录，避免误判已经读完
  if (!list?.length || idx < 0) {
    chapterPagedIndex.value = 0;
    props.nextChapter();
    return;
  }
  if (idx === list.length - 1) {
    showToast('没有下一章了');
    if (ttsStore.isReading)
      ttsStore.stop();
    return;
  }
  chapterPagedIndex.value = 0;
  props.nextChapter();
}

function toChapter(chapter: BookChapter) {
  if (chapter.id === props.chapter?.id) {
    return;
  }
  chapterPagedIndex.value = 0;
  props.toChapter(chapter);
}

useElementResize(
  '#read-content',
  _.debounce(async () => {
    if (showTabBar.value) {
      return;
    }
    const container = document.querySelector('#read-content');
    const width = container?.clientWidth || document.body.clientWidth;
    const height = container?.clientHeight || document.body.clientHeight;
    size.value = {
      width,
      height,
    };
    await nextTick();
    if (ttsStore.isReading)
      seekCurrentPage();
  }, 500),
);

watch(showTabBar, async () => {
  if (!showTabBar.value) {
    // 防止在showTabBar期间进行了尺寸改变
    const prevSize = { ...size.value };
    const container = document.querySelector('#read-content');
    const width = container?.clientWidth || document.body.clientWidth;
    const height = container?.clientHeight || document.body.clientHeight;
    size.value = {
      width,
      height,
    };
    await nextTick();
    if (prevSize.width !== width || prevSize.height !== height) {
      if (ttsStore.isReading)
        seekCurrentPage();
    }
  }
});

function allPageLines() {
  return _.flatten(chapterPagedContent.value);
}

function linesOfPIndex(pIndex: number): LineData[] {
  return allPageLines().filter(line => line.pIndex === pIndex);
}

function linesOfPIndexOnPage(pageIndex: number, pIndex: number): LineData[] {
  return (chapterPagedContent.value[pageIndex] || []).filter(
    line => line.pIndex === pIndex,
  );
}

function pageIndexOfPIndex(pIndex: number, fromPage = 0): number {
  for (let i = fromPage; i < chapterPagedContent.value.length; i++) {
    if (chapterPagedContent.value[i]?.some(line => line.pIndex === pIndex))
      return i;
  }
  return -1;
}

/** 跨页段落：各页对应的字符区间（相对整段 join 文本） */
function pageCharRangesOfPIndex(pIndex: number) {
  const ranges: { pageIndex: number; charStart: number; charEnd: number }[]
    = [];
  let offset = 0;
  for (let pageIndex = 0; pageIndex < chapterPagedContent.value.length; pageIndex++) {
    const lines = linesOfPIndexOnPage(pageIndex, pIndex);
    if (!lines.length)
      continue;
    const len = lines.map(line => line.text).join('').length;
    ranges.push({
      pageIndex,
      charStart: offset,
      charEnd: offset + len,
    });
    offset += len;
  }
  return ranges;
}

function syncPageBySpeakingChar(pIndex: number, charIndex: number) {
  const ranges = pageCharRangesOfPIndex(pIndex);
  if (!ranges.length)
    return;
  const hit
    = ranges.find(
      range => charIndex >= range.charStart && charIndex < range.charEnd,
    )
    || (charIndex >= ranges[ranges.length - 1].charEnd
      ? ranges[ranges.length - 1]
      : undefined);
  if (hit && hit.pageIndex !== chapterPagedIndex.value)
    chapterPagedIndex.value = hit.pageIndex;
}

function preloadAround(pIndex: number) {
  for (const offset of [1, 2]) {
    const lines = linesOfPIndex(pIndex + offset);
    if (lines.length) {
      ttsStore.generateVoice(
        lines,
        ttsStore.selectedVoice,
        ttsStore.playbackRate,
      );
    }
  }
}

function advanceFrom(pIndex: number) {
  if (linesOfPIndex(pIndex + 1).length) {
    playPIndex(pIndex + 1);
    return;
  }
  nextChapter();
}

/**
 * 整段连续播放；跨页时靠词边界 speakingCharIndex 自动跟页。
 * @param seekCharIndex 从段落中途开始（用户停在续段页时）
 */
function playPIndex(pIndex: number, seekCharIndex = 0) {
  const target = linesOfPIndex(pIndex);
  if (!target.length) {
    advanceFrom(pIndex);
    return;
  }

  const ranges = pageCharRangesOfPIndex(pIndex);
  const startPage
    = ranges.find(
      range =>
        seekCharIndex >= range.charStart && seekCharIndex < range.charEnd,
    )?.pageIndex
    ?? ranges[0]?.pageIndex
    ?? pageIndexOfPIndex(pIndex);
  if (startPage !== -1 && startPage !== chapterPagedIndex.value)
    chapterPagedIndex.value = startPage;

  ttsStore.setSpeakingChapterTitle(props.chapter?.title);
  ttsStore.playVoice(
    target,
    ttsStore.selectedVoice,
    ttsStore.playbackRate,
    () => {
      if (ttsStore.isReading)
        advanceFrom(pIndex);
    },
    seekCharIndex,
  );
  preloadAround(pIndex);
}

/** 从指定段或当前页合适位置开始读 */
function seekTTS(pIndex?: number) {
  if (!chapterPagedContent.value.length)
    return;
  const pageIndex = chapterPagedIndex.value;
  const pageLines = chapterPagedContent.value[pageIndex];
  if (!pageLines?.length) {
    nextChapter();
    return;
  }

  // 从本页顶部开始：标题没有 pFirst（排版里 pFirst 仅用于正文段首），
  // 不能用 find(pFirst)，否则会跳过章节标题。
  const startP
    = pIndex !== undefined && pageLines.some(line => line.pIndex === pIndex)
      ? pIndex
      : pageLines[0]?.pIndex;

  if (startP === undefined) {
    nextChapter();
    return;
  }

  // 本页是跨页续段：从本页字符起点 seek，避免从头读并跳回上页
  const ranges = pageCharRangesOfPIndex(startP);
  const range = ranges.find(item => item.pageIndex === pageIndex);
  const startsHere = pageLines.some(
    line =>
      line.pIndex === startP && (line.pFirst || line.isTitle),
  );
  const seekChar
    = !startsHere && range && range.charStart > 0 ? range.charStart : 0;

  playPIndex(startP, seekChar);
}

function seekCurrentPage() {
  const playing = ttsStore.slideReadingContent?.[0]?.pIndex;
  const pageLines = chapterPagedContent.value[chapterPagedIndex.value];
  if (
    playing !== undefined
    && pageLines?.some(line => line.pIndex === playing)
  ) {
    seekTTS(playing);
    return;
  }
  seekTTS();
}

function playTTS() {
  // 跟页已经让朗读位置落在本页时不要再 seek，否则会倒回去卡顿
  if (ttsStore.isReading && isSpeakingOnCurrentPage())
    return;
  seekTTS();
}

/** 当前朗读进度已经落在可见页内（自动跟页），不是用户跳到尚未读到的位置 */
function isSpeakingOnCurrentPage() {
  const playing = ttsStore.slideReadingContent?.[0]?.pIndex;
  if (playing === undefined)
    return false;
  const range = pageCharRangesOfPIndex(playing).find(
    item => item.pageIndex === chapterPagedIndex.value,
  );
  if (!range)
    return false;
  const char = ttsStore.speakingCharIndex;
  return char >= range.charStart && char < range.charEnd;
}

function skipNextTrack() {
  if (!ttsStore.isReading)
    return;
  nextChapter();
}

function skipPrevTrack() {
  if (!ttsStore.isReading)
    return;
  const playing = ttsStore.slideReadingContent?.[0]?.pIndex ?? 0;
  if (playing > 0) {
    playPIndex(0);
    return;
  }
  prevChapter();
}

onMountedOrActivated(() => {
  ttsStore.registerSkipHandlers({
    next: skipNextTrack,
    prev: skipPrevTrack,
  });
});

// 词边界跟页：朗读字符进入下一页区间时自动翻页
watch(
  () => ttsStore.speakingCharIndex,
  (charIndex) => {
    if (!ttsStore.isReading || charIndex < 0)
      return;
    const pIndex = ttsStore.slideReadingContent?.[0]?.pIndex;
    if (pIndex === undefined)
      return;
    syncPageBySpeakingChar(pIndex, charIndex);
  },
);

watch(
  () => ttsStore.slideReadingContent,
  (newVal) => {
    // 兜底：新段落开始时跳到该段首页（无词边界时也能跟）
    if (!newVal?.[0] || !ttsStore.isReading)
      return;
    const pIndex = newVal[0].pIndex;
    if (linesOfPIndexOnPage(chapterPagedIndex.value, pIndex).length)
      return;
    const targetPage = pageIndexOfPIndex(pIndex);
    if (targetPage !== -1 && targetPage !== chapterPagedIndex.value)
      chapterPagedIndex.value = targetPage;
  },
  { deep: true },
);

watch(
  () => props.chapter?.id,
  (id, prevId) => {
    if (!id)
      return;
    checkIsPrev.value = true;
    checkTTS.value = true;
    // sync：赶在 chapterPagedContent watch 之前重置页码，避免旧章大页码被钳到新章末页
    if (props.isPrev) {
      // 具体末页等分页结果出来后再定
      return;
    }
    // 自动切到下一章时忽略可能被污染的 readingPage，始终从首页听/读
    if (prevId && id !== prevId) {
      chapterPagedIndex.value = 0;
      return;
    }
    chapterPagedIndex.value = props.chapter?.readingPage || 0;
  },
  { flush: 'sync' },
);
watch(chapterPagedIndex, (page) => {
  if (page !== undefined && page >= 0 && props.chapter) {
    emit('update:reading-page', page);
  }
});
// 已合并至上方 watch(chapterPagedContent) 中

onMountedOrActivated(async () => {
  isNewOpen.value = true;
  fontScale.value = (await get_system_font_scale()) as number;
});

function handleKeyDown(e: KeyboardEvent) {
  switch (e.key) {
    case 'ArrowLeft':
      instance.value?.pagePrev();
      break;
    case 'ArrowRight':
      instance.value?.pageNext();
      break;
    case ' ':
    case 'Spacebar':
      // 空格
      instance.value?.toggleMenu();
      break;
    case 'Enter':
      // Enter 键逻辑
      break;
  }
}

// 添加监听
function addListeners() {
  document.addEventListener('keydown', handleKeyDown);
}

// 移除监听
function removeListeners() {
  document.removeEventListener('keydown', handleKeyDown);
}

onMountedOrActivated(() => {
  addListeners();
});

onUnmounted(() => {
  removeListeners();
  ttsStore.registerSkipHandlers({ next: null, prev: null });
});

onDeactivated(() => {
  removeListeners();
});
</script>

<template>
  <PlatformSwitch>
    <template #app>
      <AppBookReadSwipe
        ref="instance"
        v-model:reading-page-index="chapterPagedIndex"
        :book="book"
        :book-source="bookSource"
        :chapter-list="chapterList"
        :reading-chapter="chapter"
        :reading-content="chapterPagedContent"
        :prev-chapter-content="prevChapterPagedContent"
        :next-chapter-content="nextChapterPagedContent"
        :all-source-results="allSourceResults"
        :full-screen-click-to-next="fullScreenClickToNext"
        :in-shelf="inShelf"
        :add-to-shelf="addToShelf"
        :show-view-setting="showViewSetting"
        :show-setting="showSetting"
        :show-switch-source="showSwitchSource"
        :to-chapter="toChapter"
        :prev-chapter="prevChapter"
        :next-chapter="nextChapter"
        :refresh-chapter="refreshChapter"
        :refresh-chapters="refreshChapters"
        :play-tts="playTTS"
        :on-download="onDownload"
      />
    </template>
    <template #desktop>
      <DesktopBookReadSwipe
        ref="instance"
        v-model:reading-page-index="chapterPagedIndex"
        :book="book"
        :book-source="bookSource"
        :chapter-list="chapterList"
        :reading-chapter="chapter"
        :reading-content="chapterPagedContent"
        :prev-chapter-content="prevChapterPagedContent"
        :next-chapter-content="nextChapterPagedContent"
        :all-source-results="allSourceResults"
        :full-screen-click-to-next="fullScreenClickToNext"
        :in-shelf="inShelf"
        :add-to-shelf="addToShelf"
        :show-view-setting="showViewSetting"
        :show-setting="showSetting"
        :show-switch-source="showSwitchSource"
        :to-chapter="toChapter"
        :prev-chapter="prevChapter"
        :next-chapter="nextChapter"
        :refresh-chapter="refreshChapter"
        :refresh-chapters="refreshChapters"
        :play-tts="playTTS"
        :on-download="onDownload"
      />
    </template>
    <slot />
  </PlatformSwitch>
</template>

<style scoped lang="less"></style>
