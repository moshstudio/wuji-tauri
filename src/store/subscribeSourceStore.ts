import type {
  MarketSource,
  Source,
  SubscribeDetail,
  SubscribeItem,
  SubscribeSource,
} from '@/types';
import * as fs from '@tauri-apps/plugin-fs';
import { debounceFilter, useStorage, useStorageAsync } from '@vueuse/core';
import { fetch } from '@wuji-tauri/fetch';
import {
  loadBookExtensionString,
  loadComicExtensionString,
  loadPhotoExtensionString,
  loadSongExtensionString,
  loadVideoExtensionString,
  MarketSourcePermission,
} from '@wuji-tauri/source-extension';
import _ from 'lodash';
import { defineStore, storeToRefs } from 'pinia';
import {
  showConfirmDialog,
  showFailToast,
  showLoadingToast,
  showNotify,
  showSuccessToast,
  showToast,
} from 'vant';
import { computed, markRaw, onMounted, triggerRef } from 'vue';
import { router } from '@/router';
import { SourceType } from '@/types';
import { sleep } from '@/utils';
import { useBookStore } from './bookStore';
import { useComicStore } from './comicStore';
import { useDisplayStore } from './displayStore';
import { useExtensionStore } from './extensionStore';
import { usePhotoStore } from './photoStore';
import { useServerStore } from './serverStore';
import { useSongStore } from './songStore';
import { createKVStore } from './utils';
import { useVideoStore } from './videoStore';

