import type { BookChapter, BookItem } from '@wuji-tauri/source-extension';
import type { ReadTheme } from '@/types/book';
import { useStorageAsync } from '@vueuse/core';
import { defineStore } from 'pinia';
import { computed, onMounted, ref, watch } from 'vue';
import { useDisplayStore } from './displayStore';
import { useServerStore } from './serverStore';
import { sleep } from '@/utils';

export const useBookStore = defineStore('book', () => {
  const displayStore = useDisplayStore();
  const serverStore = useServerStore();

  const readMode = ref<'slide' | 'scroll'>(
    displayStore.isAppView ? 'slide' : 'scroll',
  );
  watch(
    () => displayStore.isAppView,
    () => {
      readMode.value = displayStore.isAppView ? 'slide' : 'scroll';
    },
  );
  const webFonts = ref([
    {
      label: '默认',
      family: "'alipuhui','sans-serif'",
      isVip: false,
    },
    {
      label: '黑体',
      family: "'Source Han Sans SC VF','sans-serif'",
      isVip: false,
    },
    {
      label: '仿宋',
      family: "'FZFangSong-Z02S','serif'",
      isVip: true,
    },
    {
      label: '文楷',
      family: "'LXGW WenKai GB Screen','serif'",
      isVip: true,
    },
    {
      label: '圆体',
      family: "'MaoKenZhuYuanTi','sans-serif'",
      isVip: true,
    },
  ]);
  const fontSize = useStorageAsync('readFontSize', 20);
  const fontWeight = useStorageAsync('readFontWeight', 400);
  const fontFamily = useStorageAsync('readFontFamily', 'alipuhui');
  const lineHeight = useStorageAsync('readLineHeight', 1.5);
  const readPGap = useStorageAsync('readPGap', 8);
  const underline = useStorageAsync('readUnderline', false);
  const paddingX = useStorageAsync('readPaddingX', 16);
  const paddingTop = useStorageAsync('readPaddingTop', 4);
  const paddingBottom = useStorageAsync('readPaddingBottom', 18);

  const defaultThemes: ReadTheme[] = [
    // === 浅色主题 (8个) ===
    {
      name: '默认',
      color: 'var(--van-text-color)',
      bgColor: 'var(--van-background)',
    },
    {
      name: '纸白',
      color: '#2c2c2c',
      bgColor: '#f8f9fa',
    },
    {
      name: '护眼绿',
      color: '#2d2725',
      bgColor: '#e8f4ea',
    },
    {
      name: '暖米黄',
      color: '#4a423a',
      bgColor: '#f6f0e5',
    },
    {
      name: '晨光微曦',
      color: '#3a332a',
      bgColor: '#fff9f0',
      bgGradient: 'linear-gradient(135deg, #fff9f0 0%, #fff2e0 100%)',
    },
    {
      name: '书写横线',
      color: '#333333',
      bgColor: '#fefefe',
      bgImage:
        'repeating-linear-gradient(0deg, transparent, transparent 23px, #e0e0e0 23px, #e0e0e0 24px)',
      bgRepeat: 'repeat',
    },
    {
      name: '方格笔记',
      color: '#2c2c2c',
      bgColor: '#ffffff',
      bgImage:
        'linear-gradient(#e8e8e8 1px, transparent 1px), linear-gradient(90deg, #e8e8e8 1px, transparent 1px)',
      bgSize: '20px 20px',
      bgRepeat: 'repeat',
    },
    {
      name: '古籍黄',
      color: '#4a3c2a',
      bgColor: '#f5eada',
      bgImage:
        'repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(139,115,85,0.05) 1px, rgba(139,115,85,0.05) 2px)',
      bgRepeat: 'repeat',
    },

    // === 暗色主题 (8个) ===
    {
      name: '深空黑',
      color: '#e0e0e0',
      bgColor: '#000',
    },
    {
      name: '石墨灰',
      color: '#aaa',
      bgColor: '#000',
    },
    {
      name: '暮色降临',
      color: '#e8e0d0',
      bgColor: '#2d3748',
      bgGradient: 'linear-gradient(135deg, #2d3748 0%, #4a5568 100%)',
    },
    {
      name: '夜读横线',
      color: '#d0d0d0',
      bgColor: '#1a1a1a',
      bgImage:
        'repeating-linear-gradient(0deg, transparent, transparent 23px, #333333 23px, #333333 24px)',
      bgRepeat: 'repeat',
    },
    {
      name: '暗色网格',
      color: '#d0d0d0',
      bgColor: '#1e1e1e',
      bgImage:
        'linear-gradient(rgba(80,80,80,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(80,80,80,0.2) 1px, transparent 1px)',
      bgSize: '20px 20px',
      bgRepeat: 'repeat',
    },

    // === 特别适合低亮度阅读的暗色主题 (2个) ===
    {
      name: '柔光暗色',
      color: '#b0b0b0', // 降低对比度，减少眩光
      bgColor: '#1a1a1a', // 不是纯黑，减轻眼睛压力
    },
    {
      name: '暖色暗调',
      color: '#d0c8b8', // 暖色调文字，更柔和
      bgColor: '#2a2620', // 暖色背景，减少蓝光刺激
      bgGradient: 'linear-gradient(135deg, #2a2620 0%, #1e1c18 100%)',
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

  onMounted(async () => {
    await sleep(2000);
    if (!serverStore.isVipOrSuperVip) {
      // 非会员用户使用默认字体
      fontFamily.value = 'alipuhui';
    }
  });

  return {
    readMode,
    fontSize,
    fontWeight,
    webFonts,
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
