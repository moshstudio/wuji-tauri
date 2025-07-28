import type { BookChapter, BookItem } from '@wuji-tauri/source-extension';
import type { ReadTheme } from '@/types/book';
import { useStorageAsync } from '@vueuse/core';
import { defineStore } from 'pinia';
import { computed, ref, watch } from 'vue';
import { useDisplayStore } from './displayStore';

export const useBookStore = defineStore('book', () => {
  const displayStore = useDisplayStore();
  const readMode = ref<'slide' | 'scroll'>(
    displayStore.isAppView ? 'slide' : 'scroll',
  );
  watch(
    () => displayStore.isAppView,
    () => {
      readMode.value = displayStore.isAppView ? 'slide' : 'scroll';
    },
  );
  const fontSize = useStorageAsync('readFontSize', 20);
  const fontFamily = useStorageAsync('eradFontFamily', 'alipuhui');
  const lineHeight = useStorageAsync('readLineHeight', 1.5);
  const readPGap = useStorageAsync('readPGap', 8);
  const underline = useStorageAsync('readUnderline', false);
  const paddingX = useStorageAsync('readPaddingX', 16);
  const paddingTop = useStorageAsync('readPaddingTop', 4);
  const paddingBottom = useStorageAsync('readPaddingBottom', 18);

  const defaultThemes: ReadTheme[] = [
    {
      name: '默认',
      color: 'var(--van-text-color)',
      bgColor: 'var(--van-background)',
    },
    {
      name: '预设1',
      color: '#adadad',
      bgColor: '#000',
    },
    {
      name: '预设2',
      color: '#fff',
      bgColor: '#000',
    },
    {
      name: '预设3',
      color: '#dcdfe1',
      bgColor: '#3c3f43',
    },
    {
      name: '预设4',
      color: '#90bff5',
      bgColor: '#3c3f43',
    },
    {
      name: '预设5',
      color: '#000',
      bgColor: '#f5f5f5',
    },
    {
      name: '预设6',
      color: '#060606',
      bgColor: '#F5F1E8',
    },
    {
      name: '预设7',
      color: '#060606',
      bgColor: '#EFE2C0',
    },
    {
      name: '预设8',
      color: '#060606',
      bgColor: '#E0EEE1',
    },
  ];
  const customThemes = useStorageAsync<ReadTheme[]>('customReadThemes', []);
  const themes = computed(() => [...defaultThemes, ...customThemes.value]);
  const currTheme = useStorageAsync<ReadTheme>('readTheme', defaultThemes[0]);
  const fullScreenClickToNext = useStorageAsync(
    'readFullScreenClickToNext',
    false,
  );

  const readingBook = ref<BookItem>();
  const readingChapter = ref<BookChapter>();

  const chapterCacheNum = useStorageAsync('readChapterCacheNum', 10);

  return {
    readMode,
    fontSize,
    fontFamily,
    lineHeight,
    readPGap,
    underline,
    paddingX,
    paddingTop,
    paddingBottom,

    themes,
    currTheme,

    fullScreenClickToNext,

    readingBook,
    readingChapter,
    chapterCacheNum,
  };
});
