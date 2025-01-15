<script setup lang="ts">
import { ref, onMounted } from "vue";
import {
  useStore,
  useSongStore,
  useDisplayStore,
  useBookShelfStore,
} from "@/store";
import { storeToRefs } from "pinia";
import _ from "lodash";
import { open } from "@tauri-apps/plugin-shell";
import PlaylistCard from "@/components/card/PlaylistCard.vue";
import SongCard from "@/components/card/SongCard.vue";
import SongBar from "@/windows/components/SongBar.vue";
import HorizonList from "@/components/HorizonList.vue";
import ResponsiveGrid from "@/components/ResponsiveGrid.vue";
import SimplePagination from "@/components/SimplePagination.vue";
import { SongSource } from "@/types";
import { SongInfo } from "@/extensions/song";
import { createCancellableFunction } from "@/utils/cancelableFunction";
import SongShelf from "./SongShelf.vue";

const store = useStore();
const songStore = useSongStore();
const { songSources } = storeToRefs(store);

const showSongShelf = ref(false);

const searchValue = ref("");
let playlistTimer: NodeJS.Timeout;
let songTimer: NodeJS.Timeout;
const activeTabIndex = ref(0);

const search = createCancellableFunction(async () => {
  const keyword = searchValue.value;
  if (!keyword) {
    return recommend(true);
  } else {
    await Promise.all([
      ...songSources.value.map(async (source) => {
        await store.songSearchPlaylist(source, keyword, 1);
      }),
      ...songSources.value.map(async (source) => {
        await store.songSearchSong(source, keyword, 1);
      }),
    ]);
  }
});

async function recommend(force: boolean = false) {
  clearTimeout(playlistTimer);
  playlistTimer = setTimeout(async () => {
    await Promise.all(
      songSources.value.map(async (source) => {
        if (!source.playlist || force) {
          await store.songRecommendPlayist(source);
        }
      })
    );
  }, 0);
  clearTimeout(songTimer);
  songTimer = setTimeout(async () => {
    await Promise.all(
      songSources.value.map(async (source) => {
        if (!source.songList || force) {
          await store.songRecommendSong(source);
        }
      })
    );
  }, 0);
}

async function playlistToPage(source: SongSource, pageNo: number) {
  if (!searchValue.value) {
    await store.songRecommendPlayist(source, pageNo);
  } else {
    await store.songSearchPlaylist(source, searchValue.value, pageNo);
  }
}
async function songToPage(source: SongSource, pageNo: number) {
  if (!searchValue.value) {
    await store.songRecommendSong(source, pageNo);
  } else {
    await store.songSearchSong(source, searchValue.value, pageNo);
  }
}

async function playSong(source: SongSource, song: SongInfo) {
  const songs = source.songList!.list;
  songStore.setPlayingList(songs, song);
}

const openBaseUrl = async (source: SongSource) => {
  const sc = await store.sourceClass(source.item);
  if (sc && sc.baseUrl) {
    // open(sc.baseUrl);
  }
};

// onMounted(() => {
//   recommend();
// });
</script>

<template>
  <div class="w-full h-full flex flex-col">
    <div class="grow overflow-x-hidden overflow-y-auto">
      <van-row justify="center" align="center" class="relative">
        <div
          class="absolute right-6 text-button"
          @click="showSongShelf = !showSongShelf"
        >
          收藏
        </div>
        <van-search
          v-model="searchValue"
          placeholder="请输入搜索关键词"
          left-icon=""
          @click-right-icon="search"
          @search="search"
          @clear="search"
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
              @click="() => openBaseUrl(item)"
            >
              歌单
            </van-button>
            <SimplePagination
              v-model="item.playlist.page"
              :page-count="item.playlist.totalPage"
              @change="(page) => playlistToPage(item, page)"
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
              @click="() => openBaseUrl(item)"
            >
              歌曲
            </van-button>
            <SimplePagination
              v-model="item.songList.page"
              :page-count="item.songList.totalPage"
              @change="(page) => songToPage(item, page)"
            />
          </van-row>
          <ResponsiveGrid>
            <template v-for="p in item.songList?.list" :key="p.id">
              <SongCard
                :song="p"
                @play="() => playSong(item, p)"
                class="max-w-[250px]"
              ></SongCard>
            </template>
          </ResponsiveGrid>
        </van-tab>
      </van-tabs>
      <SongShelf v-model:show="showSongShelf"></SongShelf>
    </div>
    <SongBar></SongBar>
  </div>
</template>

<style scoped lang="less"></style>
