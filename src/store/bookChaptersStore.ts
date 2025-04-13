import type { BookChapter, BookItem } from '@/extensions/book';
import { sanitizePathName } from '@/utils';
import CryptoJS from 'crypto-js';
import _ from 'lodash';
import { defineStore } from 'pinia';
import * as fs from 'tauri-plugin-fs-api';
import { ref, watch } from 'vue';

export const useBookChapterStore = defineStore('bookChapterStore', () => {
  const baseDir = fs.BaseDirectory.AppCache;
  const dirName = 'book_cache';
  const baseFile = 'books.json';
  const books = ref<
    {
      book_id: string;
      book_name: string;
      source_id: string;
      chapter_id: string;
      chapter_name: string;
      cache_book_id: string;
      cache_chapter_id: string;
    }[]
  >([]);
  let inited = false;
  const ensureBase = async () => {
    if (!(await fs.exists(dirName, { baseDir }))) {
      await fs.mkdir(dirName, {
        baseDir,
        recursive: true,
      });
    }
    if (
      !(await fs.exists(`${dirName}/${baseFile}`, {
        baseDir,
      }))
    ) {
      await fs.writeFile(
        `${dirName}/${baseFile}`,
        new TextEncoder().encode('[]'),
        {
          baseDir,
        },
      );
    } else {
      books.value = JSON.parse(
        new TextDecoder().decode(
          await fs.readFile(`${dirName}/${baseFile}`, {
            baseDir,
          }),
        ),
      );
    }
    inited = true;
  };
  watch(
    books,
    _.debounce(async (newValue) => {
      if (!newValue) {
        return;
      }
      if (!inited) {
        await ensureBase();
      }
      await fs.writeFile(
        `${dirName}/${baseFile}`,
        new TextEncoder().encode(JSON.stringify(newValue)),
        {
          baseDir,
        },
      );
    }, 500),
    {
      deep: true,
    },
  );

  const genBookCacheId = (book: BookItem) => {
    return (
      CryptoJS.MD5(`${book.sourceId}_${book.id}`).toString() +
      sanitizePathName(book.title)
    );
  };
  const genChapterCacheId = (book: BookItem, chapter: BookChapter) => {
    return (
      CryptoJS.MD5(`${book.sourceId}_${book.id}_${chapter.id}`).toString() +
      sanitizePathName(chapter.title)
    );
  };
  const saveBookChapter = async (
    book: BookItem,
    chapter: BookChapter,
    content: string,
    force = false,
  ) => {
    if (!inited) {
      await ensureBase();
    }
    const cache_book_id = genBookCacheId(book);
    const cache_chapter_id = genChapterCacheId(book, chapter);

    const find = books.value.find(
      (b) =>
        b.cache_book_id === cache_book_id &&
        b.cache_chapter_id === cache_chapter_id,
    );
    if (find && !force) {
      // 已经有了，不需要重复保存
      return;
    }
    if (!(await fs.exists(`${dirName}/${cache_book_id}`, { baseDir }))) {
      await fs.mkdir(`${dirName}/${cache_book_id}`, {
        baseDir,
        recursive: true,
      });
    }
    await fs.writeFile(
      `${dirName}/${cache_book_id}/${cache_chapter_id}`,
      new TextEncoder().encode(content),
      {
        baseDir,
      },
    );
    if (!find) {
      books.value.unshift({
        book_id: book.id,
        book_name: book.title,
        source_id: book.sourceId,
        chapter_id: chapter.id,
        chapter_name: chapter.title,
        cache_book_id,
        cache_chapter_id,
      });
    }
  };
  const getBookChapter = async (
    book: BookItem,
    chapter: BookChapter,
  ): Promise<string | undefined> => {
    if (!inited) {
      await ensureBase();
    }
    const cache_book_id = genBookCacheId(book);
    const cache_chapter_id = genChapterCacheId(book, chapter);

    const find = books.value.find(
      (b) =>
        b.cache_book_id === cache_book_id &&
        b.cache_chapter_id === cache_chapter_id,
    );
    if (find) {
      try {
        return new TextDecoder().decode(
          await fs.readFile(`${dirName}/${cache_book_id}/${cache_chapter_id}`, {
            baseDir,
          }),
        );
      } catch (error) {}
    }
  };
  const removeBookCache = async (book: BookItem) => {
    if (!inited) {
      await ensureBase();
    }
    const cache_book_id = genBookCacheId(book);
    books.value = books.value.filter((b) => b.cache_book_id !== cache_book_id);
    if (await fs.exists(`${dirName}/${cache_book_id}`, { baseDir })) {
      try {
        await fs.remove(`${dirName}/${cache_book_id}`, {
          baseDir,
          recursive: true,
        });
      } catch (error) {
        console.warn('删除章节缓存失败:', JSON.stringify(book));
      }
    }
  };
  const clear = async () => {
    if (!inited) {
      await ensureBase();
    }
    await fs.remove(dirName, {
      baseDir,
      recursive: true,
    });
    books.value = [];
    inited = false;

    // [...new Set(books.value.map((book) => book.cache_book_id))].forEach(
    //   async (cache_book_id) => {
    //     if (
    //       await fs.exists(`${dirName}/${cache_book_id}`, {
    //         baseDir: baseDir,
    //       })
    //     ) {
    //       try {
    //         await fs.remove(`${dirName}/${cache_book_id}`, {
    //           baseDir: baseDir,
    //           recursive: true,
    //         });
    //       } catch (error) {}
    //     }
    //   }
    // );
  };

  const chapterInCache = (book: BookItem, chapter: BookChapter) => {
    const cache_book_id = genBookCacheId(book);
    const cache_chapter_id = genChapterCacheId(book, chapter);

    const find = books.value.find(
      (b) =>
        b.cache_book_id === cache_book_id &&
        b.cache_chapter_id === cache_chapter_id,
    );
    return !!find;
  };
  return {
    getBookChapter,
    saveBookChapter,
    removeBookCache,
    clear,
    chapterInCache,
  };
});
