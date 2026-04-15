import type {
  BookChapter,
  BookItem,
  BookShelf,
} from '@wuji-tauri/source-extension';
import type { BookHistory } from '@/types/book';
import { debounceFilter, useStorage, useStorageAsync } from '@vueuse/core';
import _ from 'lodash';
import { nanoid } from 'nanoid';

import { defineStore } from 'pinia';
import { showToast } from 'vant';
import { useBookChapterStore } from './bookChaptersStore';
import { useStore } from './store';
import { createKVStore } from './utils';

export const useBookShelfStore = defineStore('bookShelfStore', () => {
  const kvStorage = createKVStore('bookShelfStore');
  const storage = kvStorage.storage;

  const historyKVStorage = createKVStore('bookHistoryStore');
  const historyStorage = historyKVStorage.storage;

  // 书籍书架⬇️
  const bookShelf = useStorageAsync<BookShelf[]>(
    'bookShelf',
    [
      {
        id: nanoid(),
        name: '默认书架',
        books: [],
        createTime: Date.now(),
      },
    ],
    storage,
    {
      eventFilter: debounceFilter(1000),
    },
  );

  const tabIndex = useStorage<number>('bookShelfTabIndex', 0);

  // 阅读历史
  const bookHistory = useStorageAsync<Array<BookHistory>>(
    'bookHistory',
    [],
    historyStorage,
    {
      eventFilter: debounceFilter(1000),
    },
  );

  const createBookShelf = (name: string) => {
    if (bookShelf.value.some(item => item.name === name)) {
      // 书架已存在
    }
    else {
      bookShelf.value.push({
        id: nanoid(),
        name,
        books: [],
        createTime: Date.now(),
      });
    }
  };

  const isBookInHistory = (book: BookItem | string): boolean => {
    const id = typeof book === 'string' ? book : book.id;
    return !!bookHistory.value.find(b => b.book.id === id);
  };

  const isBookInShelf = (
    book: BookItem | string,
    shelfId?: string,
  ): boolean => {
    let id: string;
    if (typeof book === 'string') {
      id = book;
    }
    else {
      id = book.id;
    }
    if (shelfId) {
      return !!bookShelf.value
        .find(shelf => shelf.id === shelfId)
        ?.books
        .find(b => b.book.id === id);
    }
    else {
      for (const shelf of bookShelf.value) {
        const find = shelf.books.find(b => b.book.id === id);
        if (find) {
          return true;
        }
      }
    }
    return false;
  };

  const removeBookShelf = (shelfId: string) => {
    if (bookShelf.value.length === 1) {
      showToast('至少需要保留一个书架');
      return false;
    }
    const find = bookShelf.value.find(item => item.id === shelfId);
    bookShelf.value = bookShelf.value.filter(item => item.id !== shelfId);
    if (find) {
      const bookChapterStore = useBookChapterStore();
      find.books.forEach((book) => {
        if (!isBookInShelf(book.book)) {
          // 确保不在其他书架中也存在
          bookChapterStore.removeBookCache(book.book);
        }
      });
    }
  };

  const updateBookHistoryInfo = (bookItem: BookItem, chapter?: BookChapter) => {
    const clonedChapter = chapter ? _.cloneDeep(chapter) : undefined;
    const book = bookHistory.value.find(item => item.book.id === bookItem.id);
    if (book) {
      book.lastReadTime = Date.now();
      if (!clonedChapter) {
        book.lastReadChapter = undefined;
      }
      else {
        book.lastReadChapter = clonedChapter;
      }
      bookHistory.value = [...bookHistory.value].sort(
        (a, b) => b.lastReadTime - a.lastReadTime,
      );
    }
    else {
      bookHistory.value = [
        {
          book: bookItem,
          lastReadChapter: chapter,
          lastReadTime: Date.now(),
        },
        ...bookHistory.value,
      ]
        .sort((a, b) => b.lastReadTime - a.lastReadTime)
        .slice(0, 50); // 增加历史记录限制
    }
  };

  const updateBookReadInfo = (bookItem: BookItem, chapter: BookChapter) => {
    if (!bookShelf.value)
      return;
    const clonedChapter = _.cloneDeep(chapter);
    for (const shelf of bookShelf.value) {
      for (const book of shelf.books) {
        if (book.book.id === bookItem.id) {
          book.lastReadChapter = clonedChapter;
          book.lastReadTime = Date.now();
        }
      }
    }
    updateBookHistoryInfo(bookItem, clonedChapter);
  };

  const clearBookHistory = () => {
    bookHistory.value = [];
  };

  const addToBookShelf = (book: BookItem, shelfId?: string) => {
    const targetId = shelfId || bookShelf.value[0]?.id;
    if (!targetId)
      return;
    const shelf = bookShelf.value.find(item => item.id === targetId);
    if (shelf) {
      if (!shelf.books.find(b => b.book.id === book.id)) {
        shelf.books.push({
          book,
          lastReadTime: Date.now(),
        });
      }
    }
  };

  const deleteBookFromShelf = (bookItem: BookItem, shelfId: string) => {
    const shelf = bookShelf.value.find(item => item.id === shelfId);
    if (!shelf)
      return;
    _.remove(shelf.books, item => item.book.id === bookItem.id);
  };

  const bookRefreshChapters = async () => {
    const store = useStore();
    await Promise.all(
      bookShelf.value.map(async (shelf) => {
        await Promise.all(
          shelf.books.map(async (book) => {
            const source = store.getBookSource(book.book.sourceId);
            if (source) {
              const detail = await store.bookDetail(source, book.book);
              if (detail) {
                book.book = detail;
              }
            }
          }),
        );
      }),
    );
    showToast('刷新章节完成');
  };

  const syncData = () => {
    const clone = _.cloneDeep(bookShelf.value);
    clone.forEach((shelf) => {
      shelf.books.forEach((book) => {
        book.book.chapters = undefined;
      });
    });
    return clone;
  };

  const loadSyncData = async (data: BookShelf[]) => {
    bookShelf.value = data;
    for (const shelf of bookShelf.value) {
      for (const book of shelf.books) {
        if (isBookInHistory(book.book)) {
          updateBookHistoryInfo(book.book, book.lastReadChapter);
        }
      }
    }
  };

  const clear = async () => {
    bookShelf.value = [
      {
        id: nanoid(),
        name: '默认书架',
        books: [],
        createTime: Date.now(),
      },
    ];
    clearBookHistory();
    await storage.clear();
  };

  return {
    storage,
    bookShelf,
    bookHistory,
    tabIndex,
    createBookShelf,
    removeBookShelf,
    isBookInShelf,
    isBookInHistory,
    addToBookShelf,
    removeBookFromShelf: deleteBookFromShelf,
    updateBookReadInfo,
    updateBookHistoryInfo,
    clearBookHistory,
    deleteBookFromShelf,
    bookRefreshChapters,
    syncData,
    loadSyncData,
    clear,
  };
});
