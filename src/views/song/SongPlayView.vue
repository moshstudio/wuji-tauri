<script setup lang="ts">
import type { Lyric } from '@/utils/lyric';
import { cachedFetch } from '@wuji-tauri/fetch';
import { storeToRefs } from 'pinia';
import tinycolor from 'tinycolor2';
import { ref, watch } from 'vue';
import PlatformSwitch from '@/components/platform/PlatformSwitch.vue';
import AppSongPlayView from '@/layouts/app/song/SongPlayView.vue';
import DesktopSongPlayView from '@/layouts/desktop/song/SongPlayView.vue';
import { useDisplayStore, useSongStore } from '@/store';
import { useBackStore } from '@/store/backStore';
import { getLyric, parseLyric } from '@/utils/lyric';

const backStore = useBackStore();
const displayStore = useDisplayStore();
const songStore = useSongStore();
const { playingSong, audioCurrent } = storeToRefs(songStore);
const { showSongPlayingList } = storeToRefs(displayStore);

const lyric = ref<Lyric>();
const activeIndex = ref<number>(0); // 高亮Index
const transformStyle = ref<string>(''); // 偏移量
const activeLyricColor = ref<string>('#FFD700');

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
    analyzeImageColor(
      newSong.picUrl || newSong.bigPicUrl,
      newSong.picHeaders,
      (color) => {
        if (!color) {
          activeLyricColor.value = '#FFD700';
          return;
        }

        let contrastColor = color.isDark()
          ? color.clone().brighten(30)
          : color.clone().darken(30);

        // 确保颜色不是黑白，同时提高其鲜艳程度
        contrastColor = contrastColor.saturate(30);

        // 如果颜色接近白色或黑色，调整其亮度和饱和度
        if (contrastColor.isLight()) {
          contrastColor = contrastColor.spin(180).saturate(20);
        }
        if (
          contrastColor.toHex() === '#ffffff' ||
          contrastColor.toHex() === '#000000'
        ) {
          // 强制调整色调和饱和度以避免黑白
          contrastColor = contrastColor.spin(180).saturate(50).lighten(10);
        }
        activeLyricColor.value = contrastColor.toHexString();
      },
    );
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

async function analyzeImageColor(
  imageSrc: string | undefined,
  headers: Record<string, string> | undefined,
  callback: (color?: tinycolor.Instance) => void,
) {
  if (!imageSrc) {
    callback();
    return;
  }
  const response = await cachedFetch(imageSrc, {
    headers,
  });
  if (!response.ok) {
    callback();
    return;
  }
  const blob = await response.blob();
  const imageUrl = URL.createObjectURL(blob);

  const img = new Image();
  // 如果图像是跨域资源，请确保服务器设置了正确的CORS策略
  img.crossOrigin = 'Anonymous';
  img.src = imageUrl;
  img.onload = function () {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      callback();
      return;
    }
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    let r = 0;
    let g = 0;
    let b = 0;
    let count = 0;

    for (let i = 0; i < data.length; i += 4) {
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
      count++;
    }

    r = Math.floor(r / count);
    g = Math.floor(g / count);
    b = Math.floor(b / count);

    const avgColor = tinycolor(`rgb(${r},${g},${b})`);
    callback(avgColor);
  };
}
</script>

<template>
  <PlatformSwitch>
    <template #app>
      <AppSongPlayView
        v-model:show-playing-list="showSongPlayingList"
        :lyric="lyric"
        :active-index="activeIndex"
        :transform-style="transformStyle"
        :active-lyric-color="activeLyricColor"
        :back="backStore.back"
      />
    </template>
    <template #desktop>
      <DesktopSongPlayView
        v-model:show-playing-list="showSongPlayingList"
        :lyric="lyric"
        :active-index="activeIndex"
        :transform-style="transformStyle"
        :active-lyric-color="activeLyricColor"
        :back="backStore.back"
      />
    </template>
  </PlatformSwitch>
</template>

<style scoped lang="less"></style>
