import type {
  BookExtension,
  ComicExtension,
  Extension,
  MarketSourceContent,
  PhotoExtension,
  SongExtension,
  VideoExtension,
} from '@wuji-tauri/source-extension';
import type { SendRequestErrorContext } from './serverStore';
import type { SubscribeItem } from '@/types';
import { fetch } from '@wuji-tauri/fetch';
import {
  loadBookExtensionString,
  loadComicExtensionString,
  loadPhotoExtensionString,
  loadSongExtensionString,
  loadVideoExtensionString,
} from '@wuji-tauri/source-extension';
import { defineStore } from 'pinia';
import { showFailToast } from 'vant';
import TestBookExtension from '@/test/book/test';
import TestComicExtension from '@/test/comic/test';
import TestPhotoExtension from '@/test/photo/test';
import TestSongExtension from '@/test/song/test';
import TestVideoExtension from '@/test/video/test';
import { SourceType } from '@/types';
import { tryCatchProxy } from '@/utils';
import { useServerStore } from './serverStore';

export const useExtensionStore = defineStore('extension', () => {
  const serverStore = useServerStore();
  const sourceClasses = new Map<string, Extension | null>();

  const getSourceClass = async (
    item: SubscribeItem | MarketSourceContent,
  ): Promise<Extension | null | undefined> => {
    const idKey = '_id' in item ? item._id : item.id;

    if (idKey && sourceClasses.has(idKey)) {
      return sourceClasses.get(idKey);
    }

    // for test
    if (item.code === 'test') {
      switch (item.type) {
        case SourceType.Photo:
          sourceClasses.set(idKey, new TestPhotoExtension());
          break;
        case SourceType.Song:
          sourceClasses.set(idKey, new TestSongExtension());
          break;
        case SourceType.Book:
          sourceClasses.set(idKey, new TestBookExtension());
          break;
        case SourceType.Comic:
          sourceClasses.set(idKey, new TestComicExtension());
          break;
        case SourceType.Video:
          sourceClasses.set(idKey, new TestVideoExtension());
          break;
        default:
          break;
      }
      return sourceClasses.get(idKey);
    }

    console.log(item);

    if (!item.code) {
      try {
        if (item.url.startsWith('http')) {
          item.code = await (await fetch(item.url)).text();
        }
        else {
          await serverStore.sendRequest(
            item.url,
            {},
            async (response) => {
              const json = await response.json();
              item.code = json.code;
            },
            async (
              response,
              context?: SendRequestErrorContext,
            ) => {
              if (response) {
                if (context?.guestUnauthorized) {
                  showFailToast('请先登录');
                  return null;
                }
                const error = await response.json();
                console.log(error);
                showFailToast({
                  message: error.message,
                });
              }
              return null;
            },
          );
        }
      }
      catch (error) {
        console.log('加载扩展失败:', item, error);
        showFailToast(`加载扩展失败: ${item.name}`);
        sourceClasses.set(idKey, null);
        return null;
      }
    }

    if (!item.code) {
      showFailToast(`加载 ${item.name} 失败`);
      sourceClasses.set(idKey, null);
      return null;
    }

    let extensionClass:
      | PhotoExtension
      | SongExtension
      | BookExtension
      | ComicExtension
      | VideoExtension
      | undefined;

    switch (item.type) {
      case SourceType.Photo:
        extensionClass = loadPhotoExtensionString(item.code);
        break;
      case SourceType.Song:
        extensionClass = loadSongExtensionString(item.code);
        break;
      case SourceType.Book:
        extensionClass = loadBookExtensionString(item.code);
        break;
      case SourceType.Comic:
        extensionClass = loadComicExtensionString(item.code);
        break;
      case SourceType.Video:
        extensionClass = loadVideoExtensionString(item.code);
        break;
      default:
        extensionClass = undefined;
        break;
    }

    if (!extensionClass) {
      showFailToast(`添加 ${item.name} 订阅失败`);
      sourceClasses.delete(idKey);
      return null;
    }

    // 防止报错
    extensionClass = tryCatchProxy(extensionClass);
    extensionClass.codeString = item.code;

    if ('id' in item) {
      item.id ||= extensionClass.id; // item.id默认可以为空
    }
    else {
      item._id = extensionClass.id;
    }

    item.name ||= extensionClass.name; // item.name默认可以为空
    sourceClasses.set(idKey, extensionClass);
    return extensionClass;
  };

  const deleteSourceClass = (id: string) => {
    sourceClasses.delete(id);
  };

  return {
    sourceClasses,
    getSourceClass,
    deleteSourceClass,
  };
});
