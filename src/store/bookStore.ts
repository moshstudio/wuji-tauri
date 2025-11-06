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
    // === 经典纯色主题 ===
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
      name: '羊皮卷',
      color: '#5a4a42',
      bgColor: '#f8f4e9',
    },
    {
      name: '深空黑',
      color: '#e0e0e0',
      bgColor: '#111',
    },
    {
      name: '石墨灰',
      color: '#666',
      bgColor: '#000',
    },

    // === 特色阅读主题 ===
    {
      name: '晨光微曦',
      color: '#3a332a',
      bgColor: '#fff9f0',
      bgGradient: 'linear-gradient(135deg, #fff9f0 0%, #fff2e0 100%)',
    },
    {
      name: '暮色降临',
      color: '#e8e0d0',
      bgColor: '#2d3748',
      bgGradient: 'linear-gradient(135deg, #2d3748 0%, #4a5568 100%)',
    },
    {
      name: '月光银',
      color: '#374151',
      bgColor: '#f8fafc',
      bgGradient: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
    },
    {
      name: '咖啡时光',
      color: '#5c4b37',
      bgColor: '#f3e9dd',
      bgGradient: 'linear-gradient(135deg, #f3e9dd 0%, #e8dccc 100%)',
    },

    // === 条纹主题 ===
    {
      name: '书写横线',
      color: '#333333',
      bgColor: '#fefefe',
      bgImage:
        'repeating-linear-gradient(0deg, transparent, transparent 23px, #e0e0e0 23px, #e0e0e0 24px)',
      bgRepeat: 'repeat',
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
      name: '浅灰条纹',
      color: '#2c2c2c',
      bgColor: '#fafafa',
      bgImage:
        'repeating-linear-gradient(0deg, #fafafa, #fafafa 20px, #f0f0f0 20px, #f0f0f0 40px)',
      bgRepeat: 'repeat',
    },

    // === 网格主题 ===
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
      name: '暗色网格',
      color: '#d0d0d0',
      bgColor: '#1e1e1e',
      bgImage:
        'linear-gradient(rgba(80,80,80,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(80,80,80,0.2) 1px, transparent 1px)',
      bgSize: '20px 20px',
      bgRepeat: 'repeat',
    },
    {
      name: '点阵网格',
      color: '#333333',
      bgColor: '#ffffff',
      bgImage: 'radial-gradient(circle, #cccccc 1px, transparent 1px)',
      bgSize: '20px 20px',
      bgRepeat: 'repeat',
    },

    // === 复古特色 ===
    {
      name: '古籍黄',
      color: '#4a3c2a',
      bgColor: '#f5eada',
      bgImage:
        'repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(139,115,85,0.05) 1px, rgba(139,115,85,0.05) 2px)',
      bgRepeat: 'repeat',
    },
    {
      name: '羊皮纸',
      color: '#5a4a3a',
      bgColor: '#f8f2e5',
      bgImage: 'linear-gradient(rgba(200,180,150,0.1) 1px, transparent 1px)',
      bgSize: '100% 24px',
      bgRepeat: 'repeat',
    },
    {
      name: '青瓷',
      color: '#2a4a3a',
      bgColor: '#f0f8f0',
      bgGradient: 'linear-gradient(135deg, #f0f8f0 0%, #e8f0e8 100%)',
    },
    {
      name: '淡紫梦境',
      color: '#4a3a5a',
      bgColor: '#f8f4ff',
      bgGradient: 'linear-gradient(135deg, #f8f4ff 0%, #f0e8ff 100%)',
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
