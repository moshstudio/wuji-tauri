<script setup lang="ts">
import WinPlaylistDetail from '../windowsView/song/PlaylistDetail.vue';
import MobilePlaylistDetail from '../mobileView/song/PlaylistDetail.vue';
import PlatformSwitch from '@/components/PlatformSwitch.vue';
import { PlaylistInfo } from '@/extensions/song';
import { router } from '@/router';
import { useStore, useSongStore, useSongShelfStore } from '@/store';
import { SongSource } from '@/types';
import { showLoadingToast, showToast } from 'vant';
import { ref, triggerRef, onActivated, watch } from 'vue';
import { debounce } from 'lodash';
import { retryOnFalse, sleep } from '@/utils';

const { playlistId, sourceId } = defineProps({
  playlistId: String,
  sourceId: String,
});

const store = useStore();
const shelfStore = useSongShelfStore();
const songSource = ref<SongSource>();
const playlist = ref<PlaylistInfo>();

const currentPage = ref(1);
const content = ref<HTMLElement>();
const shouldLoad = ref(true);
function back() {
  shouldLoad.value = true;
  router.push({ name: 'Song' });
}

const loadData = retryOnFalse({ onFailed: back })(async (pageNo?: number) => {
  songSource.value = undefined;
  playlist.value = undefined;
  currentPage.value = 1;

  if (pageNo) {
    currentPage.value = pageNo;
  }
  if (!playlistId || !sourceId) {
    return false;
  }
  const source = store.getSongSource(sourceId);
  if (!source) {
    shouldLoad.value = true;
    return false;
  }
  songSource.value = source;

  const item = await store.getPlaylistInfo(source, playlistId);
  if (!item) {
    return false;
  }

  playlist.value = item;

  const toast = showLoadingToast({
    message: '加载中',
    duration: 0,
    closeOnClick: true,
    closeOnClickOverlay: false,
  });
  const detail = await store.songPlaylistDetail(
    source!,
    playlist.value!,
    currentPage.value
  );
  toast.close();
  if (detail) {
    playlist.value = detail;
    triggerRef(playlist);
  }
  if (!detail?.list?.list) {
    showToast('播放列表为空');
  }
  currentPage.value = detail?.list?.page || 1;
  if (content.value) content.value.scrollTop = 0;
  return true;
});
const toPage = debounce(loadData, 600);

const playAll = async () => {
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
};
const addToShelf = () => {
  if (!playlist.value) return;
  const res = shelfStore.addPlaylistToShelf(playlist.value);
  if (res) {
    showToast('收藏成功');
  }
};

watch([() => playlistId, () => sourceId], () => {
  shouldLoad.value = false; // watch这里优先load
  loadData();
});
onActivated(async () => {
  await sleep(200);
  if (shouldLoad.value) {
    shouldLoad.value = false;
    loadData();
  }
});
</script>

<template>
  <PlatformSwitch>
    <template #mobile>
      <MobilePlaylistDetail
        v-model:playlist="playlist"
        v-model:current-page="currentPage"
        v-model:content="content"
        @back="back"
        @load-data="loadData"
        @to-page="toPage"
        @play-all="playAll"
        @add-to-shelf="addToShelf"
      ></MobilePlaylistDetail>
    </template>
    <template #windows>
      <WinPlaylistDetail
        v-model:playlist="playlist"
        v-model:current-page="currentPage"
        v-model:content="content"
        @back="back"
        @load-data="loadData"
        @to-page="toPage"
        @play-all="playAll"
        @add-to-shelf="addToShelf"
      ></WinPlaylistDetail>
    </template>
  </PlatformSwitch>
</template>

<style scoped lang="less"></style>
