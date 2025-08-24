<script setup lang="ts">
import type { SongInfo, SongShelf } from '@wuji-tauri/source-extension';
import type { SongSource } from '@/types';
import {
  MoreOptionsSheet,
  SongSelectShelfSheet,
} from '@wuji-tauri/components/src';
import PlatformSwitch from '@/components/platform/PlatformSwitch.vue';
import {
  useDisplayStore,
  useSongShelfStore,
  useSongStore,
  useStore,
} from '@/store';
import { createCancellableFunction } from '@/utils/cancelableFunction';
import { storeToRefs } from 'pinia';
import { ref } from 'vue';
import AppSongList from '@/layouts/app/song/SongList.vue';
import DesktopSongList from '@/layouts/desktop/song/SongList.vue';

const store = useStore();
const displayStore = useDisplayStore();
const songStore = useSongStore();
const shelfStore = useSongShelfStore();
const { songSources } = storeToRefs(store);

const searchValue = ref('');
let playlistTimer: NodeJS.Timeout;
let songTimer: NodeJS.Timeout;
const activeTabIndex = ref(0);

const moreOptions = ref(false);
const moreOptionsSong = ref<SongInfo>();
const showAddToShelfSheet = ref(false);

const search = createCancellableFunction(async (signal: AbortSignal) => {
  const keyword = searchValue.value;
  const t = displayStore.showToast();
  if (!keyword) {
    await recommend(true);
  } else {
    await Promise.all([
      ...songSources.value.map(async (source) => {
        if (signal.aborted) return;
        await store.songSearchPlaylist(source, keyword, 1);
      }),
      ...songSources.value.map(async (source) => {
        if (signal.aborted) return;
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
  } else {
    await store.songSearchPlaylist(source, searchValue.value, pageNo);
  }
}
async function songToPage(source: SongSource, pageNo: number) {
  if (!searchValue.value) {
    await store.songRecommendSong(source, pageNo);
  } else {
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

function addToShelf(song: SongInfo, shelf: SongShelf) {
  shelfStore.addSongToShelf(song, shelf.playlist.id);
}

function showMoreOptions(source: SongSource, song: SongInfo) {
  moreOptionsSong.value = song;
  moreOptions.value = true;
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
    <template #app>
      <AppSongList
        v-model:search-value="searchValue"
        v-model:active-tab-index="activeTabIndex"
        :search="search"
        :recommend="recommend"
        :playlist-to-page="playlistToPage"
        :song-to-page="songToPage"
        :open-base-url="openBaseUrl"
        :play-song="playSong"
      />
    </template>
    <template #desktop>
      <DesktopSongList
        v-model:search-value="searchValue"
        v-model:active-tab-index="activeTabIndex"
        :search="search"
        :recommend="recommend"
        :playlist-to-page="playlistToPage"
        :song-to-page="songToPage"
        :open-base-url="openBaseUrl"
        :play-song="playSong"
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
      :add-to-shelf="addToShelf"
    />
  </PlatformSwitch>
</template>

<style scoped lang="less"></style>
