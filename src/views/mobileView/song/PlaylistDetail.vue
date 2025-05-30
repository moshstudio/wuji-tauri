<script setup lang="ts">
import type { PlaylistInfo } from '@/extensions/song';
import type { PropType } from 'vue';
import MobileSongCard from '@/components/card/songCards/MobileSongCard.vue';
import LoadImage from '@/components/LoadImage.vue';
import MobileSongBar from '@/components/mobile/MobileSongBar.vue';
import SimplePagination from '@/components/pagination/SimplePagination.vue';
import { useDisplayStore, useSongShelfStore, useSongStore } from '@/store';
import SongShelf from '@/views/song/SongShelf.vue';
import PlayView from '@/views/song/PlayView.vue';
import PlayingPlaylistSheet from '@/components/actionSheets/PlayingPlaylist.vue';

const emit = defineEmits<{
  (e: 'back'): void;
  (e: 'loadData', pageNo?: number): void;
  (e: 'toPage', pageNo?: number): void;
  (e: 'playAll'): void;
  (e: 'addToShelf'): void;
}>();
const songStore = useSongStore();
const displayStore = useDisplayStore();
const shelfStore = useSongShelfStore();

const playlist = defineModel('playlist', {
  type: Object as PropType<PlaylistInfo>,
});
const currentPage = defineModel('currentPage', { type: Number, default: 1 });
const content = defineModel('content', { type: HTMLElement });
</script>

<template>
  <div class="flex flex-col w-full h-full overflow-hidden">
    <div class="relative grow w-full h-full overflow-hidden">
      <van-nav-bar left-arrow @click-left="() => emit('back')" />
      <div
        v-remember-scroll
        ref="content"
        class="flex flex-col px-4 pb-12 grow gap-2 w-full h-full overflow-y-auto"
      >
        <div class="head flex flex-col gap-2 items-center shadow rounded p-4">
          <div class="flex gap-2 items-center justify-center">
            <div class="w-[120px] h-[120px]">
              <LoadImage
                v-if="playlist?.picUrl"
                :width="120"
                :height="120"
                :radius="8"
                fit="cover"
                lazy-load
                :src="playlist?.picUrl"
                :headers="playlist?.picHeaders"
              >
                <template #loading>
                  <div class="text-center text-lg p-1">
                    {{ playlist.name }}
                  </div>
                </template>
              </LoadImage>
            </div>

            <div class="text-[--van-text-color] text-lg font-bold line-clamp-3">
              {{ playlist?.name }}
            </div>
          </div>
          <van-text-ellipsis
            :content="playlist?.desc"
            rows="3"
            expand-text="展开"
            collapse-text="收起"
            class="text-xs text-gray-400"
          />
        </div>
        <van-row
          v-if="playlist?.list?.list"
          justify="space-between"
          align="center"
          class="bg-[--van-background-2] gap-2"
        >
          <div class="flex gap-2">
            <template v-if="shelfStore.playlistInShelf(playlist)">
              <van-button
                size="small"
                type="primary"
                @click="() => (displayStore.showSongShelf = true)"
              >
                已收藏
              </van-button>
            </template>
            <template v-else>
              <van-button
                size="small"
                type="primary"
                @click="() => emit('addToShelf')"
              >
                收藏
              </van-button>
            </template>

            <van-button size="small" @click="() => emit('playAll')">
              播放全部
            </van-button>
          </div>

          <SimplePagination
            v-if="playlist.list.totalPage"
            v-model="currentPage"
            :page-count="playlist.list.totalPage"
            class="p-1"
            @change="(pageNo) => emit('toPage', pageNo)"
          />
        </van-row>
        <template v-for="item in playlist?.list?.list" :key="item.id">
          <MobileSongCard
            :song="item"
            @play="songStore.setPlayingList(playlist!.list!.list, item)"
          />
        </template>
      </div>
      <SongShelf />
      <PlayView />
      <PlayingPlaylistSheet />
    </div>

    <MobileSongBar />
  </div>
</template>

<style scoped lang="less"></style>
