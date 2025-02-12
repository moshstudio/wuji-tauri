<script setup lang="ts">
import { PlaylistInfo } from '@/extensions/song';
import { useSongStore, useSongShelfStore, useDisplayStore } from '@/store';
import { PropType } from 'vue';
import MobileSongCard from '@/components/card/songCards/MobileSongCard.vue';
import MobileSongBar from '@/components/mobile/MobileSongBar.vue';
import SongShelf from '@/views/song/SongShelf.vue';
import SimplePagination from '@/components/pagination/SimplePagination.vue';
import LoadImage from '@/components/LoadImage.vue';

const songStore = useSongStore();
const displayStore = useDisplayStore();
const shelfStore = useSongShelfStore();

const playlist = defineModel('playlist', {
  type: Object as PropType<PlaylistInfo>,
});
const currentPage = defineModel('currentPage', { type: Number, default: 1 });
const content = defineModel('content', { type: HTMLElement });

const emit = defineEmits<{
  (e: 'back'): void;
  (e: 'loadData', pageNo?: number): void;
  (e: 'toPage', pageNo?: number): void;
  (e: 'playAll'): void;
  (e: 'addToShelf'): void;
}>();
</script>

<template>
  <div class="flex flex-col h-full">
    <van-nav-bar left-arrow @click-left="() => emit('back')" />
    <div
      ref="content"
      class="flex flex-col px-4 pb-12 bg-[--van-background-2] grow gap-2 w-full overflow-y-auto"
    >
      <div class="head flex flex-col gap-2 items-center shadow rounded p-4">
        <div class="flex gap-2 items-center justify-center">
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
            <template v-slot:loading>
              <div class="text-center text-lg p-1">
                {{ playlist.name }}
              </div>
            </template>
          </LoadImage>
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
        justify="space-between"
        align="center"
        v-if="playlist?.list?.list"
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
          v-model="currentPage"
          :page-count="playlist.list.totalPage"
          class="p-1"
          @change="(pageNo) => emit('toPage', pageNo)"
          v-if="playlist.list.totalPage"
        />
      </van-row>
      <template v-for="item in playlist?.list?.list" :key="item.id">
        <MobileSongCard
          :song="item"
          @play="songStore.setPlayingList(playlist!.list!.list, item)"
        ></MobileSongCard>
      </template>
    </div>
    <MobileSongBar></MobileSongBar>
    <SongShelf></SongShelf>
  </div>
</template>

<style scoped lang="less"></style>
