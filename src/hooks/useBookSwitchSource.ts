import type {
  BookChapter,
  BookItem,
  BookList,
} from '@wuji-tauri/source-extension';
import _ from 'lodash';
import { showToast } from 'vant';
import { ref } from 'vue';
import { router } from '@/router';
import { useStore } from '@/store';
import {
  resolveSwitchChapter,
} from '@/utils/bookSourceAccess';
import { createCancellableFunction } from '@/utils/cancelableFunction';

function normalizeAuthor(author: string): string {
  return author.replace(/\s+/g, '').toLowerCase();
}

export function useBookSwitchSource() {
  const store = useStore();
  const showSwitchSourceDialog = ref(false);
  const allSourceResults = ref<BookItem[]>([]);
  const switchTargetBook = ref<BookItem>();
  const isSearching = ref(false);
  const searchProgress = ref({ done: 0, total: 0 });
  let searchGeneration = 0;

  const searchAllSources = createCancellableFunction(
    async (signal: AbortSignal, targetBook?: BookItem) => {
      if (!targetBook)
        return;

      const generation = ++searchGeneration;
      switchTargetBook.value = targetBook;
      allSourceResults.value = [];

      const sources = store.bookSources.filter(
        source => source.item.id !== targetBook.sourceId,
      );
      searchProgress.value = { done: 0, total: sources.length };
      isSearching.value = true;

      const markDone = () => {
        if (signal.aborted || generation !== searchGeneration)
          return;
        searchProgress.value = {
          done: searchProgress.value.done + 1,
          total: searchProgress.value.total,
        };
      };

      try {
        await Promise.all(
          sources.map(async (bookSource) => {
            try {
              if (signal.aborted)
                return;
              await store.bookSearch(bookSource, targetBook.title);
              if (signal.aborted)
                return;
              if (!bookSource.list)
                return;

              for (const b of _.castArray<BookList>(bookSource.list)[0].list) {
                if (b.title !== targetBook.title)
                  continue;
                if (
                  targetBook.author
                  && b.author
                  && normalizeAuthor(targetBook.author)
                    !== normalizeAuthor(b.author)
                ) {
                  continue;
                }
                if (signal.aborted)
                  return;
                const detailedBook = await store.bookDetail(bookSource, b, {
                  silent: true,
                });
                if (
                  detailedBook
                  && !signal.aborted
                  && generation === searchGeneration
                ) {
                  allSourceResults.value.push(detailedBook);
                }
                return;
              }
            }
            finally {
              markDone();
            }
          }),
        );
      }
      finally {
        if (generation === searchGeneration)
          isSearching.value = false;
      }
    },
  );

  function openSwitchSource(book?: BookItem) {
    if (!book)
      return;
    switchTargetBook.value = book;
    showSwitchSourceDialog.value = true;
    searchAllSources(book);
  }

  function getMatchedChapter(
    newBookItem: BookItem,
    options?: {
      chapterId?: string;
      readingChapter?: BookChapter;
      originalChapters?: BookChapter[];
    },
  ) {
    if (!newBookItem.chapters?.length)
      return undefined;
    const chapterId = options?.chapterId || '';
    const currentChapter
      = options?.readingChapter
        || options?.originalChapters?.find(c => c.id === chapterId);
    return resolveSwitchChapter(
      newBookItem.chapters,
      currentChapter,
      chapterId,
      options?.originalChapters,
    )?.chapter;
  }

  async function switchSource(
    newBookItem: BookItem,
    options?: {
      chapterId?: string;
      readingChapter?: BookChapter;
      originalChapters?: BookChapter[];
    },
  ) {
    if (!newBookItem.chapters?.length) {
      showToast('章节为空');
      return false;
    }

    const chapterId = options?.chapterId || '';
    const currentChapter
      = options?.readingChapter
        || options?.originalChapters?.find(c => c.id === chapterId);

    const resolved = resolveSwitchChapter(
      newBookItem.chapters,
      currentChapter,
      chapterId,
      options?.originalChapters,
    );

    if (!resolved) {
      showToast('章节为空');
      return false;
    }

    const { chapter, exact } = resolved;

    if (options?.readingChapter?.readingPage != null && exact)
      chapter.readingPage = options.readingChapter.readingPage;

    showSwitchSourceDialog.value = false;

    if (!exact) {
      showToast(`未精确匹配，已打开：${chapter.title}`);
    }

    await router.push({
      name: 'BookRead',
      params: {
        chapterId: chapter.id,
        bookId: newBookItem.id,
        sourceId: newBookItem.sourceId,
        // 勿写 'false'：会被 chapterId(.*) 吞成 id/false
        isPrev: '',
      },
    });
    return true;
  }

  return {
    showSwitchSourceDialog,
    allSourceResults,
    switchTargetBook,
    isSearching,
    searchProgress,
    searchAllSources,
    openSwitchSource,
    switchSource,
    getMatchedChapter,
  };
}
