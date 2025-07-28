<script setup lang="ts">
import PlatformSwitch from '@/components2/platform/PlatformSwitch.vue';
import AppSongShelfDetail from '@/layouts/app/song/SongShelfDetail.vue';
import DesktopSongShelfDetail from '@/layouts/desktop/song/SongShelfDetail.vue';
import { useSongShelfStore, useStore } from '@/store';
import { PlaylistInfo, SongShelf } from '@wuji-tauri/source-extension';
import { showLoadingToast, showToast } from 'vant';
import { ref, watch } from 'vue';
const props = defineProps({
  shelfId: String,
});

const store = useStore();
const shelf = ref<SongShelf>();
const shelfStore = useSongShelfStore();

async function toPage(shelf: SongShelf, pageNo: number) {
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
async function playAll(shelf: SongShelf) {
  if (!shelf.playlist) {
    return;
  }
  const t = showLoadingToast({
    message: '加载中',
    duration: 0,
    closeOnClick: true,
    closeOnClickOverlay: false,
  });
  await store.songPlaylistPlayAll(shelf.playlist);
  t.close();
}

function removeShelf(shelf: SongShelf) {
  if (shelf.playlist.id) {
    shelfStore.removeSongShelf(shelf.playlist.id);
  }
}

watch(
  () => props.shelfId,
  () => {
    if (shelfStore.songLikeShelf.playlist.id === props.shelfId) {
      shelf.value = shelfStore.songLikeShelf;
    } else {
      shelf.value = shelfStore.songCreateShelf.find(
        (s) => s.playlist.id === props.shelfId,
      );
      if (!shelf.value) {
        shelf.value = shelfStore.songPlaylistShelf.find(
          (s) => s.playlist.id === props.shelfId,
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
        :remove-shelf="removeShelf"
      />
    </template>
    <template #desktop>
      <DesktopSongShelfDetail
        :shelf="shelf"
        :to-page="toPage"
        :play-all="playAll"
        :remove-shelf="removeShelf"
      />
    </template>
  </PlatformSwitch>
</template>

<style scoped lang="less"></style>
