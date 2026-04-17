import type {
  ComicChapter,
  ComicContent,
  ComicExtension,
  ComicItem,
} from '@wuji-tauri/source-extension';
import type { ComicSource } from '@/types';
import { debounceFilter, useStorageAsync } from '@vueuse/core';
import _ from 'lodash';
import { defineStore } from 'pinia';
import { showFailToast } from 'vant';
import { ref, triggerRef } from 'vue';
import { useComicShelfStore } from './comicShelfStore';
import { useExtensionStore } from './extensionStore';
import { createKVStore } from './utils';

export const useComicStore = defineStore('comic', () => {
  const kvStorage = createKVStore();
  const extensionStore = useExtensionStore();
  const shelfStore = useComicShelfStore();

  const readingComic = ref<ComicItem>();
  const readingChapter = ref<ComicChapter>();

  const comicSources = useStorageAsync<ComicSource[]>(
    'comicSources',
    [],
    kvStorage.storage,
    {
      eventFilter: debounceFilter(1000),
    },
  );

  const comicRecommendList = async (
    source: ComicSource,
    pageNo: number = 1,
    type?: string,
  ) => {
    const sc = (await extensionStore.getSourceClass(
      source.item,
    )) as ComicExtension;
    const res = await sc?.execGetRecommendComics(pageNo, type);

    if (res) {
      if (!type) {
        source.list = res;
      }
      else {
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
    triggerRef(comicSources);
  };

  const comicSearch = async (
    source: ComicSource,
    keyword: string,
    pageNo: number = 1,
  ) => {
    const sc = (await extensionStore.getSourceClass(
      source.item,
    )) as ComicExtension;
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
    triggerRef(comicSources);
  };

  const comicDetail = async (
    source: ComicSource,
    comic: ComicItem,
    options: { silent?: boolean } = {},
  ) => {
    const sc = (await extensionStore.getSourceClass(
      source.item,
    )) as ComicExtension;
    const res = await sc?.execGetComicDetail(comic);
    if (res) {
      return res;
    }
    else {
      if (!options.silent) {
        showFailToast(`${source.item.name} 获取内容失败`);
      }
      return null;
    }
  };

  const comicRead = async (
    source: ComicSource,
    comic: ComicItem,
    chapter: ComicChapter,
  ): Promise<ComicContent | null> => {
    const sc = (await extensionStore.getSourceClass(
      source.item,
    )) as ComicExtension;
    const res = await sc?.execGetContent(comic, chapter);
    return res;
  };

  const getComicSource = (sourceId: string): ComicSource | undefined => {
    return comicSources.value.find(item => item.item.id === sourceId);
  };

  const getComicItem = (
    source: ComicSource,
    comicId: string,
  ): ComicItem | undefined => {
    const checkFromShelf = () => {
      for (const shelf of shelfStore.comicShelf) {
        for (const comic of shelf.comics) {
          if (comic.comic.id === comicId) {
            return comic.comic;
          }
        }
      }
    };

    const checkFromHistory = () => {
      for (const comic of shelfStore.comicHistory) {
        if (comic.comic.id === comicId) {
          return comic.comic;
        }
      }
    };

    const fromSource = () => {
      if (source.list) {
        for (const comicList of _.castArray(source.list)) {
          for (const comicItem of comicList.list) {
            if (comicItem.id === comicId) {
              return comicItem;
            }
          }
        }
      }
    };

    if (shelfStore.isComicInShelf(comicId)) {
      return checkFromShelf();
    }
    else {
      return checkFromHistory() || fromSource();
    }
  };

  return {
    readingComic,
    readingChapter,
    comicSources,
    comicRecommendList,
    comicSearch,
    comicDetail,
    comicRead,
    getComicSource,
    getComicItem,
  };
});
