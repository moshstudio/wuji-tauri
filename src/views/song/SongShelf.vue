<script setup lang="ts">
import type { PlaylistInfo } from '@/extensions/song';
import PlatformSwitch from '@/components/PlatformSwitch.vue';
import {
  useDisplayStore,
  useSongShelfStore,
  useStore,
} from '@/store';
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
  const shelf = shelfStore.songPlaylistShelf.find(s => s.playlist.id === id);
  if (!shelf)
    return;
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

// 收藏展示相关
const offset = -80;
const shelfAnchors = ref([offset, Math.round(window.innerHeight) + offset]);
const shelfHeight = ref(0);
function hidePanel() {
  shelfHeight.value = shelfAnchors.value[0];
  showSongShelf.value = false;
}
watch(
  showSongShelf,
  (newValue) => {
    if (newValue) {
      shelfHeight.value = shelfAnchors.value[1];
    }
    else {
      shelfHeight.value = shelfAnchors.value[0];
    }
  },
  { immediate: true },
);
function updateAnchors() {
  shelfAnchors.value[1] = Math.round(window.innerHeight) + offset;
  if (showSongShelf.value) {
    shelfHeight.value = shelfAnchors.value[1];
  }
}
onMounted(async () => {
  window.addEventListener('resize', updateAnchors);
  await sleep(1000);
  if (showSongShelf && !selectedSongShelf.value) {
    selectedSongShelf.value = shelfStore.songLikeShelf;
  }
});
onUnmounted(() => {
  window.removeEventListener('resize', updateAnchors);
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
          }
          else {
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
      <MobileSongShelf
        v-model:shelf-anchors="shelfAnchors"
        v-model:shelf-height="shelfHeight"
        @load-page="loadPage"
        @play-all="playAll"
        @hide-panel="hidePanel"
      />
    </template>
    <template #windows>
      <WinSongShelf
        v-model:shelf-anchors="shelfAnchors"
        v-model:shelf-height="shelfHeight"
        @load-page="loadPage"
        @play-all="playAll"
        @hide-panel="hidePanel"
      />
    </template>
  </PlatformSwitch>
</template>

<style scoped lang="less"></style>
