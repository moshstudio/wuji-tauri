<script setup lang="ts">
import type { SongInfo, SongShelf } from '@wuji-tauri/source-extension';
import {
  MoreOptionsSheet,
  SongSelectShelfSheet,
} from '@wuji-tauri/components';
import { SongShelfType } from '@wuji-tauri/source-extension';
import { showFailToast, showLoadingToast } from 'vant';
import { ref, watch } from 'vue';
import PlatformSwitch from '@/components/platform/PlatformSwitch.vue';
import AppSongShelfDetail from '@/layouts/app/song/SongShelfDetail.vue';
import DesktopSongShelfDetail from '@/layouts/desktop/song/SongShelfDetail.vue';
import { useDownloadStore, useSongShelfStore, useSongStore, useStore, useSubscribeSourceStore } from '@/store';

const props = defineProps({
  shelfId: String,
});

const store = useStore();
const songStore = useSongStore();
const shelfStore = useSongShelfStore();
const downloadStore = useDownloadStore();
const subscribeStore = useSubscribeSourceStore();

const shelf = ref<SongShelf>();
const moreOptions = ref(false);
const moreOptionsShelf = ref<SongShelf>();
const moreOptionsSong = ref<SongInfo>();
const showAddToShelfSheet = ref(false);

async function toPage(shelf: SongShelf, pageNo: number) {
  const sourceId = shelf.playlist.sourceId;
  const loaded = await subscribeStore.waitForLoaded();
  if (!loaded) {
    showFailToast('订阅源加载超时，请稍后重试');
    return;
  }
  const source = store.getSongSource(sourceId);
  if (!source) {
    const subscribeSource = subscribeStore.subscribeSources.find(s =>
      s.detail.urls.some(u => u.id === sourceId),
    );
    const urlItem = subscribeSource?.detail.urls.find(u => u.id === sourceId);

    if (urlItem && (urlItem.disable || subscribeSource?.disable)) {
      showFailToast('音乐源已禁用，请在订阅源管理中启用');
    }
    else if (!urlItem) {
      showFailToast('音乐源不存在或已删除');
    }
    else {
      showFailToast('音乐源加载中');
    }
    return;
  }
  const t = showLoadingToast({
    duration: 0,
    closeOnClick: true,
    closeOnClickOverlay: false,
  });
  await store.songPlaylistDetail(source, shelf.playlist, pageNo, { silent: true });
  t.close();
}
async function playAll(shelf: SongShelf) {
  if (!shelf.playlist) {
    return;
  }
  if (
    shelf.type === SongShelfType.like
    || shelf.type === SongShelfType.create
  ) {
    if (shelf.playlist.list?.list.length) {
      const list = shelf.playlist.list!.list;
      await songStore.setPlayingList(list, list[0]);
    }
  }
  else {
    const t = showLoadingToast({
      message: '加载中',
      duration: 0,
      closeOnClick: true,
      closeOnClickOverlay: false,
    });
    await store.songPlaylistPlayAll(shelf.playlist);
    t.close();
  }
}

async function downloadAll(shelf: SongShelf) {
  const source = store.getSongSource(shelf.playlist.sourceId);
  downloadStore.startMusicPlaylistDownload(shelf.playlist, source);
}

async function downloadSong(song: SongInfo) {
  const source = store.getSongSource(song.sourceId);
  if (!source) {
    showFailToast('找不到音源');
    return;
  }
  const playUrl = await songStore.getSongPlayUrl(song);
  if (!playUrl)
    return;

  downloadStore.startMusicDownload(song, source, playUrl);
}

function removeShelf(shelf: SongShelf) {
  if (shelf.playlist.id) {
    shelfStore.removeSongShelf(shelf.playlist.id);
  }
}

function addToShelf(song: SongInfo, shelf: SongShelf) {
  shelfStore.addSongToShelf(song, shelf.playlist.id);
}

function removeSongFromShelf(shelf: SongShelf, song: SongInfo) {
  shelfStore.removeSongFromShelf(song, shelf.playlist.id);
}

function showMoreOptions(shelf: SongShelf, song: SongInfo) {
  moreOptionsShelf.value = shelf;
  moreOptionsSong.value = song;
  moreOptions.value = true;
}

watch(
  () => props.shelfId,
  () => {
    if (shelfStore.songLikeShelf.playlist.id === props.shelfId) {
      shelf.value = shelfStore.songLikeShelf;
    }
    else {
      shelf.value = shelfStore.songCreateShelf.find(
        s => s.playlist.id === props.shelfId,
      );
      if (!shelf.value) {
        shelf.value = shelfStore.songPlaylistShelf.find(
          s => s.playlist.id === props.shelfId,
        );
      }
    }
  },
  { immediate: true },
);
</script>

<template>
  <PlatformSwitch>
    <template #app>
      <AppSongShelfDetail
        :shelf="shelf"
        :to-page="toPage"
        :play-all="playAll"
        :download-all="downloadAll"
        :download-song="downloadSong"
        :remove-shelf="removeShelf"
        :show-more-options="showMoreOptions"
      />
    </template>
    <template #desktop>
      <DesktopSongShelfDetail
        :shelf="shelf"
        :to-page="toPage"
        :play-all="playAll"
        :download-all="downloadAll"
        :download-song="downloadSong"
        :remove-shelf="removeShelf"
        :show-more-options="showMoreOptions"
      />
    </template>
    <MoreOptionsSheet
      v-model="moreOptions"
      :actions="[
        // {
        //   name: '下载',
        //   subname: moreOptionsSong?.name,
        //   color: '#1989fa',
        //   callback: () => {
        //     moreOptions = false;
        //     if (moreOptionsSong) {
        //       downloadSong(moreOptionsSong);
        //     }
        //   },
        // },
        {
          name: '从当前收藏夹移除',
          subname: moreOptionsSong?.name,
          color: '#E74C3C',
          callback: () => {
            moreOptions = false;
            if (moreOptionsShelf && moreOptionsSong) {
              removeSongFromShelf(moreOptionsShelf, moreOptionsSong);
            }
          },
        },
        // {
        //   name: '添加到收藏夹',
        //   color: '#1989fa',
        //   callback: () => {
        //     moreOptions = false;
        //     showAddToShelfSheet = true;
        //   },
        // },
      ]"
    />
    <SongSelectShelfSheet
      v-if="moreOptionsSong"
      v-model:show="showAddToShelfSheet"
      :song="moreOptionsSong"
      :shelfs="shelfStore.songCreateShelf"
      :add-to-shelf="addToShelf"
    />
  </PlatformSwitch>
</template>

<style scoped lang="less"></style>
