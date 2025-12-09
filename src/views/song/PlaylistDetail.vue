<script setup lang="ts">
import type {
  PlaylistInfo,
  SongInfo,
  SongShelf,
} from '@wuji-tauri/source-extension';
import type { SongSource } from '@/types';
import {
  MoreOptionsSheet,
  SongSelectShelfSheet,
} from '@wuji-tauri/components/src';
import { showLoadingToast, showToast } from 'vant';
import { onActivated, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import PlatformSwitch from '@/components/platform/PlatformSwitch.vue';
import AppPlaylistDetail from '@/layouts/app/song/PlaylistDetail.vue';
import DesktopPlaylistDetail from '@/layouts/desktop/song/PlaylistDetail.vue';
import { useSongShelfStore, useStore } from '@/store';
import { useBackStore } from '@/store/backStore';
import { retryOnFalse } from '@/utils';

const { playlistId, sourceId } = defineProps({
  playlistId: String,
  sourceId: String,
});

const route = useRoute();
const store = useStore();
const backStore = useBackStore();
const shelfStore = useSongShelfStore();
const songSource = ref<SongSource>();
const playlist = ref<PlaylistInfo>();
const shouldReload = ref(false);

const currentPage = ref(1);

const moreOptions = ref(false);
const moreOptionsSong = ref<SongInfo>();
const showAddToShelfSheet = ref(false);

function clear() {
  songSource.value = undefined;
  playlist.value = undefined;
  currentPage.value = 1;
  shouldReload.value = false;
}

const toPage = retryOnFalse({
  onFailed: () => {
    if (route.name === 'SongPlaylistDetail') {
      backStore.back();
    }
  },
})(async (pageNo?: number) => {
  clear();
  currentPage.value = pageNo || 1;

  if (!playlistId || !sourceId) {
    shouldReload.value = true;
    return false;
  }

  songSource.value = store.getSongSource(sourceId);
  if (!songSource.value) {
    shouldReload.value = true;
    return false;
  }

  playlist.value = store.getPlaylistInfo(songSource.value, playlistId);
  if (!playlist.value) {
    shouldReload.value = true;
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
  shouldReload.value = !playlist.value || !playlist.value.list?.list?.length;

  return !!playlist.value;
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

function songAddToShelf(song: SongInfo, shelf: SongShelf) {
  shelfStore.addSongToShelf(song, shelf.playlist.id);
}

function showMoreOptions(playlist: PlaylistInfo, song: SongInfo) {
  moreOptionsSong.value = song;
  moreOptions.value = true;
}

watch(
  [() => playlistId, () => sourceId],
  () => {
    toPage();
  },
  { immediate: true },
);

onActivated(() => {
  if (shouldReload.value) {
    toPage(currentPage.value || 1);
  }
});
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
        :show-more-options="showMoreOptions"
      />
    </template>
    <MoreOptionsSheet
      v-model="moreOptions"
      :actions="[
        {
          name: '添加到收藏夹',
          color: '#1989fa',
          callback: () => {
            moreOptions = false;
            showAddToShelfSheet = true;
          },
        },
      ]"
    />
    <SongSelectShelfSheet
      v-if="moreOptionsSong"
      v-model:show="showAddToShelfSheet"
      :song="moreOptionsSong"
      :shelfs="shelfStore.songCreateShelf"
      :add-to-shelf="songAddToShelf"
    />
  </PlatformSwitch>
</template>

<style scoped lang="less"></style>
