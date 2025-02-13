<script setup lang="ts">
import { useDisplayStore, useStore } from '@/store';
import { storeToRefs } from 'pinia';
import _ from 'lodash';
import PlaylistCard from '@/components/card/PlaylistCard.vue';
import WinSongCard from '@/components/card/songCards/WinSongCard.vue';
import WinSongBar from '@/components/windows/WinSongBar.vue';
import HorizonList from '@/components/HorizonList.vue';
import ResponsiveGrid from '@/components/ResponsiveGrid.vue';
import SimplePagination from '@/components/pagination/SimplePagination.vue';
import { SongSource } from '@/types';
import { SongInfo } from '@/extensions/song';
import SongShelf from '@/views/song/SongShelf.vue';

const store = useStore();
const displayStore = useDisplayStore();
const { songSources } = storeToRefs(store);

const showPlayView = defineModel('showPlayView', {
  type: Boolean,
  default: false,
});
const searchValue = defineModel('searchValue', {
  type: String,
  default: '',
});
const activeTabIndex = defineModel('activeTabIndex', {
  type: Number,
  default: 0,
});

const emit = defineEmits<{
  (e: 'search'): void;
  (e: 'recommend', force?: boolean): void;
  (e: 'playlistToPage', source: SongSource, pageNo: number): void;
  (e: 'songToPage', source: SongSource, pageNo: number): void;
  (e: 'playSong', source: SongSource, song: SongInfo): void;
  (e: 'openBaseUrl', source: SongSource): void;
}>();
</script>

<template>
  <div class="w-full h-full flex flex-col">
    <div class="grow overflow-x-hidden overflow-y-auto">
      <van-row justify="center" align="center" class="relative">
        <div
          class="absolute right-6 text-button"
          @click="displayStore.showSongShelf = true"
        >
          收藏
        </div>
        <van-search
          v-model="searchValue"
          placeholder="请输入搜索关键词"
          left-icon=""
          @click-right-icon="() => emit('search')"
          @search="() => emit('search')"
          @clear="() => emit('search')"
        >
          <template #right-icon>
            <van-icon name="search" class="van-haptics-feedback" />
          </template>
        </van-search>
      </van-row>
      <van-tabs v-model:active="activeTabIndex" shrink>
        <van-tab
          v-for="item in songSources.filter((s) => s.playlist || s.songList)"
          :key="item.item.id"
          :title="item.item.name"
          class="p-4"
        >
          <van-loading v-if="!item.playlist && !item.songList" />
          <van-row
            justify="space-between"
            v-if="item.playlist && item.playlist.totalPage"
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
              <PlaylistCard :playlist="p"></PlaylistCard>
            </div>
          </HorizonList>
          <div class="h-4"></div>
          <van-row
            justify="space-between"
            v-if="item.songList && item.songList.totalPage"
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
          <ResponsiveGrid>
            <template v-for="p in item.songList?.list" :key="p.id">
              <WinSongCard
                :song="p"
                @play="() => emit('playSong', item, p)"
                class="max-w-[250px]"
              ></WinSongCard>
            </template>
          </ResponsiveGrid>
        </van-tab>
      </van-tabs>
      <SongShelf></SongShelf>
    </div>
    <WinSongBar></WinSongBar>
  </div>
</template>

<style scoped lang="less"></style>
