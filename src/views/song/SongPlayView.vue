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

// 预设的高质量明显颜色
const PRESET_COLORS = [
  '#FF6B9D', // 粉红
  '#FFA500', // 橙色
  '#FFD700', // 金色
  '#00E5FF', // 青色
  '#B388FF', // 紫色
  '#69F0AE', // 绿色
  '#FF5252', // 红色
  '#64FFDA', // 蓝绿
];

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
          // 随机选择一个预设颜色
          const randomIndex = Math.floor(Math.random() * PRESET_COLORS.length);
          activeLyricColor.value = PRESET_COLORS[randomIndex];
          return;
        }

        // 提取颜色的色相，创建鲜艳明亮的版本
        const hue = color.toHsl().h;

        // 创建高饱和度、适中亮度的颜色（确保明显且好看）
        const vibrantColor = tinycolor({ h: hue, s: 0.85, l: 0.65 });

        // 检查颜色是否足够明显（亮度在合理范围内）
        const brightness = vibrantColor.getBrightness();
        if (brightness < 100 || brightness > 230) {
          // 如果太暗或太亮，使用与色相最接近的预设颜色
          const closestPreset = findClosestPresetColor(hue);
          activeLyricColor.value = closestPreset;
        } else {
          activeLyricColor.value = vibrantColor.toHexString();
        }
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

// 根据色相找到最接近的预设颜色
function findClosestPresetColor(hue: number): string {
  const presetHues = PRESET_COLORS.map((color) => tinycolor(color).toHsl().h);
  let minDiff = 360;
  let closestIndex = 0;

  presetHues.forEach((presetHue, index) => {
    // 考虑色相环的循环特性
    const diff = Math.min(
      Math.abs(hue - presetHue),
      360 - Math.abs(hue - presetHue),
    );
    if (diff < minDiff) {
      minDiff = diff;
      closestIndex = index;
    }
  });

  return PRESET_COLORS[closestIndex];
}

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
