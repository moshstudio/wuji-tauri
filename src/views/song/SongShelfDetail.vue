<script setup lang="ts">
import {
  MoreOptionsSheet,
  SongSelectShelfSheet,
} from '@wuji-tauri/components/src';
import PlatformSwitch from '@/components/platform/PlatformSwitch.vue';
import AppSongShelfDetail from '@/layouts/app/song/SongShelfDetail.vue';
import DesktopSongShelfDetail from '@/layouts/desktop/song/SongShelfDetail.vue';
import { useSongShelfStore, useSongStore, useStore } from '@/store';
import {
  PlaylistInfo,
  SongInfo,
  SongShelf,
  SongShelfType,
} from '@wuji-tauri/source-extension';
import { showLoadingToast, showToast } from 'vant';
import { ref, watch } from 'vue';
const props = defineProps({
  shelfId: String,
});

const store = useStore();
const songStore = useSongStore();
const shelfStore = useSongShelfStore();

const shelf = ref<SongShelf>();
const moreOptions = ref(false);
const moreOptionsShelf = ref<SongShelf>();
const moreOptionsSong = ref<SongInfo>();
const showAddToShelfSheet = ref(false);

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
  if (
    shelf.type === SongShelfType.like ||
    shelf.type === SongShelfType.create
  ) {
    if (shelf.playlist.list?.list.length) {
      const list = shelf.playlist.list!.list;
      await songStore.setPlayingList(list, list[0]);
    }
  } else {
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
        :show-more-options="showMoreOptions"
      />
    </template>
    <template #desktop>
      <DesktopSongShelfDetail
        :shelf="shelf"
        :to-page="toPage"
        :play-all="playAll"
        :remove-shelf="removeShelf"
        :show-more-options="showMoreOptions"
      />
    </template>
    <MoreOptionsSheet
      v-model="moreOptions"
      :actions="[
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
