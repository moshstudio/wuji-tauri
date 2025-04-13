<script setup lang="ts">
import type { PlaylistInfo, SongShelf } from '@/extensions/song';
import type { PropType } from 'vue';
import { useSongShelfStore, useSongStore } from '@/store';
import { SongShelfType } from '@/types/song';
import WinShelfSongCard from './card/songCards/WinShelfSongCard.vue';
import SimplePagination from './pagination/SimplePagination.vue';
import SongPlaylistPhoto from './photos/SongPlaylistPhoto.vue';
import ResponsiveGrid2 from './ResponsiveGrid2.vue';

const emit = defineEmits<{
  (e: 'loadPage', id: string, pageNo?: number): void;
  (e: 'playAll', playlist: PlaylistInfo): void;
}>();
const shelfStore = useSongShelfStore();
const songStore = useSongStore();
const selectedShelf = defineModel('selectedShelf', {
  type: Object as PropType<SongShelf>,
});
const c
  = 'flex gap-1 p-1 items-center cursor-pointer rounded w-[120px] text-[--van-text-color] border-b-2 hover:bg-[var(--van-background)] ';
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
        />
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
          />
          <span class="text-justify truncate">
            {{ shelf.playlist.name }}
          </span>
        </p>
      </template>

      <p class="text-gray-400">
        收藏的歌单({{ shelfStore.songPlaylistShelf.length }})
      </p>
      <p
        v-for="shelf in shelfStore.songPlaylistShelf"
        :key="shelf.playlist.id"
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
        />
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
        v-if="
          selectedShelf
            && selectedShelf.type === SongShelfType.playlist
            && selectedShelf.playlist.list
            && (selectedShelf.playlist.list.totalPage || 0) > 1
        "
        class="flex gap-2"
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
        />
      </div>
      <ResponsiveGrid2>
        <div
          v-for="song in selectedShelf.playlist.list?.list"
          v-if="selectedShelf"
          :key="song.id"
        >
          <WinShelfSongCard
            :song="song"
            :shelf="selectedShelf"
            @play="
              () =>
                songStore.setPlayingList(
                  selectedShelf?.playlist.list?.list || [],
                  song,
                )
            "
          />
        </div>
      </ResponsiveGrid2>
    </div>
  </div>
</template>

<style scoped lang="less"></style>
