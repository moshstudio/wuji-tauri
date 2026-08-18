<script setup lang="ts">
import type { SyncOption } from '@/types/sync';
import { showSuccessToast } from 'vant';
import { ref } from 'vue';
import PlatformSwitch from '@/components/platform/PlatformSwitch.vue';
import AppFromServer from '@/layouts/app/sync/FromServer.vue';
import DesktopFromServer from '@/layouts/desktop/sync/FromServer.vue';
import {
  useBookShelfStore,
  useComicShelfStore,
  usePhotoShelfStore,
  useServerStore,
  useSongShelfStore,
  useSubscribeSourceStore,
  useVideoShelfStore,
} from '@/store';
import { useCloudSyncScheduler } from '@/store/cloudSyncScheduler';
import { suppressAutoSync } from '@/store/cloudSyncDirty';
import { SyncTypes } from '@/types/sync';
import {
  mergePhotoShelfData,
  mergeShelfData,
  mergeSongShelfData,
  mergeSubscribeSourceData,
} from '@/utils/syncMerge';

const subscribeStore = useSubscribeSourceStore();
const photoShelfStore = usePhotoShelfStore();
const songShelfStore = useSongShelfStore();
const bookShelfStore = useBookShelfStore();
const comicShelfStore = useComicShelfStore();
const videoShelfStore = useVideoShelfStore();
const serverStore = useServerStore();
const cloudSyncScheduler = useCloudSyncScheduler();
const syncOptions = ref<SyncOption[]>([
  {
    type: SyncTypes.SubscribeSource,
    name: '订阅源',
    sync: true,
    size: undefined,
    isIncremental: false,
  },
  {
    type: SyncTypes.PhotoShelf,
    name: '图片收藏',
    sync: true,
    size: undefined,
    isIncremental: false,
  },
  {
    type: SyncTypes.SongShelf,
    name: '音乐收藏',
    sync: true,
    size: undefined,
    isIncremental: false,
  },
  {
    type: SyncTypes.BookShelf,
    name: '书籍书架',
    sync: true,
    size: undefined,
    isIncremental: false,
  },
  {
    type: SyncTypes.ComicShelf,
    name: '漫画书架',
    sync: true,
    size: undefined,
    isIncremental: false,
  },
  {
    type: SyncTypes.VideoShelf,
    name: '影视收藏',
    sync: true,
    size: undefined,
    isIncremental: false,
  },
]);

async function onDownload() {
  const data = syncOptions.value
    .filter(item => item.sync)
    .map(item => item.type);
  const isIncremental
    = syncOptions.value.find(item => item.sync)?.isIncremental ?? false;

  cloudSyncScheduler.pauseForManualSync();
  try {
    const records = await serverStore.syncFromServer(data);
    if (!records) {
      return;
    }
    suppressAutoSync(8000);
    for (const record of records) {
      const type = record.type;
      const serverData = JSON.parse(record.data);

      switch (type) {
        case SyncTypes.SubscribeSource:
          if (isIncremental) {
            const currentData = subscribeStore.syncData();
            const mergedData = mergeSubscribeSourceData(currentData, serverData);
            await subscribeStore.loadSyncData(mergedData);
          }
          else {
            await subscribeStore.loadSyncData(serverData);
          }
          break;
        case SyncTypes.BookShelf:
          if (isIncremental) {
            const currentData = bookShelfStore.syncData();
            const mergedData = mergeShelfData(currentData, serverData, 'books');
            await bookShelfStore.loadSyncData(mergedData);
          }
          else {
            await bookShelfStore.loadSyncData(serverData);
          }
          break;
        case SyncTypes.ComicShelf:
          if (isIncremental) {
            const currentData = comicShelfStore.syncData();
            const mergedData = mergeShelfData(currentData, serverData, 'comics');
            await comicShelfStore.loadSyncData(mergedData);
          }
          else {
            await comicShelfStore.loadSyncData(serverData);
          }
          break;
        case SyncTypes.PhotoShelf:
          if (isIncremental) {
            const currentData = photoShelfStore.syncData();
            const mergedData = mergePhotoShelfData(currentData, serverData);
            await photoShelfStore.loadSyncData(mergedData);
          }
          else {
            await photoShelfStore.loadSyncData(serverData);
          }
          break;
        case SyncTypes.SongShelf:
          if (isIncremental) {
            const currentData = songShelfStore.syncData();
            const mergedData = mergeSongShelfData(currentData, serverData);
            await songShelfStore.loadSyncData(mergedData);
          }
          else {
            await songShelfStore.loadSyncData(serverData);
          }
          break;
        case SyncTypes.VideoShelf:
          if (isIncremental) {
            const currentData = videoShelfStore.syncData();
            const mergedData = mergeShelfData(currentData, serverData, 'videos');
            await videoShelfStore.loadSyncData(mergedData);
          }
          else {
            await videoShelfStore.loadSyncData(serverData);
          }
          break;
      }
    }
    showSuccessToast('下载同步成功');
  }
  finally {
    cloudSyncScheduler.resumeAfterManualSync();
  }
}
</script>

<template>
  <PlatformSwitch>
    <template #app>
      <AppFromServer
        :sync-options="syncOptions"
        :on-download="onDownload"
      />
    </template>
    <template #desktop>
      <DesktopFromServer
        :sync-options="syncOptions"
        :on-download="onDownload"
      />
    </template>
  </PlatformSwitch>
</template>

<style scoped lang="less"></style>
