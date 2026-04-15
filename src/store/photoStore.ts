import type { PhotoExtension, PhotoItem } from '@wuji-tauri/source-extension';
import type { PhotoSource } from '@/types';
import { debounceFilter, useStorageAsync } from '@vueuse/core';
import { defineStore } from 'pinia';
import { showFailToast, showToast } from 'vant';
import { triggerRef } from 'vue';
import { useExtensionStore } from './extensionStore';
import { usePhotoShelfStore } from './photoShelfStore';
import { createKVStore } from './utils';

export const usePhotoStore = defineStore('photo', () => {
  const kvStorage = createKVStore();
  const extensionStore = useExtensionStore();
  const shelfStore = usePhotoShelfStore();

  const photoSources = useStorageAsync<PhotoSource[]>(
    'photoSources',
    [],
    kvStorage.storage,
    {
      eventFilter: debounceFilter(1000),
    },
  );

  /**
   * 获取推荐列表
   */
  const photoRecommendList = async (
    source: PhotoSource,
    pageNo: number = 1,
  ) => {
    const sc = (await extensionStore.getSourceClass(
      source.item,
    )) as PhotoExtension;
    const res = await sc?.execGetRecommendList(pageNo);

    if (res) {
      source.list = res;
    }
    else {
      showToast(`${source.item.name} 推荐结果为空`);
      source.list = undefined;
    }
    triggerRef(photoSources);
  };

  /**
   * 搜索
   */
  const photoSearchList = async (
    source: PhotoSource,
    keyword: string,
    pageNo: number = 1,
  ) => {
    const sc = (await extensionStore.getSourceClass(
      source.item,
    )) as PhotoExtension;
    const res = await sc?.execSearch(keyword, pageNo);

    if (res) {
      source.list = res;
    }
    else {
      showToast(`${source.item.name} 搜索结果为空`);
      source.list = undefined;
    }
    triggerRef(photoSources);
  };

  /**
   * 获取详情
   */
  const photoDetail = async (
    source: PhotoSource,
    item: PhotoItem,
    pageNo: number = 1,
    options: { silent?: boolean } = {},
  ) => {
    const sc = (await extensionStore.getSourceClass(
      source.item,
    )) as PhotoExtension;
    const res = await sc?.execGetPhotoDetail(item, pageNo);
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

  const getPhotoSource = (sourceId: string): PhotoSource | undefined => {
    return photoSources.value.find((item) => {
      return item.item.id === sourceId;
    });
  };

  /**
   * 根据id获取图片
   */
  const getPhotoItem = (
    source: PhotoSource,
    itemId: string,
  ): PhotoItem | undefined => {
    const fromShelf = () => {
      for (const shelf of shelfStore.photoShelf) {
        for (const item of shelf.photos) {
          if (item.id === itemId) {
            return item;
          }
        }
      }
    };
    const fromSource = () => {
      if (source.list) {
        return source.list.list.find((item: PhotoItem) => item.id === itemId);
      }
    };
    if (shelfStore.photoInShelf(itemId)) {
      return fromShelf();
    }
    else {
      return fromSource();
    }
  };

  return {
    photoSources,
    photoRecommendList,
    photoSearchList,
    photoDetail,
    getPhotoSource,
    getPhotoItem,
  };
});
