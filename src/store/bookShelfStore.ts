import type { BookChapter, BookItem, BookShelf } from '@/extensions/book';
import { useStorageAsync } from '@vueuse/core';
import _ from 'lodash';
import { nanoid } from 'nanoid';
import { defineStore } from 'pinia';

import { showToast } from 'vant';
import { ref } from 'vue';
import { useBookChapterStore } from './bookChaptersStore';
import { useStore } from './store';
import { createKVStore } from './utils';

export const useBookShelfStore = defineStore('bookShelfStore', () => {
  const kvStorage = createKVStore('bookShelfStore');

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
    kvStorage.storage,
  );
  const bookChapterRefreshing = ref(false);

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
  const removeBookShelf = (shelfId: string) => {
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
  const addToBookSelf = (bookItem: BookItem, shelfId?: string): boolean => {
    /**
       const shelf = shelfId
      ? photoShelf.value.find((item) => item.id === shelfId)
      : photoShelf.value[0];
    if (!shelf) {
      showToast('收藏夹不存在');
      return false;
    }

    if (shelf.photos.find((i) => i.id === item.id)) {
      showToast('已存在');
      return false;
    } else {
      item.extra ||= {};
      item.extra.selected ||= false; // 用作从书架中删除
      shelf.photos.push(_.cloneDeep(item));
      showToast(`已添加到 ${shelf.name}`);
      return true;
    }
     */
    if (!bookShelf.value.length) {
      showToast('书架为空，请先创建书架');
      return false;
    }
    const shelf = shelfId
      ? bookShelf.value.find(item => item.id === shelfId)
      : bookShelf.value[0];
    if (!shelf) {
      showToast('书架不存在');
      return false;
    }
    if (shelf.books.find(item => item.book.id === bookItem.id)) {
      showToast('书架中已存在此书');
      return false;
    }
    shelf.books.push({
      book: _.cloneDeep(bookItem),
      createTime: Date.now(),
    });
    showToast(`已添加到 ${shelf.name}`);
    return true;
  };
  const removeBookFromShelf = (bookItem: BookItem, shelfId?: string) => {
    if (!bookShelf.value.length) {
      showToast('书架为空');
      return;
    }
    if (!shelfId)
      shelfId = bookShelf.value[0].id;
    const shelf = bookShelf.value.find(item => item.id === shelfId);
    if (!shelf) {
      showToast('书架不存在');
      return;
    }
    _.remove(shelf.books, item => item.book.id === bookItem.id);
    if (!isBookInShelf(bookItem)) {
      const bookChapterStore = useBookChapterStore();
      bookChapterStore.removeBookCache(bookItem);
    }
  };
  const updateBookReadInfo = (bookItem: BookItem, chapter: BookChapter) => {
    if (!bookShelf.value)
      return;
    for (const shelf of bookShelf.value) {
      for (const book of shelf.books) {
        if (book.book.id === bookItem.id) {
          if (book.book.chapters?.find(item => item.id === chapter.id)) {
            book.lastReadChapter = chapter;
            book.lastReadTime = Date.now();
          }
        }
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
    if (bookChapterRefreshing.value)
      return;
    bookChapterRefreshing.value = true;
    const store = useStore();
    await Promise.all(
      bookShelf.value.map(async (shelf) => {
        await Promise.all(
          shelf.books.map(async (book) => {
            const source = store.getBookSource(book.book.sourceId);
            if (source) {
              await store.bookDetail(source, book.book);
            }
          }),
        );
      }),
    );
    bookChapterRefreshing.value = false;
    showToast('刷新章节完成');
  };
  const clear = () => {
    bookShelf.value = [
      {
        id: nanoid(),
        name: '默认书架',
        books: [],
        createTime: Date.now(),
      },
    ];
  };

  return {
    bookShelf,
    bookChapterRefreshing,
    createBookShelf,
    removeBookShelf,
    isBookInShelf,
    addToBookSelf,
    removeBookFromShelf,
    updateBookReadInfo,
    deleteBookFromShelf,
    bookRefreshChapters,
    clear,
  };
});
