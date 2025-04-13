<script setup lang="ts">
import type { SongInfo } from '@/extensions/song';
import type { SongSource } from '@/types';
import PlatformSwitch from '@/components/PlatformSwitch.vue';
import { useDisplayStore, useSongStore, useStore } from '@/store';
import { createCancellableFunction } from '@/utils/cancelableFunction';
import { storeToRefs } from 'pinia';
import { ref } from 'vue';
import MobileSong from '../mobileView/song/index.vue';
import WinSong from '../windowsView/song/index.vue';

const store = useStore();
const displayStore = useDisplayStore();
const songStore = useSongStore();
const { songSources } = storeToRefs(store);

const showPlayView = ref(false);

const searchValue = ref('');
let playlistTimer: NodeJS.Timeout;
let songTimer: NodeJS.Timeout;
const activeTabIndex = ref(0);

const search = createCancellableFunction(async (signal: AbortSignal) => {
  const keyword = searchValue.value;
  const t = displayStore.showToast();
  if (!keyword) {
    await recommend(true);
  }
  else {
    await Promise.all([
      ...songSources.value.map(async (source) => {
        if (signal.aborted)
          return;
        await store.songSearchPlaylist(source, keyword, 1);
      }),
      ...songSources.value.map(async (source) => {
        if (signal.aborted)
          return;
        await store.songSearchSong(source, keyword, 1);
      }),
    ]);
  }
  displayStore.closeToast(t);
});

async function recommend(force: boolean = false) {
  clearTimeout(playlistTimer);
  playlistTimer = setTimeout(async () => {
    await Promise.all(
      songSources.value.map(async (source) => {
        if (!source.playlist || force) {
          await store.songRecommendPlayist(source);
        }
      }),
    );
  }, 0);
  clearTimeout(songTimer);
  songTimer = setTimeout(async () => {
    await Promise.all(
      songSources.value.map(async (source) => {
        if (!source.songList || force) {
          await store.songRecommendSong(source);
        }
      }),
    );
  }, 0);
}

async function playlistToPage(source: SongSource, pageNo: number) {
  if (!searchValue.value) {
    await store.songRecommendPlayist(source, pageNo);
  }
  else {
    await store.songSearchPlaylist(source, searchValue.value, pageNo);
  }
}
async function songToPage(source: SongSource, pageNo: number) {
  if (!searchValue.value) {
    await store.songRecommendSong(source, pageNo);
  }
  else {
    await store.songSearchSong(source, searchValue.value, pageNo);
  }
}

async function playSong(source: SongSource, song: SongInfo) {
  if (!source.songList?.list.length) {
    return;
  }
  const songs = source.songList.list;
  songStore.setPlayingList(songs, song);
}

async function openBaseUrl(source: SongSource) {
  const sc = await store.sourceClass(source.item);
  if (sc && sc.baseUrl) {
    // open(sc.baseUrl);
  }
}
</script>

<template>
  <PlatformSwitch>
    <template #mobile>
      <MobileSong
        v-model:show-play-view="showPlayView"
        v-model:search-value="searchValue"
        v-model:active-tab-index="activeTabIndex"
        @search="search"
        @recommend="recommend"
        @playlist-to-page="playlistToPage"
        @song-to-page="songToPage"
        @open-base-url="openBaseUrl"
        @play-song="playSong"
      />
    </template>
    <template #windows>
      <WinSong
        v-model:show-play-view="showPlayView"
        v-model:search-value="searchValue"
        v-model:active-tab-index="activeTabIndex"
        @search="search"
        @recommend="recommend"
        @playlist-to-page="playlistToPage"
        @song-to-page="songToPage"
        @open-base-url="openBaseUrl"
        @play-song="playSong"
      />
    </template>
  </PlatformSwitch>
</template>

<style scoped lang="less"></style>
