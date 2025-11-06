import type {
  ComicChapter,
  ComicItem,
  ComicShelf,
} from '@wuji-tauri/source-extension';

import { debounceFilter, useStorageAsync } from '@vueuse/core';

import _ from 'lodash';
import { nanoid } from 'nanoid';
import { defineStore } from 'pinia';

import { showToast } from 'vant';

import { ref } from 'vue';
import { useStore } from './store';
import { createKVStore } from './utils';
import { ComicHistory } from '@/types/comic';

export const useComicShelfStore = defineStore('comicShelfStore', () => {
  const kvStorage = createKVStore('comicShelfStore');
  const storage = kvStorage.storage;

  const historyKVStorage = createKVStore('comicHistoryStore');
  const historyStorage = historyKVStorage.storage;

  // 漫画书架⬇️
  const comicShelf = useStorageAsync<ComicShelf[]>(
    'comicShelf',
    [
      {
        id: nanoid(),
        name: '默认书架',
        comics: [],
        createTime: Date.now(),
      },
    ],
    storage,
    {
      eventFilter: debounceFilter(500),
    },
  );

  // 阅读历史
  const comicHistory = useStorageAsync<Array<ComicHistory>>(
    'comicHistory',
    [],
    historyStorage,
    {
      eventFilter: debounceFilter(1000),
    },
  );

  const comicChapterRefreshing = ref(false);

  const createComicShelf = (name: string) => {
    if (comicShelf.value.some((item) => item.name === name)) {
      // 书架已存在
    } else {
      comicShelf.value.push({
        id: nanoid(),
        name,
        comics: [],
        createTime: Date.now(),
      });
    }
  };
  const removeComicShelf = (shelfId: string) => {
    if (comicShelf.value.length === 1) {
      showToast('至少需要保留一个收藏夹');
      return false;
    }
    _.remove(comicShelf.value, (item) => item.id === shelfId);
    return true;
  };
  const isComicInShelf = (
    comic: ComicItem | string,
    shelfId?: string,
  ): boolean => {
    let id: string;
    if (typeof comic === 'string') {
      id = comic;
    } else {
      id = comic.id;
    }
    if (shelfId) {
      return !!comicShelf.value
        .find((shelf) => shelf.id === shelfId)
        ?.comics.find((b) => b.comic.id === id);
    } else {
      for (const shelf of comicShelf.value) {
        const find = shelf.comics.find((b) => b.comic.id === id);
        if (find) {
          return true;
        }
      }
    }
    return false;
  };

  const isComicInHistory = (comic: ComicItem | string): boolean => {
    let id: string;
    if (typeof comic === 'string') {
      id = comic;
    } else {
      id = comic.id;
    }
    return !!comicHistory.value.find((item) => item.comic.id === id);
  };

  const addToComicSelf = (comicItem: ComicItem, shelfId?: string): boolean => {
    if (!comicShelf.value.length) {
      showToast('书架为空，请先创建书架');
      return false;
    }
    const shelf = shelfId
      ? comicShelf.value.find((item) => item.id === shelfId)
      : comicShelf.value[0];
    if (!shelf) {
      showToast('书架不存在');
      return false;
    }
    if (shelf.comics.find((item) => item.comic.id === comicItem.id)) {
      showToast('书架中已存在此书');
      return false;
    }
    shelf.comics.push({
      comic: _.cloneDeep(comicItem),
      createTime: Date.now(),
    });
    showToast(`已添加到 ${shelf.name}`);
    return true;
  };
  const removeComicFromShelf = (comicItem: ComicItem, shelfId?: string) => {
    if (!comicShelf.value.length) {
      showToast('书架为空');
      return;
    }
    if (!shelfId) shelfId = comicShelf.value[0].id;
    const shelf = comicShelf.value.find((item) => item.id === shelfId);
    if (!shelf) {
      showToast('书架不存在');
      return;
    }
    _.remove(shelf.comics, (item) => item.comic.id === comicItem.id);
  };
  const updateComicReadInfo = (comicItem: ComicItem, chapter: ComicChapter) => {
    if (!comicShelf.value) return;
    for (const shelf of comicShelf.value) {
      for (const comic of shelf.comics) {
        if (comic.comic.id === comicItem.id) {
          if (comic.comic.chapters?.find((item) => item.id === chapter.id)) {
            comic.lastReadChapter = chapter;
            comic.lastReadTime = Date.now();
          }
        }
      }
    }
    updateComicHistoryInfo(comicItem, chapter);
  };

  const updateComicHistoryInfo = (
    comicItem: ComicItem,
    chapter?: ComicChapter,
  ) => {
    const comic = comicHistory.value.find(
      (item) => item.comic.id === comicItem.id,
    );
    if (comic) {
      comic.lastReadTime = Date.now();
      if (!chapter) {
        comic.lastReadChapter = undefined;
      } else if (comic.comic.chapters?.find((item) => item.id === chapter.id)) {
        comic.lastReadChapter = chapter;
      }
      comicHistory.value = [...comicHistory.value].sort(
        (a, b) => b.lastReadTime - a.lastReadTime,
      );
    } else {
      comicHistory.value = [
        {
          comic: comicItem,
          lastReadChapter: chapter,
          lastReadTime: Date.now(),
        },
        ...comicHistory.value,
      ]
        .sort((a, b) => b.lastReadTime - a.lastReadTime)
        .slice(0, 10);
    }
  };

  const clearComicHistory = () => {
    comicHistory.value = [];
  };

  const deleteComicFromShelf = (comicItem: ComicItem, shelfId: string) => {
    const shelf = comicShelf.value.find((item) => item.id === shelfId);
    if (!shelf) return;
    _.remove(shelf.comics, (item) => item.comic.id === comicItem.id);
  };
  const comicRefreshChapters = async () => {
    if (comicChapterRefreshing.value) return;
    comicChapterRefreshing.value = true;
    const store = useStore();
    await Promise.all(
      comicShelf.value.map(async (shelf) => {
        await Promise.all(
          shelf.comics.map(async (comic) => {
            const source = store.getComicSource(comic.comic.sourceId);
            if (source) {
              await store.comicDetail(source, comic.comic);
            }
          }),
        );
      }),
    );
    comicChapterRefreshing.value = false;
    showToast('刷新章节完成');
  };
  const syncData = () => {
    const clone = _.cloneDeep(comicShelf.value);
    clone.forEach((shelf) => {
      shelf.comics.forEach((comic) => {
        comic.comic.chapters = undefined;
      });
    });
    return clone;
  };
  const loadSyncData = async (data: ComicShelf[]) => {
    comicShelf.value = data;
    for (const shelf of comicShelf.value) {
      for (const comic of shelf.comics) {
        if (isComicInHistory(comic.comic)) {
          updateComicHistoryInfo(comic.comic, comic.lastReadChapter);
        }
      }
    }
  };
  const clear = async () => {
    comicShelf.value = [
      {
        id: nanoid(),
        name: '默认书架',
        comics: [],
        createTime: Date.now(),
      },
    ];
    clearComicHistory();
    await storage.clear();
  };

  return {
    storage,
    comicShelf,
    comicHistory,
    comicChapterRefreshing,
    createComicShelf,
    removeComicShelf,
    isComicInShelf,
    isComicInHistory,
    addToComicSelf,
    removeComicFromShelf,
    updateComicReadInfo,
    updateComicHistoryInfo,
    clearComicHistory,
    deleteComicFromShelf,
    comicRefreshChapters,
    syncData,
    loadSyncData,
    clear,
  };
});