export const useSubscribeSourceStore = defineStore('subscribeSource', () => {
  const kvStorage = createKVStore('subscribeSourceStore');
  const storage = kvStorage.storage;

  const displayStore = useDisplayStore();
  const serverStore = useServerStore();
  const extensionStore = useExtensionStore();
  const bookStore = useBookStore();
  const comicStore = useComicStore();
  const photoStore = usePhotoStore();
  const songStore = useSongStore();
  const videoStore = useVideoStore();

  const { photoSources } = storeToRefs(photoStore);
  const { songSources } = storeToRefs(songStore);
  const { bookSources } = storeToRefs(bookStore);
  const { comicSources } = storeToRefs(comicStore);
  const { videoSources } = storeToRefs(videoStore);

  const subscribeSources = useStorageAsync<SubscribeSource[]>(
    'subscribeSources',
    [],
    storage,
    {
      eventFilter: debounceFilter(1000),
    },
  );

  const addSubscribeSource = async (source: SubscribeSource) => {
    const index = subscribeSources.value.findIndex(
      item => item.detail.id === source.detail.id,
    );
    if (index !== -1) {
      subscribeSources.value[index] = source;
    }
    else {
      subscribeSources.value.push(source);
    }
  };

  const removeSubscribeSource = async (source: SubscribeSource) => {
    const index = subscribeSources.value.findIndex(
      s => s.detail.id === source.detail.id,
    );
    if (index !== -1) {
      subscribeSources.value.splice(index, 1);
    }
  };

  const removeItemFromSubscribeSource = async (
    itemId: string,
    sourceId: string,
  ) => {
    const source = subscribeSources.value.find(s => s.detail.id === sourceId);
    if (source) {
      _.remove(source.detail.urls, item => item.id === itemId);
    }
  };

  const getSubscribeSource = (
    sourceId: string,
  ): SubscribeSource | undefined => {
    return subscribeSources.value.find(item => item.detail.id === sourceId);
  };

  const updateSubscribeSourceContent = async (
    source: SubscribeSource,
    sourceContent: {
      id: string;
      name?: string;
      code?: string;
    },
  ) => {
    const subscribeSource = getSubscribeSource(source.detail.id);
    if (subscribeSource) {
      const item = subscribeSource.detail.urls.find(
        item => item.id === sourceContent.id,
      );
      if (item) {
        if (sourceContent.name) {
          item.name = sourceContent.name;
        }
        if (sourceContent.code) {
          item.code = sourceContent.code;
        }
        return item;
      }
    }
  };

  const syncData = () => {
    return markRaw(subscribeSources.value);
  };

  const loadSyncData = async (data: SubscribeSource[]) => {
    subscribeSources.value = data;
  };

  const clearSubscribeSources = async () => {
    subscribeSources.value.splice(0);
    await storage.clear();
  };

  const isEmpty = computed(() => subscribeSources.value.length === 0);

  const _checkTs = useStorage('subscribeSourceUpdateCheckTs', 0);

  const getSource = (item: SubscribeItem) => {
    switch (item.type) {
      case SourceType.Photo:
        return photoStore.getPhotoSource(item.id);
      case SourceType.Song:
        return songStore.getSongSource(item.id);
      case SourceType.Book:
        return bookStore.getBookSource(item.id);
      case SourceType.Comic:
        return comicStore.getComicSource(item.id);
      case SourceType.Video:
        return videoStore.getVideoSource(item.id);
      default:
        return undefined;
    }
  };

  const removeSource = (item: SubscribeItem) => {
    switch (item.type) {
      case SourceType.Photo:
        _.remove(photoStore.photoSources, p => p.item.id === item.id);
        triggerRef(photoSources);
        break;
      case SourceType.Song:
        _.remove(songStore.songSources, p => p.item.id === item.id);
        triggerRef(songSources);
        break;
      case SourceType.Book:
        _.remove(bookStore.bookSources, p => p.item.id === item.id);
        triggerRef(bookSources);
        break;
      case SourceType.Comic:
        _.remove(comicStore.comicSources, p => p.item.id === item.id);
        triggerRef(comicSources);
        break;
      case SourceType.Video:
        _.remove(videoStore.videoSources, p => p.item.id === item.id);
        triggerRef(videoSources);
        break;
    }
  };

  const addSubscribeSourceAction = async (
    url: string,
    raise: boolean = false,
  ): Promise<boolean> => {
    const t = displayStore.showToast();
    try {
      const subscribeResponse = await fetch(url);
      const res: SubscribeDetail = await subscribeResponse.json();
      const oldSource = getSubscribeSource(res.id);
      const source: SubscribeSource = {
        url,
        detail: {
          id: res.id,
          name: res.name,
          version: res.version,
          requireVersion: res.requireVersion,
          urls: [],
        },
        disable: oldSource?.disable || false,
      };
      for (const item of res.urls) {
        try {
          const sc = await extensionStore.getSourceClass(item);
          if (!sc) {
            showToast(`添加 ${item.name} 订阅源失败`);
            continue;
          }
          item.id ||= sc.id || sc.hash;
          item.name ||= sc.name;
          item.code ||= sc.codeString;
          addToSource(
            {
              item,
            },
            true,
          );
          source.detail.urls.push(item);
        }
        catch (error) {
          showToast(`添加 ${item.name} 订阅源失败`);
        }
      }
      if (source.detail.urls.every(item => item.disable)) {
        source.disable = true;
      }
      source.detail.urls.forEach((item) => {
        item.disable
          = oldSource?.detail.urls.find(s => s.id === item.id)?.disable
            || false;
      });
      addSubscribeSource(source);
      return true;
    }
    catch (error) {
      showToast('添加订阅源失败');
      if (raise) {
        throw error;
      }
      return false;
    }
    finally {
      displayStore.closeToast(t);
    }
  };

  const addMarketSource = async (
    marketSource: MarketSource,
  ): Promise<boolean> => {
    let needPermission = true;
    const { userInfo } = storeToRefs(serverStore);
    if (marketSource.permissions?.includes(MarketSourcePermission.NoLogin)) {
      needPermission = false;
    }
    else {
      if (
        marketSource.permissions?.includes(MarketSourcePermission.Login)
        && userInfo.value
      ) {
        needPermission = false;
      }
      if (
        marketSource.permissions?.includes(MarketSourcePermission.Vip)
        && serverStore.hasFeature('vip_market_source')
      ) {
        needPermission = false;
      }
      if (
        marketSource.permissions?.includes(MarketSourcePermission.SuperVip)
        && serverStore.hasFeature('vip_market_source')
        && serverStore.isPro
      ) {
        needPermission = false;
      }
    }
    if (needPermission) {
      if (!userInfo.value) {
        showConfirmDialog({
          title: '请登录',
          message: '请登录以访问此内容',
        }).then(() => {
          router.push({ name: 'Login' });
        });
      }
      else {
        showConfirmDialog({
          title: '权限不足',
          message: '请升级会员以访问此内容',
        }).then(() => {
          router.push({ name: 'VipDetail' });
        });
      }
      return false;
    }
    const t = showLoadingToast('导入中');
    try {
      const oldSource = getSubscribeSource(marketSource._id);
      const source: SubscribeSource = {
        url: 'marketSource',
        detail: {
          id: marketSource._id,
          name: marketSource.name,
          version: marketSource.version,
          urls: [],
        },
        disable: oldSource?.disable || false,
      };
      for (const sourceContent of marketSource.sourceContents || []) {
        try {
          const sc = await extensionStore.getSourceClass(sourceContent);
          if (!sc) {
            return false;
          }
          const item = {
            id: sc.id,
            name: sc.name,
            code: sc.codeString || sourceContent.code,
            type: sourceContent.type,
            url: sourceContent.url,
          };
          addToSource(
            {
              item,
            },
            true,
          );
          source.detail.urls.push(item);
        }
        catch (error) {
          showToast(`添加 ${marketSource.name} 订阅源失败`);
          break;
        }
      }
      if (source.detail.urls.every(item => item.disable)) {
        source.disable = true;
      }
      source.detail.urls.forEach((item) => {
        item.disable
          = oldSource?.detail.urls.find(s => s.id === item.id)?.disable
            || false;
      });
      addSubscribeSource(source);
      return true;
    }
    catch (error) {
      showToast('添加订阅源失败');
      return false;
    }
    finally {
      t.close();
    }
  };

  const localSourceId = 'localSource-wuji';

  const addLocalSubscribeSource = async (path: string): Promise<boolean> => {
    if (!path) {
      return false;
    }
    let content: string;
    try {
      content = await fs.readTextFile(path);
    }
    catch (error) {
      showFailToast(`读取文件失败:${String(error)}`);
      return false;
    }
    const oldSource = getSubscribeSource(localSourceId);
    const source: SubscribeSource = {
      url: '',
      detail: {
        id: localSourceId,
        name: '本地源',
        version: 1,
        urls: oldSource?.detail.urls || [],
      },
      disable: oldSource?.disable || false,
    };
    try {
      let sourceType: SourceType | undefined;
      let extensionClass: any;
      for (const [t, f] of [
        [SourceType.Photo, loadPhotoExtensionString],
        [SourceType.Book, loadBookExtensionString],
        [SourceType.Song, loadSongExtensionString],
        [SourceType.Comic, loadComicExtensionString],
        [SourceType.Video, loadVideoExtensionString],
      ] as const) {
        const c = f(String(content));
        if (c) {
          sourceType = t;
          extensionClass = c;
          break;
        }
      }
      if (!sourceType || !extensionClass) {
        showFailToast('导入失败，不支持的订阅源');
        return false;
      }
      const item = {
        id: extensionClass.id,
        name: extensionClass.name,
        type: sourceType,
        url: path,
        code: String(content),
      };
      const sc = await extensionStore.getSourceClass(item);
      if (!sc) {
        showToast(`添加 ${item.name} 源失败`);
        return false;
      }
      for (const existSource of subscribeSources.value) {
        if (existSource.detail.urls.find(item => item.id === sc.id)) {
          showFailToast(`${sc.name} 在 ${existSource.detail.name} 已存在`);
          return false;
        }
      }
      addToSource(
        {
          item,
        },
        true,
      );
      source.detail.urls.push(item);
      addSubscribeSource(source);
      return true;
    }
    catch (error) {
      showToast('添加订阅源失败');
      return false;
    }
  };

  const updateSubscribeSources = async (
    source?: SubscribeSource,
    skipSameVersion = false,
  ) => {
    if (!subscribeSources.value.length) {
      showToast('请先添加订阅源');
      return;
    }
    showLoadingToast({
      message: '正在更新订阅源',
      closeOnClick: true,
      closeOnClickOverlay: true,
    });
    const t = displayStore.showToast();
    const failed: string[] = [];

    const update = async (source: SubscribeSource) => {
      const url = source.url;
      try {
        if (source.detail.id === localSourceId) {
          const success = await addLocalSubscribeSource(url);
          if (!success) {
            failed.push(url);
          }
        }
        else {
          if (url === 'marketSource') {
            const marketSource = await serverStore.getMarketSourceById(
              source.detail.id,
            );
            if (marketSource) {
              if (
                !(
                  skipSameVersion
                  && marketSource.version === source.detail.version
                )
              ) {
                const success = await addMarketSource(marketSource);
                if (!success) {
                  failed.push(marketSource.name);
                }
              }
            }
          }
          else {
            const success = await addSubscribeSourceAction(url, true);
            if (!success) {
              failed.push(url);
            }
          }
        }
      }
      catch (error) {
        failed.push(source.detail.name);
      }
    };
    if (!source) {
      await Promise.all(subscribeSources.value.map(update));
      loadSubscribeSources(true);
    }
    else {
      await update(source);
    }

    if (failed.length > 0) {
      showNotify({
        type: 'warning',
        message: `${failed.length} 个订阅源更新失败`,
        duration: 2000,
      });
    }
    else {
      showNotify({
        type: 'success',
        message: '更新订阅源成功',
        duration: 2000,
      });
    }
    displayStore.closeToast(t);
  };

  function addToSource(source: Source, load: boolean = false) {
    extensionStore.deleteSourceClass(source.item.id);
    let index: number;
    switch (source.item.type.toLowerCase()) {
      case SourceType.Photo:
        index = photoStore.photoSources.findIndex(
          item => item.item.id === source.item.id,
        );
        if (index !== -1) {
          photoStore.photoSources[index].item = source.item;
        }
        else {
          photoStore.photoSources.push(source);
        }
        triggerRef(photoSources);
        if (load) {
          photoStore.photoRecommendList(source);
        }
        break;
      case SourceType.Song:
        index = songStore.songSources.findIndex(
          item => item.item.id === source.item.id,
        );
        if (index !== -1) {
          songStore.songSources[index].item = source.item;
        }
        else {
          songStore.songSources.push(source);
        }
        triggerRef(songSources);
        if (load) {
          songStore.songRecommendPlayist(source);
          songStore.songRecommendSong(source);
        }
        break;
      case SourceType.Book:
        index = bookStore.bookSources.findIndex(
          item => item.item.id === source.item.id,
        );
        if (index !== -1) {
          bookStore.bookSources[index].item = source.item;
        }
        else {
          bookStore.bookSources.push(source);
        }
        triggerRef(bookSources);
        if (load) {
          bookStore.bookRecommendList(source);
        }
        break;
      case SourceType.Comic:
        index = comicStore.comicSources.findIndex(
          item => item.item.id === source.item.id,
        );
        if (index !== -1) {
          comicStore.comicSources[index].item = source.item;
        }
        else {
          comicStore.comicSources.push(source);
        }
        triggerRef(comicSources);
        if (load) {
          comicStore.comicRecommendList(source);
        }
        break;
      case SourceType.Video:
        index = videoStore.videoSources.findIndex(
          item => item.item.id === source.item.id,
        );
        if (index !== -1) {
          videoStore.videoSources[index].item = source.item;
        }
        else {
          videoStore.videoSources.push(source);
        }
        triggerRef(videoSources);
        if (load) {
          videoStore.videoRecommendList(source);
        }
        break;
    }
  }

  const removeFromSource = (itemId: string, sourceType: SourceType) => {
    switch (sourceType) {
      case SourceType.Photo:
        _.remove(
          photoStore.photoSources,
          source => source.item.id === itemId,
        );
        triggerRef(photoSources);
        break;
      case SourceType.Song:
        _.remove(songStore.songSources, source => source.item.id === itemId);
        triggerRef(songSources);
        break;
      case SourceType.Book:
        _.remove(bookStore.bookSources, source => source.item.id === itemId);
        triggerRef(bookSources);
        break;
      case SourceType.Comic:
        _.remove(
          comicStore.comicSources,
          source => source.item.id === itemId,
        );
        triggerRef(comicSources);
        break;
      case SourceType.Video:
        _.remove(
          videoStore.videoSources,
          source => source.item.id === itemId,
        );
        triggerRef(videoSources);
        break;
    }
  };

  function loadSubscribeSources(load?: boolean, loadDelay = 2000) {
    load ??= false;
    const added: string[] = [];
    for (const source of subscribeSources.value) {
      if (source.detail) {
        for (const item of source.detail.urls) {
          if (!item.disable) {
            const found = getSource(item);
            if (found) {
              found.item = item;
            }
            else {
              addToSource(
                {
                  item,
                },
                false,
              );
            }
            added.push(item.id);
          }
        }
      }
    }
    const allSources = [
      ...photoStore.photoSources,
      ...songStore.songSources,
      ...bookStore.bookSources,
      ...comicStore.comicSources,
      ...videoStore.videoSources,
    ];
    for (const source of allSources) {
      if (!added.includes(source.item.id)) {
        if (source.item.id.includes('test')) {
          continue;
        }
        removeFromSource(source.item.id, source.item.type);
      }
    }
    if (load) {
      sleep(loadDelay).then(async () => {
        await Promise.all([
          ...photoStore.photoSources.map(async (s) => {
            if (!s.list?.list.length)
              await photoStore.photoRecommendList(s);
          }),
          ...songStore.songSources.map(async (s) => {
            if (!s.playlist?.list.length)
              await songStore.songRecommendPlayist(s);
            if (!s.songList?.list.length)
              await songStore.songRecommendSong(s);
          }),
          ...bookStore.bookSources.map(async (s) => {
            if (!s.list)
              await bookStore.bookRecommendList(s);
          }),
          ...comicStore.comicSources.map(async (s) => {
            if (!s.list)
              await comicStore.comicRecommendList(s);
          }),
          ...videoStore.videoSources.map(async (s) => {
            if (!s.list)
              await videoStore.videoRecommendList(s);
          }),
        ]);
        console.log('初始化加载完成');
      });
    }
  }

  const updateSubscribeSourceFromServer = async () => {
    if (_checkTs.value + 1000 * 60 * 60 * 24 > Date.now()) {
      return;
    }
    _checkTs.value = Date.now();
    for (let i = 0; i < 20; i++) {
      if (isEmpty.value) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      else {
        break;
      }
    }
    if (!isEmpty.value) {
      for (const source of subscribeSources.value) {
        if (source.url === 'marketSource') {
          await updateSubscribeSources(source, true);
        }
      }
    }
  };

  const onLoaded = async () => {
    const timeout = Date.now() + 8000;
    while (!storage.loaded && Date.now() < timeout) {
      await new Promise(r => setTimeout(r, 50));
    }
    await sleep(1000);
    loadSubscribeSources(true);

    if (subscribeSources.value.length === 0) {
      showConfirmDialog({
        title: '提示',
        message: '需要添加订阅源才能使用, \n是否立即导入默认订阅源？',
      })
        .then(async (action) => {
          if (action === 'confirm') {
            const source = await serverStore.getDefaultMarketSource();
            if (source) {
              const success = await addMarketSource(source);
              if (!success) {
                showToast('请手动在 订阅源市场 导入');
              }
              else {
                showSuccessToast('默认源已导入');
                showConfirmDialog({
                  title: '提示',
                  message: '您可以在 订阅源市场 添加更多订阅源',
                  confirmButtonText: '去添加',
                })
                  .then((action) => {
                    if (action === 'confirm') {
                      router.push({ name: 'SourceMarket' });
                    }
                  })
                  .catch(() => {});
              }
            }
            else {
              await sleep(2000);
            }
          }
        })
        .catch(() => {});
    }
  };

  onMounted(() => {
    if (displayStore.autoUpdateSubscribeSource) {
      updateSubscribeSourceFromServer();
    }
    onLoaded();
  });

  return {
    storage,
    subscribeSources,
    addSubscribeSource,
    removeSubscribeSource,
    removeItemFromSubscribeSource,
    getSubscribeSource,
    updateSubscribeSourceContent,
    clearSubscribeSources,
    syncData,
    loadSyncData,
    isEmpty,
    onLoaded,
    getSource,
    removeSource,
    addSubscribeSourceAction,
    addMarketSource,
    addLocalSubscribeSource,
    updateSubscribeSources,
    addToSource,
    removeFromSource,
    loadSubscribeSources,
  };
});
