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
import pLimit from 'p-limit';
import { defineStore, storeToRefs } from 'pinia';
import {
  showConfirmDialog,
  showFailToast,
  showLoadingToast,
  showNotify,
  showSuccessToast,
  showToast,
} from 'vant';
import { computed, markRaw, onMounted, ref, triggerRef } from 'vue';
import { router } from '@/router';
import { SourceType } from '@/types';
import { SyncTypes } from '@/types/sync';
import { sleep } from '@/utils';
import { normalizeMarketSourcePermissions } from '@/utils/marketSource';
import { showVipDialog } from '@/utils/vip';
import { useBookStore } from './bookStore';
import { enqueueOp } from './cloudSyncOps';
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

  const enqueueSubscribeUpsert = (source: SubscribeSource) => {
    enqueueOp({
      type: SyncTypes.SubscribeSource,
      op: 'upsertSubscribe',
      entityId: source.detail.id,
      payload: { ..._.cloneDeep(source) },
      clientUpdatedAt: Date.now(),
    });
  };

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
    enqueueSubscribeUpsert(source);
  };

  const removeSubscribeSource = async (source: SubscribeSource) => {
    const index = subscribeSources.value.findIndex(
      s => s.detail.id === source.detail.id,
    );
    if (index !== -1) {
      subscribeSources.value.splice(index, 1);
      loadSubscribeSources();
      enqueueOp({
        type: SyncTypes.SubscribeSource,
        op: 'removeSubscribe',
        entityId: source.detail.id,
        clientUpdatedAt: Date.now(),
      });
    }
  };

  const removeItemFromSubscribeSource = async (
    itemId: string,
    sourceId: string,
  ) => {
    const source = subscribeSources.value.find(s => s.detail.id === sourceId);
    if (source) {
      _.remove(source.detail.urls, item => item.id === itemId);
      loadSubscribeSources();
      enqueueSubscribeUpsert(source);
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
        enqueueSubscribeUpsert(subscribeSource);
        return item;
      }
    }
  };

  const setSourceDisabled = (
    source: SubscribeSource,
    disable: boolean,
  ) => {
    source.detail?.urls.forEach((url) => {
      url.disable = disable;
    });
    source.disable = disable;
    enqueueSubscribeUpsert(source);
  };

  const setSubscribeItemDisabled = (
    source: SubscribeSource,
    item: SubscribeItem,
    disable: boolean,
  ) => {
    item.disable = disable;
    if (disable) {
      if (source.detail?.urls.every(url => url.disable)) {
        source.disable = true;
      }
    }
    else {
      source.disable = false;
    }
    enqueueSubscribeUpsert(source);
  };

  const enableSubscribeItemById = (sourceId: string): boolean => {
    for (const subscribe of subscribeSources.value) {
      const item = subscribe.detail?.urls?.find(u => u.id === sourceId);
      if (item) {
        item.disable = false;
        subscribe.disable = false;
        enqueueSubscribeUpsert(subscribe);
        loadSubscribeSources();
        return true;
      }
    }
    return false;
  };

  const syncData = () => {
    return markRaw(subscribeSources.value);
  };

  const loadSyncData = async (data: SubscribeSource[]) => {
    subscribeSources.value = data;
  };

  const clearSubscribeSources = async () => {
    const now = Date.now();
    for (const s of [...subscribeSources.value]) {
      enqueueOp({
        type: SyncTypes.SubscribeSource,
        op: 'removeSubscribe',
        entityId: s.detail.id,
        clientUpdatedAt: now,
      });
    }
    subscribeSources.value.splice(0);
    await storage.clear();
  };

  const isEmpty = computed(() => subscribeSources.value.length === 0);
  const isLoaded = ref(false);
  /** 首次启动「导入默认订阅源」等引导弹窗进行中，其它 overlay 应延后展示 */
  const startupDialogActive = ref(false);
  const isLoading = ref(false);
  let loadingPromise: Promise<void> | null = null;
  let waitLoadingToast: { close: () => void } | null = null;
  let waitLoadingUsers = 0;

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
          if (item.id) {
            extensionStore.deleteSourceClass(item.id);
          }
          const sc = await extensionStore.getSourceClass(item);
          if (!sc) {
            showToast(`添加 ${item.name} 订阅源失败`);
            continue;
          }
          item.id ||= sc.id || sc.hash;
          item.name ||= sc.name;
          item.code ||= sc.codeString;
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
      // 仅同步已启用源到运行时，不拉取推荐内容（进入对应页面时再加载）
      loadSubscribeSources();
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

  const removeFromSource = (itemId: string, sourceType: SourceType) => {
    extensionStore.deleteSourceClass(itemId);
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

  const addMarketSource = async (
    marketSource: MarketSource,
  ): Promise<boolean> => {
    let needPermission = true;
    const { userInfo } = storeToRefs(serverStore);
    const permissions = normalizeMarketSourcePermissions(
      marketSource.permissions,
    );
    if (permissions.includes(MarketSourcePermission.NoLogin)) {
      needPermission = false;
    }
    else {
      if (
        permissions.includes(MarketSourcePermission.Login)
        && userInfo.value
      ) {
        needPermission = false;
      }
      if (
        permissions.includes(MarketSourcePermission.Vip)
        && serverStore.hasFeature('vip_market_source')
      ) {
        needPermission = false;
      }
      if (
        permissions.includes(MarketSourcePermission.Pro)
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
        }).then((action) => {
          if (action === 'confirm') {
            router.push({ name: 'Login' });
          }
        }).catch(() => {});
      }
      else {
        showVipDialog('请升级会员以访问此内容', '权限不足');
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
      const addedForRollback: { id: string; type: SourceType }[] = [];
      const abortImport = (message: string) => {
        for (const { id, type } of addedForRollback) {
          removeFromSource(id, type);
        }
        addedForRollback.length = 0;
        showToast(message);
        return false;
      };
      for (const sourceContent of marketSource.sourceContents || []) {
        try {
          if (sourceContent._id) {
            extensionStore.deleteSourceClass(sourceContent._id);
          }
          const sc = await extensionStore.getSourceClass(sourceContent);
          if (!sc) {
            return abortImport(`添加 ${marketSource.name} 订阅源失败`);
          }
          const item = {
            id: sc.id,
            name: sc.name,
            code: sc.codeString || sourceContent.code,
            type: sourceContent.type,
            url: sourceContent.url,
          };
          // 先写入订阅包；运行时注入与内容加载由 loadSubscribeSources / 页面懒加载负责
          addedForRollback.push({ id: sc.id, type: sourceContent.type });
          source.detail.urls.push(item);
        }
        catch (error) {
          return abortImport(`添加 ${marketSource.name} 订阅源失败`);
        }
      }
      if (source.detail.urls.length === 0) {
        const message
          = (marketSource.sourceContents?.length ?? 0) > 0
            ? `添加 ${marketSource.name} 订阅源失败`
            : '该订阅包没有可导入的源';
        return abortImport(message);
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
      loadSubscribeSources();
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
      source.detail.urls.push(item);
      addSubscribeSource(source);
      loadSubscribeSources();
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
      const limit = pLimit(1);
      await Promise.all(
        subscribeSources.value.map(item => limit(() => update(item))),
      );
      loadSubscribeSources();
    }
    else {
      await update(source);
      loadSubscribeSources();
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

  /**
   * 仅将已启用的订阅项同步到各类型运行时 store，不拉取推荐内容。
   * 推荐内容由各列表页首次进入（或启用后首次返回）时按需加载。
   * @param _load 兼容旧调用，已忽略
   * @param _loadDelay 兼容旧调用，已忽略
   */
  function loadSubscribeSources(_load?: boolean, _loadDelay = 2000) {
    const added: string[] = [];
    for (const source of subscribeSources.value) {
      if (source.detail) {
        for (const item of source.detail.urls) {
          if (!item.disable) {
            addToSource({ item }, false);
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
    if (isLoaded.value) {
      return;
    }
    if (loadingPromise) {
      await loadingPromise;
      return;
    }
    loadingPromise = (async () => {
      isLoading.value = true;
      const timeout = Date.now() + 8000;
      while (!storage.loaded && Date.now() < timeout) {
        await new Promise(r => setTimeout(r, 50));
      }
      // 仅注入已启用源到运行时；推荐内容由各列表页首次进入时按需加载
      loadSubscribeSources();

      if (subscribeSources.value.length === 0) {
        startupDialogActive.value = true;
        void showConfirmDialog({
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
                  try {
                    const followUp = await showConfirmDialog({
                      title: '提示',
                      message: '您可以在 订阅源市场 添加更多订阅源',
                      confirmButtonText: '去添加',
                    });
                    if (followUp === 'confirm') {
                      router.push({ name: 'SourceMarket' });
                    }
                  }
                  catch {
                    // 用户取消二次提示
                  }
                }
              }
              else {
                await sleep(2000);
              }
            }
          })
          .catch(() => {})
          .finally(() => {
            startupDialogActive.value = false;
          });
      }
      isLoaded.value = true;
    })().finally(() => {
      isLoading.value = false;
      loadingPromise = null;
    });
    await loadingPromise;
  };

  const waitForLoaded = async (
    timeoutMs = 10000,
    withLoading = true,
  ): Promise<boolean> => {
    if (isLoaded.value) {
      return true;
    }
    let loadingTimer: ReturnType<typeof setTimeout> | undefined;
    if (withLoading) {
      waitLoadingUsers += 1;
      loadingTimer = setTimeout(() => {
        if (!isLoaded.value && !waitLoadingToast) {
          waitLoadingToast = showLoadingToast({
            message: '正在加载订阅源...',
            duration: 0,
            closeOnClick: false,
            closeOnClickOverlay: false,
            forbidClick: true,
          });
        }
      }, 200);
    }

    try {
      const loadTask = onLoaded().then(() => isLoaded.value).catch(() => false);
      if (timeoutMs <= 0) {
        return await loadTask;
      }
      const timeoutTask = new Promise<boolean>((resolve) => {
        setTimeout(() => resolve(false), timeoutMs);
      });
      return await Promise.race([loadTask, timeoutTask]);
    }
    finally {
      if (loadingTimer) {
        clearTimeout(loadingTimer);
      }
      if (withLoading) {
        waitLoadingUsers = Math.max(0, waitLoadingUsers - 1);
        if (waitLoadingUsers === 0 && waitLoadingToast) {
          waitLoadingToast.close();
          waitLoadingToast = null;
        }
      }
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
    setSourceDisabled,
    setSubscribeItemDisabled,
    enableSubscribeItemById,
    clearSubscribeSources,
    syncData,
    loadSyncData,
    isEmpty,
    isLoaded,
    startupDialogActive,
    isLoading,
    onLoaded,
    waitForLoaded,
    getSource,
    removeSource,
    addSubscribeSourceAction,
    addMarketSource,
    addLocalSubscribeSource,
    updateSubscribeSources,
    addToSource,
    removeFromSource,
    loadSubscribeSources,
    localSourceId,
  };
});
