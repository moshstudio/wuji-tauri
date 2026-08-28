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
function toStorageString(value: unknown): string | null {
  if (value == null) {
    return null;
  }
  return typeof value === 'string' ? value : JSON.stringify(value);
}

export function createKVStore(name?: string) {
  return defineStore(`KVStore${name}`, () => {
    let store: Store | undefined;
    class KVStorage implements StorageLikeAsync {
      loaded = false;
      middleware = new Map<string, string>();
      private loadPromise: Promise<void> | null = null;

      constructor() {
        void this.load().catch((error) => {
          console.error(`[KVStore${name || ''}] failed to load`, error);
        });
      }

      async load() {
        if (this.loaded) {
          return;
        }
        if (this.loadPromise) {
          return this.loadPromise;
        }
        this.loadPromise = (async () => {
          const data = await Store.load(`${name || 'KVStore'}.json`);
          store = data;
          const entries = await data.entries<string>();
          for (const [key, value] of entries) {
            const serialized = toStorageString(value);
            if (serialized != null) {
              this.middleware.set(key, serialized);
            }
          }
          this.loaded = true;
        })().finally(() => {
          this.loadPromise = null;
        });
        return this.loadPromise;
      }

      async getItem(key: string): Promise<string | null> {
        if (!this.loaded) {
          await this.load();
        }
        return toStorageString(this.middleware.get(key));
      }

      async setItem(key: string, value: string): Promise<void> {
        if (!this.loaded) {
          await this.load();
        }
        this.middleware.set(key, value);
        await store?.set(key, value);
      }

      async removeItem(key: string): Promise<void> {
        if (!this.loaded) {
          await this.load();
        }
        this.middleware.delete(key);
        await store?.delete(key);
      }

      async clear(): Promise<void> {
        if (!this.loaded) {
          await this.load();
        }
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
