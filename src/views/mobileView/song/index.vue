<script setup lang="ts">
import type { SongInfo } from '@/extensions/song';
import type { SongSource } from '@/types';
import MobilePlaylistCard from '@/components/card/songCards/MobilePlaylistCard.vue';
import MobileSongCard from '@/components/card/songCards/MobileSongCard.vue';
import HorizonList from '@/components/HorizonList.vue';
import MobileHeader from '@/components/mobile/MobileHeader.vue';
import MobileSongBar from '@/components/mobile/MobileSongBar.vue';
import SimplePagination from '@/components/pagination/SimplePagination.vue';
import ResponsiveGrid from '@/components/ResponsiveGrid.vue';
import { useDisplayStore, useStore } from '@/store';
import { sleep } from '@/utils';
import SongShelf from '@/views/song/SongShelf.vue';
import PlayView from '@/views/song/PlayView.vue';
import PlayingPlaylistSheet from '@/components/actionSheets/PlayingPlaylist.vue';
import { storeToRefs } from 'pinia';
import { ref } from 'vue';

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

const searchValue = defineModel('searchValue', {
  type: String,
  default: '',
});
const activeTabIndex = defineModel('activeTabIndex', {
  type: Number,
  default: 0,
});

function playSong(source: SongSource, song: SongInfo) {
  emit('playSong', source, song);
}

const isRefreshing = ref(false);
async function onRefresh() {
  isRefreshing.value = true;
  emit('search');
  await sleep(1000);
  isRefreshing.value = false;
}
</script>

<template>
  <div class="w-full h-full flex flex-col overflow-hidden">
    <div class="relative flex-1 min-h-0 flex flex-col">
      <MobileHeader
        v-model:search-value="searchValue"
        @search="() => emit('search')"
        @show-shelf="() => (displayStore.showSongShelf = true)"
      />
      <van-pull-refresh
        v-model="isRefreshing"
        v-remember-scroll
        class="main flex-grow overflow-x-hidden overflow-y-auto"
        @refresh="onRefresh"
      >
        <van-tabs
          v-model:active="activeTabIndex"
          shrink
          animated
          sticky
          swipeable
          offset-top="50px"
        >
          <van-tab
            v-for="item in songSources.filter((s) => s.playlist || s.songList)"
            :key="`tab${item.item.id}`"
            :title="item.item.name"
            class="p-2"
          >
            <div class="">
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
                <div
                  v-for="p in item.playlist?.list"
                  :key="`playlist${p.id}`"
                  class="relative"
                >
                  <MobilePlaylistCard :playlist="p" />
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
              <ResponsiveGrid class="p-[10px]">
                <template v-for="p in item.songList?.list" :key="`song${p.id}`">
                  <MobileSongCard :song="p" @play="() => playSong(item, p)" />
                </template>
              </ResponsiveGrid>
            </div>
          </van-tab>
        </van-tabs>
      </van-pull-refresh>
      <SongShelf />
      <PlayView />
      <PlayingPlaylistSheet />
    </div>
    <MobileSongBar />
  </div>
</template>

<style scoped lang="less"></style>
