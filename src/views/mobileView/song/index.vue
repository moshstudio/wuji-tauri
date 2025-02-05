<script setup lang="ts">
import { useStore } from '@/store';
import { storeToRefs } from 'pinia';
import _ from 'lodash';
import PlaylistCard from '@/components/card/PlaylistCard.vue';
import MobileSongCard from '@/components/card/songCards/MobileSongCard.vue';
import HorizonList from '@/components/HorizonList.vue';
import ResponsiveGrid from '@/components/ResponsiveGrid.vue';
import SimplePagination from '@/components/SimplePagination.vue';
import { SongSource } from '@/types';
import { SongInfo } from '@/extensions/song';
import SongShelf from '@/views/song/SongShelf.vue';
import MobileSongBar from '@/components/mobile/MobileSongBar.vue';
import SearchButton from '@/components/mobile/Search.vue';
import LeftPopup from '@/components/mobile/LeftPopup.vue';
import { ref } from 'vue';
import { sleep } from '@/utils';

const store = useStore();
const { songSources } = storeToRefs(store);

const showSongShelf = defineModel('showSongShelf', {
  type: Boolean,
  default: false,
});
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

const playSong = (source: SongSource, song: SongInfo) => {
  emit('playSong', source, song);
};

const emit = defineEmits<{
  (e: 'search'): void;
  (e: 'recommend', force?: boolean): void;
  (e: 'playlistToPage', source: SongSource, pageNo: number): void;
  (e: 'songToPage', source: SongSource, pageNo: number): void;
  (e: 'playSong', source: SongSource, song: SongInfo): void;
  (e: 'openBaseUrl', source: SongSource): void;
}>();

const isRefreshing = ref(false);
const onRefresh = async () => {
  isRefreshing.value = true;
  emit('search');
  await sleep(1000);
  isRefreshing.value = false;
};
</script>

<template>
  <div class="w-full h-full flex flex-col">
    <header class="px-4 h-[50px] flex justify-between items-center">
      <LeftPopup></LeftPopup>
      <div class="flex gap-2 items-center h-[50px]">
        <SearchButton
          v-model="searchValue"
          @search="() => emit('search')"
        ></SearchButton>
        <van-icon
          name="star-o"
          class="text-button-2"
          @click="() => (showSongShelf = !showSongShelf)"
        />
      </div>
    </header>
    <van-pull-refresh
      v-remember-scroll
      v-model="isRefreshing"
      @refresh="onRefresh"
      class="main grow overflow-x-hidden overflow-y-auto"
    >
      <van-tabs v-model:active="activeTabIndex" shrink sticky offset-top="50px">
        <van-tab
          v-for="item in songSources.filter((s) => s.playlist || s.songList)"
          :key="item.item.id"
          :title="item.item.name"
          class="p-2"
        >
          <div class="">
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
              <div
                v-for="p in item.playlist?.list"
                :key="p.id"
                class="relative"
              >
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
            <div class="grid grid-cols-2 gap-2 pt-2">
              <template v-for="p in item.songList?.list" :key="p.id">
                <MobileSongCard
                  :song="p"
                  @play="() => playSong(item, p)"
                  class="max-w-[250px]"
                ></MobileSongCard>
              </template>
            </div>
          </div>
        </van-tab>
      </van-tabs>
    </van-pull-refresh>
    <!-- <main class="flex-1 min-h-0">
      
    </main> -->
    <footer>
      <MobileSongBar v-model:show-play-view="showPlayView"></MobileSongBar>
    </footer>
    <SongShelf v-model:show="showSongShelf"></SongShelf>
  </div>
</template>

<style scoped lang="less"></style>
