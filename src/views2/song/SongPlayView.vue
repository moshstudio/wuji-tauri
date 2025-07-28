<script setup lang="ts">
import type { Lyric } from '@/utils/lyric';
import PlatformSwitch from '@/components2/platform/PlatformSwitch.vue';
import { useSongStore } from '@/store';
import { getLyric, parseLyric } from '@/utils/lyric';
import { storeToRefs } from 'pinia';
import { ref, watch } from 'vue';
import AppSongPlayView from '@/layouts/app/song/SongPlayView.vue';
import DesktopSongPlayView from '@/layouts/desktop/song/SongPlayView.vue';
import { useBackStore } from '@/store/backStore';

const backStore = useBackStore();
const songStore = useSongStore();
const { playingSong, audioCurrent } = storeToRefs(songStore);

const lyric = ref<Lyric>();
const activeIndex = ref<number>(0); // 高亮Index
const transformStyle = ref<string>(''); // 偏移量

watch(
  playingSong,
  async (newSong) => {
    lyric.value = [
      {
        position: 0,
        lyric: '加载中',
      },
    ];
    audioCurrent.value = 0;
    if (newSong.lyric) {
      lyric.value = parseLyric(newSong.lyric);
    } else if (newSong.name) {
      const singer = newSong.artists
        ?.map((artist) => (typeof artist === 'object' ? artist.name : artist))
        .join(',');
      lyric.value = await getLyric(newSong.name, singer);
    }
  },
  { immediate: true },
);
watch(
  audioCurrent,
  (newVal) => {
    if (newVal === 0) {
      activeIndex.value = 0;
      transformStyle.value = `transform: translateY(0px)`;
      return;
    }
    newVal = newVal * 1000 + 200;
    if (lyric.value) {
      for (let i = 0; i < lyric.value.length; i++) {
        if (
          lyric.value[i].position < +newVal &&
          (lyric.value[i + 1]?.position || 9999999999) > +newVal
        ) {
          let offset = 0;
          // 从0到i，计算元素高度
          for (let j = 0; j <= i; j++) {
            const element = document.querySelector(
              `.lyric-line[data-index="${j}"]`,
            );
            offset += element?.clientHeight || 0;
            offset += 10;
          }
          activeIndex.value = i;
          transformStyle.value = `transform: translateY(${-offset}px)`;
        }
      }
    }
  },
  { immediate: true },
);
</script>

<template>
  <PlatformSwitch>
    <template #app>
      <AppSongPlayView
        :lyric="lyric"
        :active-index="activeIndex"
        :transform-style="transformStyle"
        :back="backStore.back"
      />
    </template>
    <template #desktop>
      <DesktopSongPlayView
        :lyric="lyric"
        :active-index="activeIndex"
        :transform-style="transformStyle"
        :back="backStore.back"
      />
    </template>
  </PlatformSwitch>
</template>

<style scoped lang="less"></style>
