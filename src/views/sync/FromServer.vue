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

const onDownload = async () => {
  const data = syncOptions.value
    .filter((item) => item.sync)
    .map((item) => item.type);
  // 获取第一个选中项的增量设置，所有项使用相同设置
  const isIncremental =
    syncOptions.value.find((item) => item.sync)?.isIncremental ?? false;

  const records = await serverStore.syncFromServer(data);
  if (!records) {
    return;
  }
  for (const record of records) {
    const type = record.type;
    const serverData = JSON.parse(record.data);

    switch (type) {
      case SyncTypes.SubscribeSource:
        if (isIncremental) {
          // 增量模式：合并数据
          const currentData = subscribeStore.syncData();
          const mergedData = mergeSubscribeSourceData(currentData, serverData);
          await subscribeStore.loadSyncData(mergedData);
        } else {
          // 覆盖模式：直接使用服务器数据
          await subscribeStore.loadSyncData(serverData);
        }
        break;
      case SyncTypes.BookShelf:
        if (isIncremental) {
          const currentData = bookShelfStore.syncData();
          const mergedData = mergeShelfData(currentData, serverData, 'books');
          await bookShelfStore.loadSyncData(mergedData);
        } else {
          await bookShelfStore.loadSyncData(serverData);
        }
        break;
      case SyncTypes.ComicShelf:
        if (isIncremental) {
          const currentData = comicShelfStore.syncData();
          const mergedData = mergeShelfData(currentData, serverData, 'comics');
          await comicShelfStore.loadSyncData(mergedData);
        } else {
          await comicShelfStore.loadSyncData(serverData);
        }
        break;
      case SyncTypes.PhotoShelf:
        if (isIncremental) {
          const currentData = photoShelfStore.syncData();
          const mergedData = mergePhotoShelfData(currentData, serverData);
          await photoShelfStore.loadSyncData(mergedData);
        } else {
          await photoShelfStore.loadSyncData(serverData);
        }
        break;
      case SyncTypes.SongShelf:
        if (isIncremental) {
          const currentData = songShelfStore.syncData();
          const mergedData = mergeSongShelfData(currentData, serverData);
          await songShelfStore.loadSyncData(mergedData);
        } else {
          await songShelfStore.loadSyncData(serverData);
        }
        break;
      case SyncTypes.VideoShelf:
        if (isIncremental) {
          const currentData = videoShelfStore.syncData();
          const mergedData = mergeShelfData(currentData, serverData, 'videos');
          await videoShelfStore.loadSyncData(mergedData);
        } else {
          await videoShelfStore.loadSyncData(serverData);
        }
        break;
    }
  }
  showSuccessToast('下载同步成功');
};

// 合并订阅源数据
const mergeSubscribeSourceData = (localData: any[], serverData: any[]) => {
  const mergedMap = new Map();

  // 先添加本地数据
  localData.forEach((source: any) => {
    mergedMap.set(source.detail.id, source);
  });

  // 再添加服务器数据（会覆盖相同 id 的本地数据，并合并 detail.urls）
  serverData.forEach((serverSource: any) => {
    const localSource = mergedMap.get(serverSource.detail.id);
    if (localSource) {
      // 合并 urls 数组
      const urlsMap = new Map();
      localSource.detail.urls?.forEach((url: any) => {
        urlsMap.set(url.id, url);
      });
      serverSource.detail.urls?.forEach((url: any) => {
        urlsMap.set(url.id, url);
      });
      serverSource.detail.urls = Array.from(urlsMap.values());
    }
    mergedMap.set(serverSource.detail.id, serverSource);
  });

  return Array.from(mergedMap.values());
};

// 合并书架/漫画架/影视收藏数据
const mergeShelfData = (
  localData: any[],
  serverData: any[],
  itemKey: string,
) => {
  const mergedMap = new Map();

  // 先添加本地数据
  localData.forEach((shelf: any) => {
    mergedMap.set(shelf.id, shelf);
  });

  // 再添加服务器数据
  serverData.forEach((serverShelf: any) => {
    const localShelf = mergedMap.get(serverShelf.id);
    if (localShelf) {
      // 合并书架中的items（books/comics/videos）
      const itemsMap = new Map();
      localShelf[itemKey]?.forEach((item: any) => {
        const id = item.book?.id || item.comic?.id || item.video?.id;
        if (id) itemsMap.set(id, item);
      });
      serverShelf[itemKey]?.forEach((item: any) => {
        const id = item.book?.id || item.comic?.id || item.video?.id;
        if (id) itemsMap.set(id, item);
      });
      serverShelf[itemKey] = Array.from(itemsMap.values());
    }
    mergedMap.set(serverShelf.id, serverShelf);
  });

  return Array.from(mergedMap.values());
};

// 合并图片收藏数据
const mergePhotoShelfData = (localData: any[], serverData: any[]) => {
  const mergedMap = new Map();

  // 先添加本地数据
  localData.forEach((shelf: any) => {
    mergedMap.set(shelf.id, shelf);
  });

  // 再添加服务器数据
  serverData.forEach((serverShelf: any) => {
    const localShelf = mergedMap.get(serverShelf.id);
    if (localShelf) {
      // 合并 photos 数组
      const photosMap = new Map();
      localShelf.photos?.forEach((photo: any) => {
        photosMap.set(photo.id, photo);
      });
      serverShelf.photos?.forEach((photo: any) => {
        photosMap.set(photo.id, photo);
      });
      serverShelf.photos = Array.from(photosMap.values());
    }
    mergedMap.set(serverShelf.id, serverShelf);
  });

  return Array.from(mergedMap.values());
};

// 合并音乐收藏数据
const mergeSongShelfData = (localData: any, serverData: any) => {
  const mergeSongList = (localShelf: any, serverShelf: any) => {
    if (!localShelf || !serverShelf) return serverShelf;
    const songsMap = new Map();
    localShelf.playlist?.list?.list?.forEach((song: any) => {
      songsMap.set(song.id, song);
    });
    serverShelf.playlist?.list?.list?.forEach((song: any) => {
      songsMap.set(song.id, song);
    });
    if (serverShelf.playlist?.list) {
      serverShelf.playlist.list.list = Array.from(songsMap.values());
    }
    return serverShelf;
  };

  // 合并 songCreateShelf
  const createShelfMap = new Map();
  localData.songCreateShelf?.forEach((shelf: any) => {
    createShelfMap.set(shelf.playlist.id, shelf);
  });
  serverData.songCreateShelf?.forEach((serverShelf: any) => {
    const localShelf = createShelfMap.get(serverShelf.playlist.id);
    createShelfMap.set(
      serverShelf.playlist.id,
      mergeSongList(localShelf, serverShelf),
    );
  });

  // 合并 songPlaylistShelf
  const playlistShelfMap = new Map();
  localData.songPlaylistShelf?.forEach((shelf: any) => {
    playlistShelfMap.set(shelf.playlist.id, shelf);
  });
  serverData.songPlaylistShelf?.forEach((serverShelf: any) => {
    const localShelf = playlistShelfMap.get(serverShelf.playlist.id);
    playlistShelfMap.set(
      serverShelf.playlist.id,
      mergeSongList(localShelf, serverShelf),
    );
  });

  return {
    songCreateShelf: Array.from(createShelfMap.values()),
    songPlaylistShelf: Array.from(playlistShelfMap.values()),
    songLikeShelf: mergeSongList(
      localData.songLikeShelf,
      serverData.songLikeShelf,
    ),
  };
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
