<script setup lang="ts">
import type { PlaylistInfo } from '@/extensions/song';
import PlatformSwitch from '@/components/PlatformSwitch.vue';
import { useDisplayStore, useSongShelfStore, useStore } from '@/store';
import { SongShelfType } from '@/types/song';
import { sleep } from '@/utils';
import { storeToRefs } from 'pinia';
import { showLoadingToast, showToast } from 'vant';
import { onMounted, onUnmounted, ref, watch } from 'vue';
import MobileSongShelf from '../mobileView/song/SongShelf.vue';
import WinSongShelf from '../windowsView/song/SongShelf.vue';

const store = useStore();
const displayStore = useDisplayStore();
const { showSongShelf, selectedSongShelf } = storeToRefs(displayStore);
const shelfStore = useSongShelfStore();

async function loadPage(id: string, pageNo?: number) {
  const shelf = shelfStore.songPlaylistShelf.find((s) => s.playlist.id === id);
  if (!shelf) return;
  const source = store.getSongSource(shelf.playlist.sourceId);
  if (!source) {
    showToast('找不到歌曲源');
    return;
  }
  const t = showLoadingToast({
    duration: 0,
    closeOnClick: true,
    closeOnClickOverlay: false,
  });
  await store.songPlaylistDetail(source, shelf.playlist, pageNo);
  t.close();
}

async function playAll(playlist: PlaylistInfo) {
  if (!playlist) {
    return;
  }
  const t = showLoadingToast({
    message: '加载中',
    duration: 0,
    closeOnClick: true,
    closeOnClickOverlay: false,
  });
  await store.songPlaylistPlayAll(playlist);
  t.close();
}

onMounted(async () => {
  await sleep(500);
  if (showSongShelf && !selectedSongShelf.value) {
    selectedSongShelf.value = shelfStore.songLikeShelf;
  }
});

watch(
  selectedSongShelf,
  async (shelf) => {
    if (shelf) {
      switch (shelf.type) {
        case SongShelfType.like:
          break;
        case SongShelfType.create:
          break;
        case SongShelfType.playlist:
          const source = store.getSongSource(shelf.playlist.sourceId);
          if (!source) {
            showToast('歌曲源不存在或未启用');
          } else {
            const detail = await store.songPlaylistDetail(
              source,
              shelf.playlist,
            );
            if (detail) {
              shelf.playlist.list = detail.list;
            }
          }
          break;
      }
    }
  },
  { immediate: true },
);
</script>

<template>
  <PlatformSwitch>
    <template #mobile>
      <MobileSongShelf @load-page="loadPage" @play-all="playAll" />
    </template>
    <template #windows>
      <WinSongShelf @load-page="loadPage" @play-all="playAll" />
    </template>
  </PlatformSwitch>
</template>

<style scoped lang="less"></style>
