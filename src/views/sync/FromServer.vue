<script setup lang="ts">
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
import { SyncOption, SyncTypes } from '@/types/sync';
import _ from 'lodash';
import { showFailToast, showSuccessToast } from 'vant';
import { ref } from 'vue';

const subscribeStore = useSubscribeSourceStore();
const photoShelfStore = usePhotoShelfStore();
const songShelfStore = useSongShelfStore();
const bookShelfStore = useBookShelfStore();
const comicShelfStore = useComicShelfStore();
const videoShelfStore = useVideoShelfStore();
const serverStore = useServerStore();
const syncOptions = ref<SyncOption[]>([
  {
    type: SyncTypes.SubscribeSource,
    name: '订阅源',
    sync: true,
    size: undefined,
  },
  {
    type: SyncTypes.PhotoShelf,
    name: '图片收藏',
    sync: true,
    size: undefined,
  },
  {
    type: SyncTypes.SongShelf,
    name: '音乐收藏',
    sync: true,
    size: undefined,
  },
  {
    type: SyncTypes.BookShelf,
    name: '书籍书架',
    sync: true,
    size: undefined,
  },
  {
    type: SyncTypes.ComicShelf,
    name: '漫画书架',
    sync: true,
    size: undefined,
  },
  {
    type: SyncTypes.VideoShelf,
    name: '影视收藏',
    sync: true,
    size: undefined,
  },
]);

const onDownload = async () => {
  const data = syncOptions.value
    .filter((item) => item.sync)
    .map((item) => item.type);
  const records = await serverStore.syncFromServer(data);
  if (!records) {
    return;
  }
  for (const record of records) {
    const type = record.type;
    const data = JSON.parse(record.data);

    switch (type) {
      case SyncTypes.SubscribeSource:
        await subscribeStore.loadSyncData(data);
        break;
      case SyncTypes.BookShelf:
        await bookShelfStore.loadSyncData(data);
        break;
      case SyncTypes.ComicShelf:
        await comicShelfStore.loadSyncData(data);
        break;
      case SyncTypes.PhotoShelf:
        await photoShelfStore.loadSyncData(data);
        break;
      case SyncTypes.SongShelf:
        await songShelfStore.loadSyncData(data);
        break;
      case SyncTypes.VideoShelf:
        await videoShelfStore.loadSyncData(data);
        break;
    }
  }
  showSuccessToast('下载同步成功');
};
</script>

<template>
  <PlatformSwitch>
    <template #app>
      <AppFromServer
        v-bind:sync-options="syncOptions"
        :onDownload="onDownload"
      />
    </template>
    <template #desktop>
      <DesktopFromServer
        v-bind:sync-options="syncOptions"
        :onDownload="onDownload"
      />
    </template>
  </PlatformSwitch>
</template>

<style scoped lang="less"></style>
