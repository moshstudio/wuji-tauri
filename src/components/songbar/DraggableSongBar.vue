<script setup lang="ts">
import type { Swiper as SwiperClass } from 'swiper/types';
import { useSongStore } from '@/store';
import { joinSongArtists } from '@wuji-tauri/components/src/components/cards/song';
import { storeToRefs } from 'pinia';
import { Swiper, SwiperSlide } from 'swiper/vue';
import { computed, reactive } from 'vue';
import { Icon } from '@iconify/vue';
import { LoadImage } from '@wuji-tauri/components/src';

import 'swiper/css';

const songStore = useSongStore();
const { playingSong, playingPlaylist } = storeToRefs(songStore);

// 获取相邻歌曲信息
const previousSong = computed(() => {
  if (!playingSong.value || !playingPlaylist.value.length) return null;
  const index = playingPlaylist.value.findIndex(
    (item) => item.id === playingSong.value?.id,
  );
  if (index === -1) return null;
  if (index === 0) {
    return playingPlaylist.value[playingPlaylist.value.length - 1];
  } else {
    return playingPlaylist.value[index - 1];
  }
});
const nextSong = computed(() => {
  if (!playingSong.value || !playingPlaylist.value.length) return null;
  const index = playingPlaylist.value.findIndex(
    (item) => item.id === playingSong.value?.id,
  );
  if (index === -1) return null;
  if (index === playingPlaylist.value.length - 1) {
    return playingPlaylist.value[0];
  } else {
    return playingPlaylist.value[index + 1];
  }
});

const threeSongs = reactive([previousSong, playingSong, nextSong]);

// 滑动结束处理
async function onSwipeChange(swiper: SwiperClass) {
  const index = swiper.activeIndex;

  // 滑动到左侧(上一首)
  if (index === 0) {
    songStore.prevSong();
  }
  // 滑动到右侧(下一首)
  else if (index === 2) {
    songStore.nextSong();
  }
  swiper.slideTo(1, 0, false);
}
</script>

<template>
  <Swiper
    :slides-per-view="1"
    :centered-slides="true"
    :initial-slide="1"
    :loop="false"
    @slide-change-transition-end="onSwipeChange"
  >
    <SwiperSlide v-for="(song, index) in threeSongs" :key="index">
      <div v-if="song.value" class="flex w-full gap-4">
        <div class="h-[30px] w-[30px]">
          <LoadImage
            :width="30"
            :height="30"
            round
            fit="cover"
            :src="song.value.picUrl || ''"
            :headers="song.value.picHeaders"
          >
            <template #loading>
              <Icon
                icon="pepicons-pop:music-note-double"
                width="16"
                height="16"
              />
            </template>
            <template #error>
              <Icon
                icon="pepicons-pop:music-note-double"
                width="16"
                height="16"
              />
            </template>
          </LoadImage>
        </div>

        <div class="flex flex-col justify-center truncate">
          <span class="text-xs font-bold text-[--van-text-color]">
            <span>{{ song.value.name }}</span>
            <span v-if="song.value.artists">-</span>
            <span>{{ joinSongArtists(song.value.artists) }}</span>
          </span>
        </div>
      </div>
    </SwiperSlide>
  </Swiper>
</template>

<style scoped lang="less"></style>
