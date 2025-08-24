import type { SubscribeSource } from '@/types';
import { Store } from '@tauri-apps/plugin-store';
import _ from 'lodash';
import { defineStore } from 'pinia';
import { computed, reactive } from 'vue';

export const useSubscribeSourceStore = defineStore('subscribeSource', () => {
  let store: Store | undefined;
  const subscribeSources = reactive<SubscribeSource[]>([]);
  const init = async () => {
    store = await Store.load('subscribeSourceStore.json');
    const stored = await store?.get<SubscribeSource[]>('subscribeSources');
    if (stored) {
      subscribeSources.push(...stored);
    }
  };
  const addSubscribeSource = async (source: SubscribeSource) => {
    const index = subscribeSources.findIndex(
      (item) => item.detail.id === source.detail.id,
    );
    if (index != -1) {
      subscribeSources[index] = source;
    } else {
      subscribeSources.push(source);
    }
    await saveSubscribeSources();
  };
  const removeSubscribeSource = async (source: SubscribeSource) => {
    const index = subscribeSources.findIndex(
      (s) => s.detail.id === source.detail.id,
    );
    if (index !== -1) {
      subscribeSources.splice(index, 1);
    }
    await saveSubscribeSources();
  };
  const removeItemFromSubscribeSource = async (
    itemId: string,
    sourceId: string,
  ) => {
    const source = subscribeSources.find((s) => s.detail.id === sourceId);
    if (source) {
      _.remove(source.detail.urls, (item) => item.id === itemId);
      await saveSubscribeSources();
    }
  };
  const getSubscribeSource = (
    sourceId: string,
  ): SubscribeSource | undefined => {
    return subscribeSources.find((item) => item.detail.id === sourceId);
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
        await saveSubscribeSources();
        return item;
      }
    }
  };
  const saveSubscribeSources = _.debounce(async () => {
    await store?.set('subscribeSources', subscribeSources);
  }, 500);
  const clearSubscribeSources = async () => {
    subscribeSources.length = 0;
    await store?.clear();
  };
  const isEmpty = computed(() => subscribeSources.length === 0);

  return {
    store,
    init,
    subscribeSources,
    addSubscribeSource,
    removeSubscribeSource,
    removeItemFromSubscribeSource,
    getSubscribeSource,
    updateSubscribeSourceContent,
    saveSubscribeSources,
    clearSubscribeSources,
    isEmpty,
  };
});
