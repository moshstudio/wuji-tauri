<script setup lang="ts">
import type { PlaylistInfo } from '@/extensions/song';
import type { PropType } from 'vue';
import WinSongCard from '@/components/card/songCards/WinSongCard.vue';
import LoadImage from '@/components/LoadImage.vue';
import SimplePagination from '@/components/pagination/SimplePagination.vue';
import ResponsiveGrid2 from '@/components/ResponsiveGrid2.vue';
import WinSongBar from '@/components/windows/WinSongBar.vue';
import { useDisplayStore, useSongShelfStore, useSongStore } from '@/store';
import SongShelf from '@/views/song/SongShelf.vue';

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
  <div class="flex flex-col h-full">
    <van-nav-bar left-arrow @click-left="() => emit('back')" />
    <div
      ref="content"
      class="flex flex-col px-4 pb-12 grow gap-2 w-full overflow-y-auto"
    >
      <div class="head flex justify-center p-4">
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

        <div class="p-4 flex flex-col justify-around">
          <p class="text-[--van-text-color] text-lg font-bold">
            {{ playlist?.name }}
          </p>
          <p class="text-xs min-w-[100px] text-gray-400 line-clamp-3">
            {{ playlist?.desc }}
          </p>
        </div>
      </div>
      <div v-if="playlist?.list?.list" class="flex gap-2 pl-4">
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

        <SimplePagination
          v-if="playlist.list.totalPage"
          v-model="currentPage"
          :page-count="playlist.list.totalPage"
          class="p-1"
          @change="(pageNo) => emit('toPage', pageNo)"
        />
      </div>
      <ResponsiveGrid2>
        <template v-for="item in playlist?.list?.list" :key="item.id">
          <WinSongCard
            :song="item"
            @play="songStore.setPlayingList(playlist!.list!.list, item)"
          />
        </template>
      </ResponsiveGrid2>
    </div>
    <WinSongBar />
    <SongShelf />
  </div>
</template>

<style scoped lang="less"></style>
