<script setup lang="ts">
import PlatformSwitch from '@/components/platform/PlatformSwitch.vue';
import AppToServer from '@/layouts/app/sync/ToServer.vue';
import DesktopToServer from '@/layouts/desktop/sync/ToServer.vue';
import {
  useBookShelfStore,
  useComicShelfStore,
  usePhotoShelfStore,
  useServerStore,
  useSongShelfStore,
  useStore,
  useSubscribeSourceStore,
  useVideoShelfStore,
} from '@/store';
import { SyncOption, SyncTypes } from '@/types/sync';
import { bytesToSize, estimateJsonSize, sleep } from '@/utils';
import { onMountedOrActivated } from '@vant/use';
import _ from 'lodash';
import { closeDialog, showDialog, showFailToast, showSuccessToast } from 'vant';
import { onMounted, ref } from 'vue';

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

const onSync = async () => {
  if (
    _.sum(syncOptions.value.map((item) => item.size ?? 0)) >=
    1024 * 1024 * 10
  ) {
    showDialog({
      title: '同步失败',
      message: '数据过大\n同步数据不可超过10M',
      showCancelButton: false,
      showConfirmButton: true,
    });
    return;
  }
  const data = [];
  if (syncOptions.value[0].sync) {
    data.push({
      type: SyncTypes.SubscribeSource,
      data: JSON.stringify(subscribeStore.syncData()),
    });
  }
  if (syncOptions.value[1].sync) {
    data.push({
      type: SyncTypes.PhotoShelf,
      data: JSON.stringify(photoShelfStore.syncData()),
    });
  }
  if (syncOptions.value[2].sync) {
    data.push({
      type: SyncTypes.SongShelf,
      data: JSON.stringify(songShelfStore.syncData()),
    });
  }
  if (syncOptions.value[3].sync) {
    data.push({
      type: SyncTypes.BookShelf,
      data: JSON.stringify(bookShelfStore.syncData()),
    });
  }
  if (syncOptions.value[4].sync) {
    data.push({
      type: SyncTypes.ComicShelf,
      data: JSON.stringify(comicShelfStore.syncData()),
    });
  }
  if (syncOptions.value[5].sync) {
    data.push({
      type: SyncTypes.VideoShelf,
      data: JSON.stringify(videoShelfStore.syncData()),
    });
  }
  await serverStore.syncToServer(data);
};

onMountedOrActivated(async () => {
  if (!subscribeStore.subscribeSources.length) {
    await sleep(1000);
  }
  syncOptions.value[0].size = estimateJsonSize(subscribeStore.syncData());
  syncOptions.value[1].size = estimateJsonSize(photoShelfStore.syncData());
  syncOptions.value[2].size = estimateJsonSize(songShelfStore.syncData());
  syncOptions.value[3].size = estimateJsonSize(bookShelfStore.syncData());
  syncOptions.value[4].size = estimateJsonSize(comicShelfStore.syncData());
  syncOptions.value[5].size = estimateJsonSize(videoShelfStore.syncData());
});
</script>

<template>
  <PlatformSwitch>
    <template #app>
      <AppToServer v-bind:sync-options="syncOptions" :onSync="onSync" />
    </template>
    <template #desktop>
      <DesktopToServer v-bind:sync-options="syncOptions" :onSync="onSync" />
    </template>
  </PlatformSwitch>
</template>

<style scoped lang="less"></style>
