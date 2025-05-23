<script setup lang="ts">
import type { Lyric } from '@/utils/lyric';
import type { CSSProperties } from 'vue';
import PlatformSwitch from '@/components/PlatformSwitch.vue';
import { useDisplayStore, useSongStore } from '@/store';
import { cachedFetch } from '@/utils';
import { getLyric, parseLyric } from '@/utils/lyric';
import { storeToRefs } from 'pinia';
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import MobilePlayView from '../mobileView/song/PlayView.vue';
import WinPlayView from '../windowsView/song/PlayView.vue';

const songStore = useSongStore();
const displayStore = useDisplayStore();
const { playingSong, isPlaying, audioCurrent } = storeToRefs(songStore);
const { showPlayView } = storeToRefs(displayStore);
const lyric = ref<Lyric>();
const activeIndex = ref<number>(0); // 高亮Index
const transformStyle = ref<string>(''); // 偏移量
const panelBackgroundStyle = ref<CSSProperties>({
  'background-color': 'rgba(0, 0, 0, 0.1)',
});

async function backgroundImageUrl(
  url?: string,
  headers?: Record<string, string>,
): Promise<string | null> {
  if (!url) return null;
  if (!headers) {
    return `url(${url})`;
  } else {
    const response = await cachedFetch(url, {
      headers,
      verify: false,
    });
    const blob = await response.blob();

    if (blob.size === 0) {
      return null;
    }
    const u = URL.createObjectURL(
      new Blob([blob], { type: blob.type || 'image/png' }),
    );
    return `url(${u})`;
  }
}

watch(
  playingSong,
  async (newSong) => {
    if (!newSong) {
      return;
    }
    const direction = '43deg';
    // 定义颜色停止点
    const colorStops = [
      { color: '#4158D0', position: 0 },
      { color: '#C850C0', position: 46 },
      { color: '#FFCC70', position: 100 },
    ];

    if (newSong.picUrl || newSong.bigPicUrl) {
      panelBackgroundStyle.value.backgroundColor = '';
      backgroundImageUrl(
        newSong.bigPicUrl || newSong.picUrl,
        newSong.picHeaders,
      ).then((url) => {
        if (url) {
          panelBackgroundStyle.value.backgroundImage = url;
        } else {
          panelBackgroundStyle.value.backgroundImage = '';
        }
      });
    } else {
      // background-color: #4158D0;
      // background-image: linear-gradient(43deg, #4158D0 0%, #C850C0 46%, #FFCC70 100%);

      // 定义渐变方向
      const direction = '43deg';
      // 定义颜色停止点
      const colorStops = [
        { color: '#4158D0', position: 0 },
        { color: '#C850C0', position: 46 },
        { color: '#FFCC70', position: 100 },
      ];
      panelBackgroundStyle.value.backgroundColor = '#4158D0';
      panelBackgroundStyle.value.backgroundImage = `linear-gradient(${direction}, ${colorStops
        .map((colorStop) => `${colorStop.color} ${colorStop.position}%`)
        .join(', ')})`;
    }
    lyric.value = undefined;
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
  { immediate: true, deep: true },
);

watch(audioCurrent, (newVal) => {
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
});

</script>

<template>
  <PlatformSwitch>
    <template #mobile>
      <MobilePlayView
        v-model:lyric="lyric"
        v-model:active-index="activeIndex"
        v-model:transform-style="transformStyle"
        v-model:panel-background-style="panelBackgroundStyle"
        v-model:show="showPlayView"
      />
    </template>
    <template #windows>
      <WinPlayView
        v-model:lyric="lyric"
        v-model:active-index="activeIndex"
        v-model:transform-style="transformStyle"
        v-model:panel-background-style="panelBackgroundStyle"
        v-model:show="showPlayView"
      />
    </template>
  </PlatformSwitch>
</template>

<style scoped lang="less"></style>
