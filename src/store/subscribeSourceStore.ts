import type { SubscribeSource } from '@/types';
import _ from 'lodash';
import { defineStore } from 'pinia';
import { computed, markRaw, onMounted } from 'vue';
import { createKVStore } from './utils';
import { debounceFilter, useStorage, useStorageAsync } from '@vueuse/core';
import { estimateJsonSize } from '@/utils';
import { useServerStore } from './serverStore';
import { useDisplayStore } from './displayStore';
import { useStore } from './store';

export const useSubscribeSourceStore = defineStore('subscribeSource', () => {
  const kvStorage = createKVStore('subscribeSourceStore');
  const storage = kvStorage.storage;

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
      (item) => item.detail.id === source.detail.id,
    );
    if (index !== -1) {
      subscribeSources.value[index] = source;
    } else {
      subscribeSources.value.push(source);
    }
  };
  const removeSubscribeSource = async (source: SubscribeSource) => {
    const index = subscribeSources.value.findIndex(
      (s) => s.detail.id === source.detail.id,
    );
    if (index !== -1) {
      subscribeSources.value.splice(index, 1);
    }
  };
  const removeItemFromSubscribeSource = async (
    itemId: string,
    sourceId: string,
  ) => {
    const source = subscribeSources.value.find((s) => s.detail.id === sourceId);
    if (source) {
      _.remove(source.detail.urls, (item) => item.id === itemId);
    }
  };
  const getSubscribeSource = (
    sourceId: string,
  ): SubscribeSource | undefined => {
    return subscribeSources.value.find((item) => item.detail.id === sourceId);
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
        (item) => item.id === sourceContent.id,
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
  const updateSubscribeSourceFromServer = async () => {
    if (_checkTs.value + 1000 * 60 * 60 * 24 > Date.now()) {
      // 24h内不重复检测
      return;
    }
    _checkTs.value = Date.now();
    // 检测是否isEmpty，最多2s，100ms检测一次
    for (let i = 0; i < 20; i++) {
      if (isEmpty.value) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      } else {
        break;
      }
    }
    if (!isEmpty.value) {
      const store = useStore();
      for (const source of subscribeSources.value) {
        if (source.url === 'marketSource') {
          await store.updateSubscribeSources(source, true);
        }
      }
    }
  };
  onMounted(() => {
    const displayStore = useDisplayStore();
    const serverStore = useServerStore();
    if (displayStore.autoUpdateSubscribeSource) {
      // if (!serverStore.isVipOrSuperVip) return;
      updateSubscribeSourceFromServer();
    }
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
  };
});
