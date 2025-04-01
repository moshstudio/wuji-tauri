<script setup lang="ts">
import { useSongShelfStore, useSongStore, useStore } from '@/store';
import { ref, reactive, watch, onMounted, triggerRef, PropType } from 'vue';
import SongPlaylistPhoto from './photos/SongPlaylistPhoto.vue';
import ResponsiveGrid2 from './ResponsiveGrid2.vue';
import SimplePagination from './pagination/SimplePagination.vue';
import WinShelfSongCard from './card/songCards/WinShelfSongCard.vue';
import { PlaylistInfo, SongShelf } from '@/extensions/song';
import { SongShelfType } from '@/types/song';

const shelfStore = useSongShelfStore();
const songStore = useSongStore();
const selectedShelf = defineModel('selectedShelf', {
  type: Object as PropType<SongShelf>,
});
const emit = defineEmits<{
  (e: 'loadPage', id: String, pageNo?: number): void;
  (e: 'playAll', playlist: PlaylistInfo): void;
}>();

const c =
  'flex gap-1 p-1 items-center cursor-pointer rounded w-[120px] text-[--van-text-color] border-b-2 hover:bg-[var(--van-background)] ';
</script>

<template>
  <div class="flex w-full h-full">
    <div
      class="song-shelf-side flex flex-col w-[150px] text-[12px] p-1 gap-1 rounded overflow-x-hidden overflow-y-auto"
    >
      <div
        :class="c"
        :style="{
          borderBottomColor:
            selectedShelf?.playlist.id === shelfStore.songLikeShelf.playlist.id
              ? '#1989fa'
              : 'transparent',
        }"
        @click="selectedShelf = shelfStore.songLikeShelf"
      >
        <SongPlaylistPhoto
          :url="shelfStore.songLikeShelf.playlist.picUrl"
          :width="30"
          :height="30"
        ></SongPlaylistPhoto>
        <span>
          {{ shelfStore.songLikeShelf.playlist.name }}
        </span>
      </div>
      <p class="text-gray-400">
        创建的歌单({{ shelfStore.songCreateShelf.length }})
      </p>
      <template
        v-for="shelf in shelfStore.songCreateShelf"
        :key="shelf.playlist.id"
      >
        <p
          :class="c"
          :style="{
            borderBottomColor:
              selectedShelf?.playlist.id === shelf.playlist.id
                ? '#1989fa'
                : 'transparent',
          }"
          @click="selectedShelf = shelf"
        >
          <SongPlaylistPhoto
            :url="shelf.playlist.picUrl"
            :width="30"
            :height="30"
          ></SongPlaylistPhoto>
          <span class="text-justify truncate">
            {{ shelf.playlist.name }}
          </span>
        </p>
      </template>

      <p class="text-gray-400">
        收藏的歌单({{ shelfStore.songPlaylistShelf.length }})
      </p>
      <p
        :class="c"
        :style="{
          borderBottomColor:
            selectedShelf?.playlist.id === shelf.playlist.id
              ? '#1989fa'
              : 'transparent',
        }"
        v-for="shelf in shelfStore.songPlaylistShelf"
        :key="shelf.playlist.id"
        @click="selectedShelf = shelf"
      >
        <SongPlaylistPhoto
          :url="shelf.playlist.picUrl"
          :width="30"
          :height="30"
        ></SongPlaylistPhoto>
        <span class="text-justify truncate">
          {{ shelf.playlist.name }}
        </span>
      </p>
    </div>
    <van-divider vertical class="h-full" />
    <div
      class="song-shelf-main w-full overflow-x-hidden overflow-y-auto mb-[80px]"
    >
      <div
        class="flex gap-2"
        v-if="
          selectedShelf &&
          selectedShelf.type === SongShelfType.playlist &&
          selectedShelf.playlist.list &&
          (selectedShelf.playlist.list.totalPage || 0) > 1
        "
      >
        <van-button
          size="small"
          plain
          @click="() => emit('playAll', selectedShelf!.playlist)"
        >
          全部播放
        </van-button>
        <SimplePagination
          v-model="selectedShelf.playlist.list.page"
          :page-count="selectedShelf.playlist.list.totalPage || undefined"
          @change="
            (page: number) => emit('loadPage', selectedShelf!.playlist.id, page)
          "
        ></SimplePagination>
      </div>
      <ResponsiveGrid2>
        <div
          v-for="song in selectedShelf.playlist.list?.list"
          :key="song.id"
          v-if="selectedShelf"
        >
          <WinShelfSongCard
            :song="song"
            :shelf="selectedShelf"
            @play="
              () =>
                songStore.setPlayingList(
                  selectedShelf?.playlist.list?.list || [],
                  song
                )
            "
          ></WinShelfSongCard>
        </div>
      </ResponsiveGrid2>
    </div>
  </div>
</template>

<style scoped lang="less"></style>
