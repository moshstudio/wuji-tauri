<script setup lang="ts">
import WinSongShelf from '../windowsView/song/SongShelf.vue';
import MobileSongShelf from '../mobileView/song/SongShelf.vue';
import PlatformSwitch from '@/components/PlatformSwitch.vue';
import {
  useStore,
  useSongStore,
  useSongShelfStore,
  useDisplayStore,
} from '@/store';
import _ from 'lodash';
import { showLoadingToast, showToast } from 'vant';
import { onMounted, onUnmounted, ref, triggerRef, watch } from 'vue';
import { PlaylistInfo, SongShelf } from '@/extensions/song';
import { sleep } from '@/utils';
import { SongShelfType } from '@/types/song';

const show = defineModel('show', { type: Boolean, default: false });

const store = useStore();
const shelfStore = useSongShelfStore();

const selectedShelf = ref<SongShelf>();

const loadPage = async (id: String, pageNo?: number) => {
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
};

const playAll = async (playlist: PlaylistInfo) => {
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
};

// 收藏展示相关
const offset = -80;
const shelfAnchors = ref([offset, Math.round(window.innerHeight) + offset]);
const shelfHeight = ref(0);
const hidePanel = () => {
  shelfHeight.value = shelfAnchors.value[0];
  show.value = false;
};
watch(
  show,
  (newValue) => {
    if (newValue) {
      shelfHeight.value = shelfAnchors.value[1];
    } else {
      shelfHeight.value = shelfAnchors.value[0];
    }
  },
  { immediate: true }
);
const updateAnchors = () => {
  shelfAnchors.value[1] = Math.round(window.innerHeight) + offset;
  if (show.value) {
    shelfHeight.value = shelfAnchors.value[1];
  }
};
onMounted(async () => {
  window.addEventListener('resize', updateAnchors);
  await sleep(1000);
  selectedShelf.value = shelfStore.songLikeShelf;
});
onUnmounted(() => {
  window.removeEventListener('resize', updateAnchors);
});
watch(
  selectedShelf,
  async (shelf) => {
    if (shelf) {
      selectedShelf.value = shelf;
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
              shelf.playlist
            );
            if (detail) {
              shelf.playlist.list = detail.list;
            }
          }
          break;
      }
    }
  },
  { immediate: true }
);
</script>

<template>
  <PlatformSwitch>
    <template #mobile>
      <MobileSongShelf
        v-model:show="show"
        v-model:shelf-anchors="shelfAnchors"
        v-model:shelf-height="shelfHeight"
        @load-page="loadPage"
        @play-all="playAll"
        @hide-panel="hidePanel"
      ></MobileSongShelf>
    </template>
    <template #windows>
      <WinSongShelf
        v-model:show="show"
        v-model:selected-shelf="selectedShelf"
        v-model:shelf-anchors="shelfAnchors"
        v-model:shelf-height="shelfHeight"
        @load-page="loadPage"
        @play-all="playAll"
        @hide-panel="hidePanel"
      ></WinSongShelf>
    </template>
  </PlatformSwitch>
</template>

<style scoped lang="less"></style>
