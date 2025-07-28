<script setup lang="ts">
import type { SongInfo } from '@wuji-tauri/source-extension';
import type { SongSource } from '@/types';
import { WPlaylistCard } from '@wuji-tauri/components/src';
import { WSongCard } from '@wuji-tauri/components/src';
import WHeader from '@/components2/header/WHeader.vue';
import HorizonList from '@/components2/list/HorizonList.vue';
import MPagination from '@/components2/pagination/MPagination.vue';
import ResponsiveGrid2 from '@/components2/grid/ResponsiveGrid2.vue';
import WSongBar from '@/components2/songbar/WSongBar.vue';
import {
  useDisplayStore,
  useSongShelfStore,
  useSongStore,
  useStore,
} from '@/store';
import { storeToRefs } from 'pinia';
import { router } from '@/router';

const searchValue = defineModel<string>('searchValue', {
  default: '',
});
const activeTabIndex = defineModel<number>('activeTabIndex', {
  default: 0,
});
const props = defineProps<{
  search: (value: string) => void;
  recommend: (force?: boolean) => void;
  playlistToPage: (source: SongSource, pageNo: number) => void;
  songToPage: (source: SongSource, pageNo: number) => void;
  playSong: (source: SongSource, song: SongInfo) => void;
  openBaseUrl: (source: SongSource) => void;
}>();

const store = useStore();
const displayStore = useDisplayStore();
const songStore = useSongStore();
const shelfStore = useSongShelfStore();
const { songSources } = storeToRefs(store);
</script>

<template>
  <div class="flex h-full w-full flex-col overflow-hidden">
    <WHeader
      v-model:value="searchValue"
      @search="() => search(searchValue)"
      @show-shelf="
        () => {
          router.push({ name: 'SongShelf' });
        }
      "
    />
    <van-tabs
      v-model:active="activeTabIndex"
      shrink
      animated
      sticky
      offset-top="50px"
      class="flex-1 overflow-y-auto"
    >
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
            @click="() => openBaseUrl(item)"
          >
            歌单
          </van-button>
          <MPagination
            :page-no="item.playlist.page"
            :page-count="item.playlist.totalPage"
            :to-page="(page) => playlistToPage(item, page)"
          />
        </van-row>
        <HorizonList>
          <div v-for="p in item.playlist?.list" :key="p.id" class="relative">
            <WPlaylistCard
              :playlist="p"
              :click="
                (playlist) => {
                  $router.push({
                    name: 'SongPlaylistDetail',
                    params: {
                      playlistId: playlist.id,
                      sourceId: playlist.sourceId,
                    },
                  });
                }
              "
            ></WPlaylistCard>
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
            @click="() => openBaseUrl(item)"
          >
            歌曲
          </van-button>
          <MPagination
            :page-no="item.songList.page"
            :page-count="item.songList.totalPage"
            :to-page="(page) => songToPage(item, page)"
          />
        </van-row>
        <ResponsiveGrid2>
          <template v-for="p in item.songList?.list" :key="p.id">
            <WSongCard
              :song="p"
              :shelfs="shelfStore.songCreateShelf"
              :is-playing="songStore.isPlaying"
              :is-playing-song="p.id === songStore.playingSong?.id"
              :play="() => playSong(item, p)"
              :pause="() => songStore.onPause()"
              :in-like-shelf="shelfStore.songInLikeShelf(p)"
              :add-to-like-shelf="shelfStore.addSongToShelf"
              :remove-from-like-shelf="shelfStore.removeSongFromShelf"
              :add-to-shelf="
                (song, shelf) =>
                  shelfStore.addSongToShelf(song, shelf.playlist.id)
              "
            />
          </template>
        </ResponsiveGrid2>
      </van-tab>
    </van-tabs>
    <!-- <div
      v-remember-scroll
      class="relative flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden"
    ></div> -->
    <WSongBar class="flex-shrink-0" />
  </div>
</template>

<style scoped lang="less"></style>
