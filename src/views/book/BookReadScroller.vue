<script setup lang="ts">
import type {
  BookChapter,
  BookItem,
  BookChapterList as ChapterList,
} from '@wuji-tauri/source-extension';
import type { BookSource } from '@/types';

import PlatformSwitch from '@/components/platform/PlatformSwitch.vue';
import AppBookReadScroll from '@/layouts/app/book/BookReadScroll.vue';
import DesktopBookReadScroll from '@/layouts/desktop/book/BookReadScroll.vue';

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
    loadChapterContent: (chapter: BookChapter) => Promise<string>;
    onDownload: () => void;
  }>(),
  {
    isPrev: false,
  },
);
</script>

<template>
  <PlatformSwitch>
    <template #app>
      <AppBookReadScroll v-bind="props" />
    </template>
    <template #desktop>
      <DesktopBookReadScroll v-bind="props" />
    </template>
    <slot />
  </PlatformSwitch>
</template>

<style scoped lang="less"></style>
