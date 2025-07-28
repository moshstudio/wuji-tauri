<script setup lang="ts">
import type { SongInfo } from '@wuji-tauri/source-extension';
import type { SongSource } from '@/types';
import { MPlaylistCard } from '@wuji-tauri/components/src';
import { MSongCard } from '@wuji-tauri/components/src';
import HorizonList from '@/components2/list/HorizonList.vue';
import MHeader from '@/components2/header/MHeader.vue';
import MSongBar from '@/components2/songbar/MSongBar.vue';
import MPagination from '@/components2/pagination/MPagination.vue';
import ResponsiveGrid2 from '@/components2/grid/ResponsiveGrid2.vue';
import { useSongStore, useStore } from '@/store';
import { sleep } from '@/utils';
import { storeToRefs } from 'pinia';
import { ref } from 'vue';
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
const songStore = useSongStore();
const { songSources } = storeToRefs(store);

const isRefreshing = ref(false);
async function onRefresh() {
  isRefreshing.value = true;
  props.search(searchValue.value);
  await sleep(1000);
  isRefreshing.value = false;
}
</script>

<template>
  <div class="flex h-full w-full flex-col overflow-hidden">
    <MHeader
      v-model:value="searchValue"
      @search="() => search(searchValue)"
      @show-shelf="
        () => {
          router.push({ name: 'SongShelf' });
        }
      "
    />
    <div class="relative flex min-h-0 flex-1 flex-col">
      <van-pull-refresh
        v-model="isRefreshing"
        v-remember-scroll
        :head-height="100"
        class="main flex-grow overflow-y-auto overflow-x-hidden"
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
                <div
                  v-for="p in item.playlist?.list"
                  :key="`playlist${p.id}`"
                  class="relative"
                >
                  <MPlaylistCard
                    :playlist="p"
                    :click="
                      () => {
                        router.push({
                          name: 'SongPlaylistDetail',
                          params: {
                            playlistId: p.id,
                            sourceId: p.sourceId,
                          },
                        });
                      }
                    "
                  />
                </div>
              </HorizonList>
              <div class="h-4"></div>
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
              <ResponsiveGrid2 >
                <template v-for="p in item.songList?.list" :key="`song${p.id}`">
                  <MSongCard
                    :song="p"
                    :is-playing="songStore.isPlaying"
                    :is-playing-song="p.id === songStore.playingSong?.id"
                    :play="() => playSong(item, p)"
                    :pause="songStore.onPause"
                  />
                </template>
              </ResponsiveGrid2>
            </div>
          </van-tab>
        </van-tabs>
      </van-pull-refresh>
    </div>
    <MSongBar />
  </div>
</template>

<style scoped lang="less"></style>
