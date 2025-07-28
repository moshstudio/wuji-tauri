import type { PhotoItem, PhotoShelf } from '@wuji-tauri/source-extension';
import { useStorageAsync } from '@vueuse/core';

import _ from 'lodash';
import { nanoid } from 'nanoid';

import { defineStore } from 'pinia';

import { showToast } from 'vant';
import { createKVStore } from './utils';

export const usePhotoShelfStore = defineStore('photoShelfStore', () => {
  const kvStorage = createKVStore('photoShelfStore');

  const photoShelf = useStorageAsync<PhotoShelf[]>(
    'photoShelf',
    [
      {
        id: nanoid(),
        name: '默认收藏',
        photos: [],
        createTime: Date.now(),
      },
    ],
    kvStorage.storage,
  );
  const photoInShelf = (itemId: string, shelfId?: string): boolean => {
    if (shelfId) {
      return (
        photoShelf.value
          .find((item) => item.id === shelfId)
          ?.photos.some((item) => item.id === itemId) || false
      );
    } else {
      for (const shelf of photoShelf.value) {
        if (shelf.photos.find((item) => item.id === itemId)) {
          return true;
        }
      }
    }
    return false;
  };
  const addPhotoToShelf = (item: PhotoItem, shelfId?: string) => {
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
  };
  const createShelf = (name: string): boolean => {
    // 创建收藏
    if (photoShelf.value.some((item) => item.name === name)) {
      showToast('收藏夹已存在');
      return false;
    }
    photoShelf.value.push({
      id: nanoid(),
      name,
      photos: [],
      createTime: Date.now(),
    });
    return true;
  };
  const removePhotoFromShelf = (
    item: PhotoItem | PhotoItem[],
    shelfId?: string,
  ): boolean => {
    const shelf = shelfId
      ? photoShelf.value.find((item) => item.id === shelfId)
      : photoShelf.value[0];
    if (!shelf) {
      showToast('收藏夹不存在');
      return false;
    }
    shelf.photos = _.filter(shelf.photos, (i) => {
      if (_.isArray(item)) {
        return !_.some(item, { id: i.id });
      }
      return i.id !== item.id;
    });
    console.log(shelf.photos);

    return true;
  };
  const removeShelf = (shelfId: string) => {
    if (photoShelf.value.length === 1) {
      showToast('至少需要保留一个收藏夹');
      return false;
    }
    _.remove(photoShelf.value, (item) => item.id === shelfId);
    return true;
  };
  const clear = () => {
    photoShelf.value = [
      {
        id: nanoid(),
        name: '默认收藏',
        photos: [],
        createTime: Date.now(),
      },
    ];
  };
  return {
    photoShelf,
    photoInShelf,
    addPhotoToShelf,
    createShelf,
    removePhotoFromShelf,
    removeShelf,
    clear,
  };
});
