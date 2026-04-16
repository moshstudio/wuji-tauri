import type {
  BookChapter,
  BookExtension,
  BookItem,
} from '@wuji-tauri/source-extension';
import type { BookSource } from '@/types';
import type { ReadTheme } from '@/types/book';
import { debounceFilter, useStorageAsync } from '@vueuse/core';
import _ from 'lodash';
import { defineStore } from 'pinia';
import { showFailToast } from 'vant';
import { computed, onMounted, ref, triggerRef } from 'vue';
import { sleep } from '@/utils';
import { createCancellableFunction } from '@/utils/cancelableFunction';
import { useBookChapterStore } from './bookChaptersStore';
import { useBookShelfStore } from './bookShelfStore';
import { useExtensionStore } from './extensionStore';
import { useServerStore } from './serverStore';
import { createKVStore } from './utils';

export const useBookStore = defineStore('book', () => {
  const serverStore = useServerStore();

  const readMode = useStorageAsync<'slide' | 'scroll'>('readMode', 'slide');
  const webFonts = ref([
    {
      label: '默认',
      family: '\'alipuhui\',\'sans-serif\'',
    },
    {
      label: '黑体',
      family: '\'Source Han Sans SC VF\',\'sans-serif\'',
    },
    {
      label: '仿宋',
      family: '\'FZFangSong-Z02S\',\'serif\'',
      feature: 'book_font',
    },
    {
      label: '文楷',
      family: '\'LXGW WenKai GB Screen\',\'serif\'',
      feature: 'book_font',
    },
    {
      label: '圆体',
      family: '\'MaoKenZhuYuanTi\',\'sans-serif\'',
      feature: 'book_font',
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

  const kvStorage = createKVStore();
  const extensionStore = useExtensionStore();
  const bookChapterStore = useBookChapterStore();
  const bookShelfStore = useBookShelfStore();

  const bookSources = useStorageAsync<BookSource[]>(
    'bookSources',
    [],
    kvStorage.storage,
    {
      eventFilter: debounceFilter(1000),
    },
  );

  /**
   * 获取推荐列表
   */
  const bookRecommendList = async (
    source: BookSource,
    pageNo: number = 1,
    type?: string,
  ) => {
    const sc = (await extensionStore.getSourceClass(
      source.item,
    )) as BookExtension;
    const res = await sc?.execGetRecommendBooks(pageNo, type);

    if (res) {
      if (!type) {
        // 1. 获取的不是指定type类型的数据，直接赋值
        source.list = res;
      }
      else {
        // 2. 获取的是指定type类型的数据，判断是否已经存在，不存在则添加
        const find = _.castArray(source.list).find(
          item => item.type === type,
        );
        if (find) {
          _.assign(find, res);
        }
        else {
          source.list = [..._.castArray(source.list), ..._.castArray(res)];
        }
      }
    }
    else {
      if (!type) {
        source.list = undefined;
      }
    }
    triggerRef(bookSources);
  };

  const bookSearch = async (
    source: BookSource,
    keyword: string,
    pageNo: number = 1,
  ) => {
    const sc = (await extensionStore.getSourceClass(
      source.item,
    )) as BookExtension;
    const res = await sc?.execSearch(keyword, pageNo);
    if (res) {
      if (!_.isArray(res) && !res.list.length) {
        source.list = undefined;
        return;
      }
      source.list = res;
    }
    else {
      source.list = undefined;
    }
    triggerRef(bookSources);
  };

  const bookDetail = async (source: BookSource, book: BookItem) => {
    const sc = (await extensionStore.getSourceClass(
      source.item,
    )) as BookExtension;
    const res = await sc?.execGetBookDetail(book);
    if (res) {
      return res;
    }
    else {
      showFailToast(`${source.item.name} 获取内容失败`);
      return null;
    }
  };

  const cacheBookChapters = createCancellableFunction(
    async (
      signal: AbortSignal,
      source: BookSource,
      book: BookItem,
      chapter: BookChapter,
    ) => {
      if (!book.chapters)
        return;
      const index = book.chapters.findIndex(item => item.id === chapter.id);
      if (index === -1)
        return;
      let count = 1;
      while (count <= chapterCacheNum.value) {
        if (signal.aborted) {
          return;
        }
        const targetChapter = book.chapters[index + count];
        if (targetChapter) {
          await bookRead(source, book, targetChapter, {
            cacheMoreChapters: false,
          });
        }
        count += 1;
        if (count >= book.chapters.length) {
          return;
        }
      }
    },
  );

  async function bookRead(
    source: BookSource,
    book: BookItem,
    chapter: BookChapter,
    options?: {
      cacheMoreChapters?: boolean;
      refresh?: boolean;
    },
  ): Promise<string | null> {
    options ||= {};
    if (options.cacheMoreChapters === undefined) {
      options.cacheMoreChapters = true;
    }
    if (options.refresh === undefined) {
      options.refresh = false;
    }
    if (!options.refresh) {
      const content = await bookChapterStore.getBookChapter(book, chapter);
      if (content) {
        if (options.cacheMoreChapters) {
          // 缓存书籍
          cacheBookChapters(source, book, chapter).catch(() => {});
        }
        return content;
      }
    }

    const sc = (await extensionStore.getSourceClass(
      source.item,
    )) as BookExtension;
    const res = await sc?.execGetContent(book, chapter);
    if (res) {
      await bookChapterStore.saveBookChapter(book, chapter, res);
      if (options.cacheMoreChapters) {
        // 缓存书籍
        cacheBookChapters(source, book, chapter).catch(() => {});
      }
    }

    return res;
  }

  const getBookSource = (sourceId: string): BookSource | undefined => {
    return bookSources.value.find(item => item.item.id === sourceId);
  };

  const getBookItem = (
    source: BookSource,
    bookId: string,
  ): BookItem | undefined => {
    const checkFromShelf = () => {
      for (const shelf of bookShelfStore.bookShelf) {
        for (const book of shelf.books) {
          if (book.book.id === bookId) {
            return book.book;
          }
        }
      }
    };
    const checkFromHistory = () => {
      for (const book of bookShelfStore.bookHistory) {
        if (book.book.id === bookId) {
          return book.book;
        }
      }
    };
    const fromSource = () => {
      if (source.list) {
        for (const bookList of _.castArray(source.list)) {
          for (const bookItem of bookList.list) {
            if (bookItem.id === bookId) {
              return bookItem;
            }
          }
        }
      }
    };

    // 优先从书架中获取
    if (bookShelfStore.isBookInShelf(bookId)) {
      return checkFromShelf();
    }
    else {
      return checkFromHistory() || fromSource();
    }
  };

  onMounted(async () => {
    await sleep(2000);
    if (!serverStore.hasFeature('book_font')) {
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
    bookSources,
    bookRecommendList,
    bookSearch,
    bookDetail,
    bookRead,
    cacheBookChapters,
    getBookSource,
    getBookItem,
  };
});
