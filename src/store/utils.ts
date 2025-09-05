import type { StorageLikeAsync } from '@vueuse/core';

import { Channel, invoke, PluginListener } from '@tauri-apps/api/core';

import { Store } from '@tauri-apps/plugin-store';
import { defineStore } from 'pinia';
import { estimateJsonSize } from '@/utils';

export async function tauriAddPluginListener<T>(
  plugin: string,
  event: string,
  cb: (payload: T) => void,
) {
  const handler = new Channel();
  handler.onmessage = (response: unknown) => {
    cb(response as T);
  };
  console.log('tauriAddPluginListener', plugin, event);
  return invoke(`plugin:${plugin}|register_listener`, { event, handler }).then(
    () => new PluginListener(plugin, event, handler.id),
  );
}
export function createKVStore(name?: string) {
  return defineStore(`KVStore${name}`, () => {
    let store: Store | undefined;
    class KVStorage implements StorageLikeAsync {
      loaded = false;
      middleware = new Map<string, string>();
      constructor() {
        this.load();
      }

      async load() {
        const data = await Store.load(`${name || 'KVStore'}.json`);
        store = data;
        const entries = await data.entries<string>();
        for (const [key, value] of entries) {
          this.middleware.set(key, value);
        }
        this.loaded = true;
      }

      async getItem(key: string): Promise<string | null> {
        if (!this.loaded) {
          await this.load();
        }
        return this.middleware.get(key) || null;
      }

      async setItem(key: string, value: string): Promise<void> {
        this.middleware.set(key, value);
        await store?.set(key, value);
      }

      async removeItem(key: string): Promise<void> {
        this.middleware.delete(key);
        await store?.delete(key);
      }

      async clear(): Promise<void> {
        this.middleware.clear();
        await store?.clear();
      }

      size() {
        return estimateJsonSize(this.middleware);
      }
    }
    const storage = new KVStorage();

    return {
      storage,
    };
  })();
}
