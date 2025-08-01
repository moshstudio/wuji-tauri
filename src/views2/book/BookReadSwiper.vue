<script setup lang="ts">
import type { BookChapter, BookItem } from '@wuji-tauri/source-extension';
import type { BookSource } from '@/types';
import type { LineData, ReaderResult } from '@/utils/reader/types';
import PlatformSwitch from '@/components2/platform/PlatformSwitch.vue';

import { useBookStore, useDisplayStore, useTTSStore } from '@/store';
import { useElementResize } from '@/utils';

import Reader from '@/utils/reader/reader-layout';
import _ from 'lodash';
import { get_system_font_scale } from 'tauri-plugin-commands-api';

import { computed, nextTick, onActivated, onMounted, ref, watch } from 'vue';
import AppBookReadSwipe from '@/layouts/app/book/BookReadSwipe.vue';
import DesktopBookReadSwipe from '@/layouts/desktop/book/BookReadSwipe.vue';
import { ChapterList } from '@wuji-tauri/source-extension/dist/book';
import { storeToRefs } from 'pinia';
import { showToast } from 'vant';

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
  }>(),
  {
    isPrev: false,
  },
);

const displayStore = useDisplayStore();
const { showTabBar } = storeToRefs(displayStore);
const checkIsPrev = ref(false);
const checkTTS = ref(false);

const size = ref({
  width: document.body.clientWidth,
  height: document.body.clientHeight,
});
const fontScale = ref(1);

const chapterPagedIndex = ref(0);
const chapterIndex = computed(() => {
  return (
    props.chapterList?.findIndex((item) => item.id === props.chapter?.id) || 0
  );
});
const chapterPagedContent = computed<ReaderResult>(() => {
  if (!props.chapterContent) return [];
  const res = getPagedContent(props.chapterContent, props.chapter?.title);
  if (checkIsPrev.value) {
    checkIsPrev.value = false;
    nextTick(() => {
      if (props.isPrev && res.length > 0) {
        chapterPagedIndex.value = res.length - 1;
      } else {
        chapterPagedIndex.value = 0;
      }
    });
  }
  if (checkTTS.value) {
    checkTTS.value = false;
    nextTick(() => {
      if (ttsStore.isReading) {
        ttsStore.stop();
        playTTS();
      }
    });
  }

  return res;
});

const prevChapterPagedContent = computed<ReaderResult>(() => {
  if (!props.prevChapterContent) return [];
  const res = getPagedContent(
    props.prevChapterContent,
    props.chapterList?.[chapterIndex.value - 1]?.title,
  );
  return res;
});

const nextChapterPagedContent = computed<ReaderResult>(() => {
  if (!props.nextChapterContent) return [];
  return getPagedContent(
    props.nextChapterContent,
    props.chapterList?.[chapterIndex.value + 1]?.title,
  );
});

const bookStore = useBookStore();
const ttsStore = useTTSStore();

function getPagedContent(content: string, title?: string) {
  return Reader(content, {
    platform: 'browser', // 平台
    id: '', // canvas 对象
    splitCode: '\r\n', // 段落分割符
    width: size.value.width - bookStore.paddingX * 2, // 容器宽度
    height:
      size.value.height - bookStore.paddingTop - bookStore.paddingBottom - 18, // 容器高度 // 18是底部栏的高度
    fontSize: bookStore.fontSize * fontScale.value, // 段落字体大小
    lineHeight: bookStore.lineHeight, // 段落文字行高
    pGap: bookStore.readPGap, // 段落间距
    pIndent: 2,
    title: title, // 标题
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
  if (chapterIndex.value === (props.chapterList?.length || 1) - 1) {
    showToast('没有下一章了');
    if (ttsStore.isReading) {
      ttsStore.stop();
    }
  } else {
    chapterPagedIndex.value = 0;
    props.nextChapter();
  }
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
    if (ttsStore.isReading) {
      ttsStore.stop();
      playTTS();
    }
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
      if (ttsStore.isReading) {
        ttsStore.stop();
        playTTS();
      }
    }
  }
});

const playTTS = () => {
  if (!chapterPagedContent.value.length) {
    return;
  }
  const toNext = () => {
    if (chapterPagedIndex.value == chapterPagedContent.value!.length - 1) {
      // 去下一章
      nextChapter();
      return;
    } else {
      // 去下一页
      chapterPagedIndex.value += 1;
      playTTS();
      return;
    }
  };
  const playing = ttsStore.slideReadingContent;
  const currPageLines = chapterPagedContent.value[chapterPagedIndex.value];
  if (!currPageLines.length) {
    // 当前页面为空，去下一页或下一章
    toNext();
    return;
  }
  let target: LineData[];
  if (!playing?.length) {
    // 没有历史记录，从头开始阅读

    target = _.flatten(chapterPagedContent.value).filter(
      (line) => line.pIndex === currPageLines[0].pIndex,
    );
  } else {
    const currPIndex = playing[0].pIndex;
    if (
      currPIndex < currPageLines[0].pIndex ||
      currPIndex > currPageLines[currPageLines.length - 1].pIndex
    ) {
      // 从头开始读
      target = _.flatten(chapterPagedContent.value).filter(
        (line) => line.pIndex === currPageLines[0].pIndex,
      );
    } else if (currPIndex < currPageLines[currPageLines.length - 1].pIndex) {
      // 还在当前页面中
      target = _.flatten(chapterPagedContent.value).filter(
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
        playTTS();
      }
    },
  );
  // 缓存后两段内容
  const forward1 = _.flatten(chapterPagedContent.value).filter(
    (line) => line.pIndex === target[0].pIndex + 1,
  );
  if (forward1.length) {
    ttsStore.generateVoice(
      forward1,
      ttsStore.selectedVoice,
      ttsStore.playbackRate,
    );
  }
  const forward2 = _.flatten(chapterPagedContent.value).filter(
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

watch(
  () => props.chapter,
  () => {
    checkIsPrev.value = true;
    checkTTS.value = true;
  },
);
watch(chapterPagedIndex, (page) => {
  if (page != undefined && page >= 0 && props.chapter) {
    props.chapter.readingPage = page;
  }
});
watch(chapterPagedContent, () => {
  if (chapterPagedIndex.value < 0) {
    chapterPagedIndex.value = 0;
  }
});

onMounted(async () => {
  fontScale.value = (await get_system_font_scale()) as number;
  await nextTick();
  if (props.chapter?.readingPage && props.chapter?.readingPage >= 0) {
    chapterPagedIndex.value = props.chapter.readingPage;
  }
});
</script>

<template>
  <PlatformSwitch>
    <template #app>
      <AppBookReadSwipe
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
        :play-tts="playTTS"
      />
    </template>
    <template #desktop>
      <DesktopBookReadSwipe
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
        :play-tts="playTTS"
      />
    </template>
    <slot></slot>
  </PlatformSwitch>
</template>

<style scoped lang="less"></style>
