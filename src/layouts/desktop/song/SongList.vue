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
defineProps<{
  search: (value: string) => void;
  recommend: (force?: boolean) => void;
  playlistToPage: (source: SongSource, pageNo: number) => void;
  songToPage: (source: SongSource, pageNo: number) => void;
  playSong: (source: SongSource, song: SongInfo) => void;
  openBaseUrl: (source: SongSource) => void;
  showMoreOptions: (source: SongSource, song: SongInfo) => void;
}>();

const store = useStore();
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
        v-for="source in songSources.filter((s) => s.playlist || s.songList)"
        :key="source.item.id"
        :title="source.item.name"
        class="p-4"
      >
        <van-loading v-if="!source.playlist && !source.songList" />
        <van-row
          v-if="source.playlist && source.playlist.totalPage"
          justify="space-between"
        >
          <van-button
            :plain="true"
            size="small"
            @click="() => openBaseUrl(source)"
          >
            歌单
          </van-button>
          <MPagination
            :page-no="source.playlist.page"
            :page-count="source.playlist.totalPage"
            :to-page="(page) => playlistToPage(source, page)"
          />
        </van-row>
        <HorizonList>
          <div v-for="p in source.playlist?.list" :key="p.id" class="relative">
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
          v-if="source.songList && source.songList.totalPage"
          justify="space-between"
        >
          <van-button
            :plain="true"
            size="small"
            @click="() => openBaseUrl(source)"
          >
            歌曲
          </van-button>
          <MPagination
            :page-no="source.songList.page"
            :page-count="source.songList.totalPage"
            :to-page="(page) => songToPage(source, page)"
          />
        </van-row>
        <ResponsiveGrid2>
          <template v-for="p in source.songList?.list" :key="p.id">
            <WSongCard
              :song="p"
              :is-playing="songStore.isPlaying"
              :is-playing-song="p.id === songStore.playingSong?.id"
              :play="() => playSong(source, p)"
              :pause="() => songStore.onPause()"
              :in-like-shelf="shelfStore.songInLikeShelf(p)"
              :add-to-like-shelf="shelfStore.addSongToShelf"
              :remove-from-like-shelf="shelfStore.removeSongFromShelf"
              :show-more-options="(song) => showMoreOptions(source, song)"
            />
          </template>
        </ResponsiveGrid2>
      </van-tab>
    </van-tabs>
    <WSongBar class="flex-shrink-0" />
  </div>
</template>

<style scoped lang="less"></style>
