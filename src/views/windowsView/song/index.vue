<script setup lang="ts">
import type { SongInfo } from '@/extensions/song';
import type { SongSource } from '@/types';
import WinPlaylistCard from '@/components/card/songCards/WinPlaylistCard.vue';
import WinSongCard from '@/components/card/songCards/WinSongCard.vue';
import HorizonList from '@/components/HorizonList.vue';
import SimplePagination from '@/components/pagination/SimplePagination.vue';
import ResponsiveGrid2 from '@/components/ResponsiveGrid2.vue';
import WinSearch from '@/components/windows/WinSearch.vue';
import WinSongBar from '@/components/windows/WinSongBar.vue';
import { useDisplayStore, useStore } from '@/store';
import SongShelf from '@/views/song/SongShelf.vue';
import PlayView from '@/views/song/PlayView.vue';
import { storeToRefs } from 'pinia';

const emit = defineEmits<{
  (e: 'search'): void;
  (e: 'recommend', force?: boolean): void;
  (e: 'playlistToPage', source: SongSource, pageNo: number): void;
  (e: 'songToPage', source: SongSource, pageNo: number): void;
  (e: 'playSong', source: SongSource, song: SongInfo): void;
  (e: 'openBaseUrl', source: SongSource): void;
}>();
const store = useStore();
const displayStore = useDisplayStore();
const { songSources } = storeToRefs(store);
const { showSongShelf, showPlayView } = storeToRefs(displayStore);

const searchValue = defineModel('searchValue', {
  type: String,
  default: '',
});
const activeTabIndex = defineModel('activeTabIndex', {
  type: Number,
  default: 0,
});
</script>

<template>
  <div class="w-full h-full flex flex-col">
    <div
      v-remember-scroll
      class="relative grow w-full h-full overflow-x-hidden"
      :class="
        showSongShelf || showPlayView ? 'overflow-y-hidden' : 'overflow-y-auto'
      "
    >
      <div class="flex items-center justify-between px-4 py-2">
        <div class="placeholder" />
        <WinSearch
          v-model:search-value="searchValue"
          @search="() => emit('search')"
        />
        <div
          class="text-button text-nowrap"
          @click="displayStore.showSongShelf = true"
        >
          收藏
        </div>
      </div>
      <van-tabs v-model:active="activeTabIndex" shrink animated>
        <van-tab
          v-for="item in songSources.filter((s) => s.playlist || s.songList)"
          :key="item.item.id"
          :title="item.item.name"
          class="p-4"
        >
          <van-loading v-if="!item.playlist && !item.songList" />
          <van-row
            v-if="item.playlist && item.playlist.totalPage"
            justify="space-between"
          >
            <van-button
              :plain="true"
              size="small"
              @click="() => emit('openBaseUrl', item)"
            >
              歌单
            </van-button>
            <SimplePagination
              v-model="item.playlist.page"
              :page-count="item.playlist.totalPage"
              @change="(page) => emit('playlistToPage', item, page)"
            />
          </van-row>
          <HorizonList>
            <div v-for="p in item.playlist?.list" :key="p.id" class="relative">
              <WinPlaylistCard :playlist="p" />
            </div>
          </HorizonList>
          <div class="h-4" />
          <van-row
            v-if="item.songList && item.songList.totalPage"
            justify="space-between"
          >
            <van-button
              :plain="true"
              size="small"
              @click="() => emit('openBaseUrl', item)"
            >
              歌曲
            </van-button>
            <SimplePagination
              v-model="item.songList.page"
              :page-count="item.songList.totalPage"
              @change="(page) => emit('songToPage', item, page)"
            />
          </van-row>
          <ResponsiveGrid2 :gap="2" class="px-0">
            <template v-for="p in item.songList?.list" :key="p.id">
              <WinSongCard :song="p" @play="() => emit('playSong', item, p)" />
            </template>
          </ResponsiveGrid2>
        </van-tab>
      </van-tabs>
      <SongShelf />
      <PlayView />
    </div>
    <WinSongBar />
  </div>
</template>

<style scoped lang="less"></style>
