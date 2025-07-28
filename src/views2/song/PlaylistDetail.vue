<script setup lang="ts">
import type { PlaylistInfo } from '@wuji-tauri/source-extension';
import type { SongSource } from '@/types';
import PlatformSwitch from '@/components2/platform/PlatformSwitch.vue';
import { useSongShelfStore, useStore } from '@/store';
import { retryOnFalse } from '@/utils';
import { showLoadingToast, showToast } from 'vant';
import { ref, watch } from 'vue';
import AppPlaylistDetail from '@/layouts/app/song/PlaylistDetail.vue';
import DesktopPlaylistDetail from '@/layouts/desktop/song/PlaylistDetail.vue';
import { useBackStore } from '@/store/backStore';

const { playlistId, sourceId } = defineProps({
  playlistId: String,
  sourceId: String,
});

const store = useStore();
const backStore = useBackStore();
const shelfStore = useSongShelfStore();
const songSource = ref<SongSource>();
const playlist = ref<PlaylistInfo>();

const currentPage = ref(1);

const clear = () => {
  songSource.value = undefined;
  playlist.value = undefined;
  currentPage.value = 1;
};

const toPage = retryOnFalse({ onFailed: backStore.back })(async (
  pageNo?: number,
) => {
  clear();
  currentPage.value = pageNo || 1;
  if (!playlistId || !sourceId) {
    return false;
  }
  songSource.value = store.getSongSource(sourceId);
  if (!songSource.value) {
    return false;
  }

  playlist.value = store.getPlaylistInfo(songSource.value, playlistId);
  if (!playlist.value) {
    return false;
  }

  const toast = showLoadingToast({
    message: '加载中',
    duration: 0,
    closeOnClick: true,
    closeOnClickOverlay: false,
  });
  playlist.value =
    (await store.songPlaylistDetail(
      songSource.value,
      playlist.value,
      pageNo,
    )) || undefined;
  toast.close();
  currentPage.value = playlist.value?.list?.page || 1;
  return true;
});

async function playAll() {
  if (!playlist.value) {
    return;
  }
  const t = showLoadingToast({
    message: '加载中',
    duration: 0,
    closeOnClick: true,
    closeOnClickOverlay: false,
  });
  await store.songPlaylistPlayAll(playlist.value);
  t.close();
}
function addToShelf() {
  if (!playlist.value) return;
  const res = shelfStore.addPlaylistToShelf(playlist.value);
  if (res) {
    showToast('收藏成功');
  }
}

watch(
  [() => playlistId, () => sourceId],
  () => {
    toPage();
  },
  { immediate: true },
);
</script>

<template>
  <PlatformSwitch>
    <template #app>
      <AppPlaylistDetail
        :playlist="playlist"
        :page-no="currentPage"
        :in-shelf="shelfStore.playlistInShelf(playlist)"
        :to-page="(_playlist, pageNo) => toPage(pageNo)"
        :play-all="playAll"
        :add-to-shelf="addToShelf"
      />
    </template>
    <template #desktop>
      <DesktopPlaylistDetail
        :playlist="playlist"
        :page-no="currentPage"
        :in-shelf="shelfStore.playlistInShelf(playlist)"
        :to-page="(_playlist, pageNo) => toPage(pageNo)"
        :play-all="playAll"
        :add-to-shelf="addToShelf"
      />
    </template>
  </PlatformSwitch>
</template>

<style scoped lang="less"></style>
