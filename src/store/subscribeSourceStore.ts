import type { SubscribeSource } from '@/types';
import _ from 'lodash';
import { defineStore } from 'pinia';
import { computed, markRaw } from 'vue';
import { createKVStore } from './utils';
import { debounceFilter, useStorageAsync } from '@vueuse/core';
import { estimateJsonSize } from '@/utils';

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
